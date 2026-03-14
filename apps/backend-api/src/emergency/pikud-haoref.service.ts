import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { createHash } from 'crypto';
import { z } from 'zod';
import { pikudAlertSchema, type ActiveAlert } from './interfaces/pikud-haoref.interface';
import type { IAlertProvider } from './interfaces/alert-provider.interface';
import { ConfigService } from '../config/config.service';

const PIKUD_HAOREF_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';

const PIKUD_HAOREF_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  Referer: 'https://www.oref.org.il/',
  'Accept-Language': 'he',
};

/** API can return an array of alerts or a single object; normalize to array. */
const pikudResponseSchema = z
  .union([z.array(pikudAlertSchema), pikudAlertSchema])
  .transform((v): z.infer<typeof pikudAlertSchema>[] => (Array.isArray(v) ? v : [v]));

export const ALERT_NEW_EVENT = 'emergency.alert.new';
export const ALERT_CLEAR_EVENT = 'emergency.alert.clear';

@Injectable()
export class PikudHaorefService implements IAlertProvider {
  readonly name = 'pikud-haoref';
  private readonly logger = new Logger(PikudHaorefService.name);
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastAlertHash: string | null = null;
  private currentAlert: ActiveAlert | null = null;
  private clearTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly pollMs: number;
  private readonly enabled: boolean;

  /** For GET /emergency/pikud-status: last poll time, last error, last non-empty API response preview */
  private lastPollAt: number | null = null;
  private lastError: string | null = null;
  private lastNonEmptyAt: number | null = null;
  private lastNonEmptyPreview: string | null = null;
  private lastSchemaError: string | null = null;

  constructor(
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {
    const pollStr = this.config.get('PIKUD_HAOREF_POLL_INTERVAL_MS');
    this.pollMs = pollStr ? Number(pollStr) : 2000;
    const enabledStr = this.config.get('EMERGENCY_MODULE_ENABLED');
    this.enabled = enabledStr !== 'false';
  }

  start(): void {
    if (!this.enabled) {
      this.logger.warn('Emergency module disabled via EMERGENCY_MODULE_ENABLED=false');
      return;
    }
    this.logger.log(`Starting Pikud HaOref polling every ${this.pollMs}ms`);
    const pollFn = () => this.poll();
    this.pollInterval = setInterval(pollFn, this.pollMs);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.clearTimeout) {
      clearTimeout(this.clearTimeout);
      this.clearTimeout = null;
    }
  }

  getCurrentAlert(): ActiveAlert | null {
    return this.currentAlert;
  }

  getPikudStatus(): {
    enabled: boolean;
    pollMs: number;
    pollCount: number;
    lastPollAt: number | null;
    lastError: string | null;
    lastNonEmptyAt: number | null;
    lastNonEmptyPreview: string | null;
    lastSchemaError: string | null;
    currentAlert: boolean;
  } {
    return {
      enabled: this.enabled,
      pollMs: this.pollMs,
      pollCount: this.pollCount,
      lastPollAt: this.lastPollAt,
      lastError: this.lastError,
      lastNonEmptyAt: this.lastNonEmptyAt,
      lastNonEmptyPreview: this.lastNonEmptyPreview,
      lastSchemaError: this.lastSchemaError,
      currentAlert: this.currentAlert !== null,
    };
  }

  private pollCount = 0;

  private async poll(): Promise<void> {
    this.pollCount++;
    const logEvery = 150; // log connectivity proof every ~5 min (150 * 2s)
    if (this.pollCount % logEvery === 0) {
      this.logger.log({ msg: 'Pikud HaOref polling alive', pollCount: this.pollCount, currentAlert: !!this.currentAlert });
    }

    this.lastPollAt = Date.now();
    this.lastError = null;

    try {
      const response = await axios.get<unknown>(PIKUD_HAOREF_URL, {
        headers: { ...PIKUD_HAOREF_HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0' },
        timeout: 5000,
        validateStatus: (s) => s < 500,
      });

      const responseData = response.data;
      if (!responseData || (typeof responseData === 'string' && responseData.trim() === '')) {
        this.handleNoAlert();
        return;
      }

      const preview = typeof responseData === 'string' ? responseData.substring(0, 500) : JSON.stringify(responseData).substring(0, 500);
      this.lastNonEmptyAt = Date.now();
      this.lastNonEmptyPreview = preview;
      this.lastSchemaError = null;

      this.logger.warn({
        msg: 'Pikud HaOref non-empty response',
        status: response.status,
        dataType: typeof responseData,
        dataPreview: preview,
      });

      let toParse: unknown = responseData;
      if (typeof responseData === 'string') {
        try {
          toParse = JSON.parse(responseData);
        } catch {
          this.lastSchemaError = 'JSON parse failed';
          this.handleNoAlert();
          return;
        }
      }

      const parsed = pikudResponseSchema.safeParse(toParse);
      if (!parsed.success) {
        this.lastSchemaError = JSON.stringify(parsed.error.flatten());
        this.logger.warn({ msg: 'Pikud HaOref response did not match schema', errors: parsed.error.flatten() });
        this.handleNoAlert();
        return;
      }

      const rawAlerts = parsed.data;

      if (rawAlerts.length === 0) {
        this.logger.warn({ msg: 'Pikud HaOref: parsed alerts array is empty (non-empty response but no valid alerts)' });
        this.handleNoAlert();
        return;
      }

      const hash = this.hashAlerts(rawAlerts);
      if (hash === this.lastAlertHash) return;
      this.lastAlertHash = hash;

      const active = this.toActiveAlert(rawAlerts[0]);
      this.currentAlert = active;
      this.logger.warn({ msg: 'NEW ALERT DETECTED', areas: active.areas, title: active.title, allAreas: rawAlerts.flatMap((a) => a.data) });
      this.events.emit(ALERT_NEW_EVENT, active);

      if (this.clearTimeout) clearTimeout(this.clearTimeout);
      this.clearTimeout = setTimeout(() => this.handleAlertExpiry(), 2 * 60 * 1000); // auto-clear after 2 minutes
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      this.logger.warn({ msg: 'Pikud HaOref poll error', error: msg });
    }
  }

  private handleNoAlert(): void {
    if (this.currentAlert) {
      this.logger.log('Alert cleared – no active alerts');
      this.currentAlert = null;
      this.lastAlertHash = null;
      this.events.emit(ALERT_CLEAR_EVENT);
    }
  }

  private handleAlertExpiry(): void {
    if (this.currentAlert) {
      this.logger.log('Alert expired after timeout');
      this.currentAlert = null;
      this.lastAlertHash = null;
      this.events.emit(ALERT_CLEAR_EVENT);
    }
  }

  private toActiveAlert(raw: z.infer<typeof pikudAlertSchema>): ActiveAlert {
    return {
      id: `alert-${Date.now()}-${raw.cat}`,
      cat: raw.cat,
      title: raw.title,
      areas: raw.data,
      desc: raw.desc,
      detectedAt: new Date(),
    };
  }

  private hashAlerts(alerts: z.infer<typeof pikudAlertSchema>[]): string {
    const content = JSON.stringify(alerts.map((a) => ({ data: a.data, cat: a.cat })));
    return createHash('md5').update(content).digest('hex');
  }

  private tryParseJsonAlerts(text: string): z.infer<typeof pikudAlertSchema>[] {
    try {
      const parsed = JSON.parse(text);
      const result = z.array(pikudAlertSchema).safeParse(parsed);
      return result.success ? result.data : [];
    } catch {
      return [];
    }
  }
}

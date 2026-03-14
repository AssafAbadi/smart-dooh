import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { z } from 'zod';
import { TOKENS } from '../../core/constants/tokens';
import type { IRedisService } from '../../core/interfaces/redis.interface';

interface RedisClient {
  setex(key: string, ttl: number, value: string): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
}

const ALERT_STATE_KEY = 'emergency:active_alert';
const ALERT_STATE_TTL_SECONDS = 120; // 2 minutes – auto-clear so overlay dismisses

const alertStateSchema = z.object({
  title: z.string(),
  areas: z.array(z.string()),
  detectedAt: z.string(),
});

export type AlertState = z.infer<typeof alertStateSchema>;

export interface IAlertStateRepository {
  store(alert: AlertState): Promise<void>;
  get(): Promise<AlertState | null>;
  clear(): Promise<void>;
}

@Injectable()
export class AlertStateRepository implements IAlertStateRepository {
  private readonly logger = new Logger(AlertStateRepository.name);

  constructor(
    @Inject(TOKENS.IRedisService)
    @Optional()
    private readonly redis?: IRedisService,
  ) {}

  async store(alert: AlertState): Promise<void> {
    const client = this.getRedisClient();
    if (!client) return;
    try {
      await client.setex(ALERT_STATE_KEY, ALERT_STATE_TTL_SECONDS, JSON.stringify(alert));
    } catch (err) {
      this.logger.error({ msg: 'Failed to store alert state in Redis', err });
    }
  }

  async get(): Promise<AlertState | null> {
    const client = this.getRedisClient();
    if (!client) return null;
    try {
      const raw = await client.get(ALERT_STATE_KEY);
      if (!raw) return null;
      const parsed = alertStateSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch (err) {
      this.logger.error({ msg: 'Failed to read alert state from Redis', err });
      return null;
    }
  }

  async clear(): Promise<void> {
    const client = this.getRedisClient();
    if (!client) return;
    try {
      await client.del(ALERT_STATE_KEY);
    } catch (err) {
      this.logger.error({ msg: 'Failed to clear alert state from Redis', err });
    }
  }

  private getRedisClient(): RedisClient | null {
    return (this.redis?.getClient() as RedisClient) ?? null;
  }
}

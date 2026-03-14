import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../../core/constants/tokens';
import type { IRedisService } from '../../core/interfaces/redis.interface';

const FREQ_CAP_DEVICE_HOURLY = parseInt(process.env['FREQ_CAP_DEVICE_HOURLY'] ?? '3', 10);
const FREQ_CAP_AREA_DAILY = parseInt(process.env['FREQ_CAP_AREA_DAILY'] ?? '20', 10);

@Injectable()
export class FrequencyCapService {
  private readonly logger = new Logger(FrequencyCapService.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  private getClient() {
    return this.redis.getClient() as {
      incr: (key: string) => Promise<number>;
      expire: (key: string, ttl: number) => Promise<number>;
      get: (key: string) => Promise<string | null>;
      mget: (...keys: string[]) => Promise<(string | null)[]>;
    } | null;
  }

  private hourKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}H${String(now.getUTCHours()).padStart(2, '0')}`;
  }

  private dateKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  }

  async filterCapped(
    campaignIds: string[],
    deviceId: string,
    geohash5: string,
  ): Promise<{ allowed: string[]; capped: string[] }> {
    const client = this.getClient();
    if (!client || campaignIds.length === 0) return { allowed: campaignIds, capped: [] };

    const hk = this.hourKey();
    const dk = this.dateKey();
    const allowed: string[] = [];
    const capped: string[] = [];

    try {
      const keys: string[] = [];
      for (const cid of campaignIds) {
        keys.push(`freq:dev:${deviceId}:${cid}:${hk}`);
        keys.push(`freq:area:${geohash5}:${cid}:${dk}`);
      }
      const values = await client.mget(...keys);

      for (let i = 0; i < campaignIds.length; i++) {
        const devCount = parseInt(values[i * 2] ?? '0', 10);
        const areaCount = parseInt(values[i * 2 + 1] ?? '0', 10);

        if (devCount >= FREQ_CAP_DEVICE_HOURLY || areaCount >= FREQ_CAP_AREA_DAILY) {
          capped.push(campaignIds[i]);
          this.logger.log({
            campaignId: campaignIds[i],
            deviceId,
            geohash5,
            devCount,
            areaCount,
            msg: 'FrequencyCap: campaign capped',
          });
        } else {
          allowed.push(campaignIds[i]);
        }
      }
    } catch {
      return { allowed: campaignIds, capped: [] };
    }
    return { allowed, capped };
  }

  async recordImpression(campaignId: string, deviceId: string, geohash5: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const hk = this.hourKey();
    const dk = this.dateKey();
    const devKey = `freq:dev:${deviceId}:${campaignId}:${hk}`;
    const areaKey = `freq:area:${geohash5}:${campaignId}:${dk}`;

    try {
      const [devCount, areaCount] = await Promise.all([
        client.incr(devKey),
        client.incr(areaKey),
      ]);
      if (devCount === 1) await client.expire(devKey, 3600);
      if (areaCount === 1) await client.expire(areaKey, 86400);
    } catch {
      // fail-open
    }
  }
}

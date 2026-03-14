import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../../core/constants/tokens';
import type { IRedisService } from '../../core/interfaces/redis.interface';

const MAX_SOV = parseFloat(process.env['MAX_SHARE_OF_VOICE'] ?? '0.40');
const SOV_LOWER_THRESHOLD = MAX_SOV * 0.75;
const MIN_SOV_PENALTY = 0.3;

@Injectable()
export class ShareOfVoiceService {
  private readonly logger = new Logger(ShareOfVoiceService.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  private getClient() {
    return this.redis.getClient() as {
      get: (key: string) => Promise<string | null>;
      incr: (key: string) => Promise<number>;
      expire: (key: string, ttl: number) => Promise<number>;
      scan: (cursor: string | number, ...args: unknown[]) => Promise<[string, string[]]>;
      mget: (...keys: string[]) => Promise<(string | null)[]>;
    } | null;
  }

  private hourKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}H${String(now.getUTCHours()).padStart(2, '0')}`;
  }

  async getSovPenalty(businessId: string, geohash5: string): Promise<number> {
    const client = this.getClient();
    if (!client) return 1.0;

    const hk = this.hourKey();
    try {
      const pattern = `sov:*:${geohash5}:${hk}`;
      const keys = await this.scanKeys(client, pattern);
      if (keys.length === 0) return 1.0;

      const values = await client.mget(...keys);

      let totalImpressions = 0;
      let businessImpressions = 0;
      const targetKey = `sov:${businessId}:${geohash5}:${hk}`;

      for (let i = 0; i < keys.length; i++) {
        const count = parseInt(values[i] ?? '0', 10);
        totalImpressions += count;
        if (keys[i] === targetKey) businessImpressions = count;
      }

      if (totalImpressions === 0) return 1.0;

      const share = businessImpressions / totalImpressions;
      const penalty = this.computePenalty(share);

      this.logger.log({
        businessId,
        geohash5,
        share: +share.toFixed(4),
        totalImpressions,
        businessImpressions,
        sovPenalty: penalty,
        msg: 'ShareOfVoice penalty',
      });
      return penalty;
    } catch {
      return 1.0;
    }
  }

  private computePenalty(share: number): number {
    if (share <= SOV_LOWER_THRESHOLD) return 1.0;
    if (share >= MAX_SOV) return MIN_SOV_PENALTY;
    const t = (share - SOV_LOWER_THRESHOLD) / (MAX_SOV - SOV_LOWER_THRESHOLD);
    return 1.0 - t * (1.0 - MIN_SOV_PENALTY);
  }

  private async scanKeys(
    client: { scan: (cursor: string | number, ...args: unknown[]) => Promise<[string, string[]]> },
    pattern: string,
  ): Promise<string[]> {
    const collected: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      collected.push(...keys);
    } while (cursor !== '0');
    return collected;
  }

  async recordImpression(businessId: string, geohash5: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const hk = this.hourKey();
    const key = `sov:${businessId}:${geohash5}:${hk}`;
    try {
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, 3600);
    } catch {
      // fail-open
    }
  }
}

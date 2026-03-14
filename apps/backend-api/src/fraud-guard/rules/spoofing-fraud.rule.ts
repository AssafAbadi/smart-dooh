import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IFraudRule, FraudContext, FraudVerdict } from '../interfaces/fraud-rule.interface';
import { TOKENS } from '../../core/constants/tokens';
import type { IRedisService } from '../../core/interfaces/redis.interface';

const STATIC_THRESHOLD = parseInt(process.env['FRAUD_STATIC_THRESHOLD'] ?? '10', 10);
const COORD_PRECISION = 6;

@Injectable()
export class SpoofingFraudRule implements IFraudRule {
  readonly name = 'SpoofingFraudRule';
  readonly enabled = process.env['FRAUD_SPOOF_RULE_ENABLED'] !== 'false';
  private readonly logger = new Logger(SpoofingFraudRule.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  async evaluate(ctx: FraudContext): Promise<FraudVerdict> {
    const client = this.redis.getClient() as {
      get: (k: string) => Promise<string | null>;
      set: (...args: unknown[]) => Promise<unknown>;
    } | null;
    if (!client) return { isFraud: false, severity: 'flag' };

    const coordKey = `${ctx.lat.toFixed(COORD_PRECISION)},${ctx.lng.toFixed(COORD_PRECISION)}`;
    const key = `fraud:static:${ctx.driverId}`;

    try {
      const prev = await client.get(key);
      if (prev) {
        const parsed = JSON.parse(prev) as { coord: string; count: number };
        if (parsed.coord === coordKey) {
          const newCount = parsed.count + 1;
          await client.set(key, JSON.stringify({ coord: coordKey, count: newCount }), 'EX', 600);
          if (newCount >= STATIC_THRESHOLD) {
            return { isFraud: true, reason: `Static coordinates for ${newCount} heartbeats`, severity: 'flag' };
          }
        } else {
          await client.set(key, JSON.stringify({ coord: coordKey, count: 1 }), 'EX', 600);
        }
      } else {
        await client.set(key, JSON.stringify({ coord: coordKey, count: 1 }), 'EX', 600);
      }
    } catch {
      this.logger.warn('SpoofingFraudRule: Redis error, fail-open');
    }
    return { isFraud: false, severity: 'flag' };
  }
}

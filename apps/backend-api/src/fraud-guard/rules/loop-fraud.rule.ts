import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IFraudRule, FraudContext, FraudVerdict } from '../interfaces/fraud-rule.interface';
import { TOKENS } from '../../core/constants/tokens';
import type { IRedisService } from '../../core/interfaces/redis.interface';

const LOOP_WINDOW_SEC = parseInt(process.env['FRAUD_LOOP_WINDOW_SEC'] ?? '10', 10);

@Injectable()
export class LoopFraudRule implements IFraudRule {
  readonly name = 'LoopFraudRule';
  readonly enabled = process.env['FRAUD_LOOP_RULE_ENABLED'] !== 'false';
  private readonly logger = new Logger(LoopFraudRule.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  async evaluate(ctx: FraudContext): Promise<FraudVerdict> {
    if (!ctx.campaignId) return { isFraud: false, severity: 'flag' };

    const client = this.redis.getClient() as { set: (...args: unknown[]) => Promise<string | null> } | null;
    if (!client) return { isFraud: false, severity: 'flag' };

    const key = `fraud:loop:${ctx.deviceId}:${ctx.campaignId}`;
    try {
      const result = await client.set(key, '1', 'EX', LOOP_WINDOW_SEC, 'NX');
      if (result !== 'OK') {
        return { isFraud: true, reason: `Duplicate impression within ${LOOP_WINDOW_SEC}s window`, severity: 'flag' };
      }
    } catch {
      this.logger.warn('LoopFraudRule: Redis error, fail-open');
    }
    return { isFraud: false, severity: 'flag' };
  }
}

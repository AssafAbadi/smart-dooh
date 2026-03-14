import { Injectable, Logger } from '@nestjs/common';
import type { IFraudRule, FraudContext, FraudVerdict } from './interfaces/fraud-rule.interface';
import { SpeedFraudRule } from './rules/speed-fraud.rule';
import { LoopFraudRule } from './rules/loop-fraud.rule';
import { SpoofingFraudRule } from './rules/spoofing-fraud.rule';

const FRAUD_RULE_TIMEOUT_MS = parseInt(process.env['FRAUD_RULE_TIMEOUT_MS'] ?? '50', 10);

const PASS: FraudVerdict = { isFraud: false, severity: 'flag' };

@Injectable()
export class FraudGuardService {
  private readonly logger = new Logger(FraudGuardService.name);
  private readonly rules: IFraudRule[];

  constructor(
    speedRule: SpeedFraudRule,
    loopRule: LoopFraudRule,
    spoofRule: SpoofingFraudRule,
  ) {
    this.rules = [speedRule, loopRule, spoofRule];
  }

  async evaluate(ctx: FraudContext): Promise<FraudVerdict> {
    const enabledRules = this.rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) return PASS;

    const results = await Promise.all(
      enabledRules.map((rule) => this.evaluateWithCircuitBreaker(rule, ctx)),
    );

    const blocked = results.find((r) => r.isFraud && r.severity === 'block');
    if (blocked) return blocked;

    const flagged = results.find((r) => r.isFraud);
    if (flagged) return flagged;

    return PASS;
  }

  private async evaluateWithCircuitBreaker(rule: IFraudRule, ctx: FraudContext): Promise<FraudVerdict> {
    try {
      const timeout = new Promise<FraudVerdict>((_, reject) =>
        setTimeout(() => reject(new Error(`FraudRule ${rule.name} timed out`)), FRAUD_RULE_TIMEOUT_MS),
      );
      return await Promise.race([rule.evaluate(ctx), timeout]);
    } catch (err) {
      this.logger.warn({ rule: rule.name, error: (err as Error).message, msg: 'FraudRule circuit-breaker: fail-open' });
      return PASS;
    }
  }
}

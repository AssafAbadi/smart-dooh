import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../../core/constants/tokens';
import type { IRedisService } from '../../core/interfaces/redis.interface';

@Injectable()
export class BudgetPacingService {
  private readonly logger = new Logger(BudgetPacingService.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  private getClient() {
    return this.redis.getClient() as {
      get: (key: string) => Promise<string | null>;
      incrby: (key: string, amount: number) => Promise<number>;
      expire: (key: string, ttl: number) => Promise<number>;
    } | null;
  }

  private hourKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}H${String(now.getUTCHours()).padStart(2, '0')}`;
  }

  async getPacingFactor(campaignId: string, dailyBudget: number | null | undefined): Promise<number> {
    if (!dailyBudget || dailyBudget <= 0) return 1.0;

    const client = this.getClient();
    if (!client) return 1.0;

    const key = `pacing:${campaignId}:${this.hourKey()}`;
    try {
      const rawSpend = await client.get(key);
      const hourlySpendMillicents = parseInt(rawSpend ?? '0', 10);
      const hourlySpend = hourlySpendMillicents / 1000;
      const hourlyBudget = dailyBudget / 24;
      const factor = Math.max(0.1, Math.min(1.0, 1 - hourlySpend / hourlyBudget));

      this.logger.log({
        campaignId,
        dailyBudget,
        hourlyBudget: +hourlyBudget.toFixed(2),
        hourlySpend: +hourlySpend.toFixed(2),
        pacingFactor: +factor.toFixed(4),
        msg: 'BudgetPacing factor',
      });
      return factor;
    } catch {
      return 1.0;
    }
  }

  async recordSpend(campaignId: string, amountCpm: number): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const key = `pacing:${campaignId}:${this.hourKey()}`;
    try {
      const millicents = Math.round(amountCpm);
      const result = await client.incrby(key, millicents);
      if (result === millicents) {
        await client.expire(key, 3600);
      }
    } catch {
      // fail-open
    }
  }
}

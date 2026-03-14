import { Injectable, Logger } from '@nestjs/common';
import { TimeService } from '../../core/time/time.service';

export interface QualityScoreInput {
  ctr: number;
  impressionCount: number;
  createdAt: Date;
  budgetRemaining: number;
  dailyBudget?: number | null;
}

const BASELINE_CTR = 0.02;
const NEW_CAMPAIGN_THRESHOLD = parseInt(process.env['NEW_CAMPAIGN_THRESHOLD'] ?? '100', 10);
const DEFAULT_CTR_SCORE = 0.5;
const W_CTR = 0.5;
const W_FRESH = 0.2;
const W_BUDGET = 0.3;
const DEFAULT_DAILY_BUDGET = 1000;
const FRESHNESS_HALF_LIFE_DAYS = 30;
const MS_PER_DAY = 86_400_000;

@Injectable()
export class QualityScoreCalculator {
  private readonly logger = new Logger(QualityScoreCalculator.name);

  constructor(private readonly time: TimeService) {}

  compute(input: QualityScoreInput): number {
    const ctrScore = this.computeCtrScore(input.ctr, input.impressionCount);
    const freshnessScore = this.computeFreshnessScore(input.createdAt);
    const budgetHealthScore = this.computeBudgetHealthScore(input.budgetRemaining, input.dailyBudget);
    const quality = W_CTR * ctrScore + W_FRESH * freshnessScore + W_BUDGET * budgetHealthScore;
    return Math.max(0.01, Math.min(1, quality));
  }

  private computeCtrScore(ctr: number, impressionCount: number): number {
    if (impressionCount < NEW_CAMPAIGN_THRESHOLD) return DEFAULT_CTR_SCORE;
    return Math.min(1, ctr / BASELINE_CTR);
  }

  private computeFreshnessScore(createdAt: Date): number {
    const daysSinceCreation = (this.time.nowMillis() - createdAt.getTime()) / MS_PER_DAY;
    return 1 / (1 + daysSinceCreation / FRESHNESS_HALF_LIFE_DAYS);
  }

  private computeBudgetHealthScore(budgetRemaining: number, dailyBudget?: number | null): number {
    const denominator = dailyBudget ?? DEFAULT_DAILY_BUDGET;
    return Math.min(1, budgetRemaining / denominator);
  }
}

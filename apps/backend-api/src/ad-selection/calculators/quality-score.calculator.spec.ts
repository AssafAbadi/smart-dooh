import { QualityScoreCalculator } from './quality-score.calculator';
import { TimeService } from '../../core/time/time.service';

describe('QualityScoreCalculator', () => {
  let calculator: QualityScoreCalculator;
  let mockTimeService: { nowMillis: jest.Mock; getIsraelNow: jest.Mock };

  beforeEach(() => {
    mockTimeService = {
      nowMillis: jest.fn().mockReturnValue(Date.now()),
      getIsraelNow: jest.fn().mockReturnValue({ dayOfWeek: 3, hour: 14, minute: 0 }),
    };
    calculator = new QualityScoreCalculator(mockTimeService as unknown as TimeService);
  });

  it('should give new campaigns (< threshold) default 0.5 CTR score', () => {
    const score = calculator.compute({
      ctr: 0,
      impressionCount: 10,
      createdAt: new Date(),
      budgetRemaining: 10000,
      dailyBudget: 500,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should score high-CTR campaigns higher', () => {
    const base = {
      impressionCount: 200,
      createdAt: new Date(),
      budgetRemaining: 10000,
      dailyBudget: 500,
    };
    const highCtr = calculator.compute({ ...base, ctr: 0.05 });
    const lowCtr = calculator.compute({ ...base, ctr: 0.001 });
    expect(highCtr).toBeGreaterThan(lowCtr);
  });

  it('should score older campaigns with low budget lower', () => {
    const now = Date.now();
    mockTimeService.nowMillis.mockReturnValue(now);

    const fresh = calculator.compute({
      ctr: 0.01,
      impressionCount: 100,
      createdAt: new Date(now),
      budgetRemaining: 10000,
      dailyBudget: 500,
    });
    const oldLowBudget = calculator.compute({
      ctr: 0.01,
      impressionCount: 100,
      createdAt: new Date(now - 90 * 24 * 60 * 60 * 1000),
      budgetRemaining: 10,
      dailyBudget: 500,
    });
    expect(fresh).toBeGreaterThan(oldLowBudget);
  });

  it('should handle 0 impressions gracefully', () => {
    const score = calculator.compute({
      ctr: 0,
      impressionCount: 0,
      createdAt: new Date(),
      budgetRemaining: 0,
      dailyBudget: null,
    });
    expect(score).toBeGreaterThanOrEqual(0.01);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should handle 0 budget gracefully', () => {
    const score = calculator.compute({
      ctr: 0.02,
      impressionCount: 100,
      createdAt: new Date(),
      budgetRemaining: 0,
      dailyBudget: 1000,
    });
    expect(score).toBeGreaterThanOrEqual(0.01);
  });

  it('uses injected TimeService instead of Date.now()', () => {
    const fixedTime = new Date('2025-06-01T12:00:00Z').getTime();
    mockTimeService.nowMillis.mockReturnValue(fixedTime);
    calculator.compute({
      ctr: 0.02,
      impressionCount: 200,
      createdAt: new Date('2025-05-01T12:00:00Z'),
      budgetRemaining: 10000,
      dailyBudget: 500,
    });
    expect(mockTimeService.nowMillis).toHaveBeenCalled();
  });
});

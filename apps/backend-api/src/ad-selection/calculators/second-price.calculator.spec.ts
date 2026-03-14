import { SecondPriceCalculator, SECOND_PRICE_EPSILON, SOLO_FLOOR_RATIO, FLOOR_CPM } from './second-price.calculator';

describe('SecondPriceCalculator', () => {
  let calc: SecondPriceCalculator;

  beforeEach(() => {
    calc = new SecondPriceCalculator();
  });

  it('single-candidate returns floor price (50% of bid)', () => {
    const result = calc.compute({
      winnerCpm: 600,
      winnerQuality: 0.8,
      winnerRelevance: 0.9,
      winnerPacing: 1.0,
      winnerSovPenalty: 1.0,
      runnerUpAdRank: null,
    });
    expect(result).toBe(Math.max(FLOOR_CPM, Math.round(600 * SOLO_FLOOR_RATIO)));
  });

  it('winner never pays more than their own bid', () => {
    const result = calc.compute({
      winnerCpm: 500,
      winnerQuality: 0.5,
      winnerRelevance: 0.5,
      winnerPacing: 1.0,
      winnerSovPenalty: 1.0,
      runnerUpAdRank: 9999,
    });
    expect(result).toBeLessThanOrEqual(500);
  });

  it('returns second-price when runner-up exists', () => {
    const result = calc.compute({
      winnerCpm: 500,
      winnerQuality: 1.0,
      winnerRelevance: 1.0,
      winnerPacing: 1.0,
      winnerSovPenalty: 1.0,
      runnerUpAdRank: 200,
    });
    const expected = Math.min(500, Math.round(200 / 1.0 + SECOND_PRICE_EPSILON));
    expect(result).toBe(expected);
  });

  it('handles zero denominator gracefully by using fallback of 1', () => {
    const result = calc.compute({
      winnerCpm: 400,
      winnerQuality: 0,
      winnerRelevance: 0,
      winnerPacing: 0,
      winnerSovPenalty: 0,
      runnerUpAdRank: 100,
    });
    expect(result).toBe(Math.min(400, Math.round(100 / 1 + SECOND_PRICE_EPSILON)));
  });

  it('floor is at least FLOOR_CPM for single candidate with low bid', () => {
    const result = calc.compute({
      winnerCpm: 1,
      winnerQuality: 1,
      winnerRelevance: 1,
      winnerPacing: 1,
      winnerSovPenalty: 1,
      runnerUpAdRank: null,
    });
    expect(result).toBeGreaterThanOrEqual(FLOOR_CPM);
  });
});

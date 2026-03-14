import { WeightedSamplerService } from './weighted-sampler.service';

describe('WeightedSamplerService', () => {
  let sampler: WeightedSamplerService;

  beforeEach(() => {
    sampler = new WeightedSamplerService();
  });

  it('should return single candidate when only one exists', () => {
    const result = sampler.sample([{ item: 'A', score: 100 }], 1);
    expect(result).toEqual(['A']);
  });

  it('should return all items sorted by score when count >= items', () => {
    const result = sampler.sample(
      [
        { item: 'A', score: 50 },
        { item: 'B', score: 100 },
      ],
      5,
    );
    expect(result).toEqual(['B', 'A']);
  });

  it('should never select zero-score candidates when positive scores exist', () => {
    const items = [
      { item: 'good', score: 100 },
      { item: 'zero', score: 0 },
    ];
    for (let i = 0; i < 100; i++) {
      const [first] = sampler.sample(items, 1);
      expect(first).toBe('good');
    }
  });

  it('should return empty array for empty input', () => {
    expect(sampler.sample([], 5)).toEqual([]);
  });

  it('should produce roughly proportional distribution over many iterations', () => {
    const items = [
      { item: 'A', score: 300 },
      { item: 'B', score: 100 },
    ];
    const counts: Record<string, number> = { A: 0, B: 0 };
    const iterations = 10_000;
    for (let i = 0; i < iterations; i++) {
      const [first] = sampler.sample(items, 1);
      counts[first]++;
    }
    const ratioA = counts['A'] / iterations;
    expect(ratioA).toBeGreaterThan(0.6);
    expect(ratioA).toBeLessThan(0.9);
  });

  it('should produce roughly uniform distribution for equal scores', () => {
    const items = [
      { item: 'A', score: 100 },
      { item: 'B', score: 100 },
      { item: 'C', score: 100 },
    ];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    const iterations = 9_000;
    for (let i = 0; i < iterations; i++) {
      const [first] = sampler.sample(items, 1);
      counts[first]++;
    }
    for (const key of Object.keys(counts)) {
      const ratio = counts[key] / iterations;
      expect(ratio).toBeGreaterThan(0.2);
      expect(ratio).toBeLessThan(0.45);
    }
  });

});

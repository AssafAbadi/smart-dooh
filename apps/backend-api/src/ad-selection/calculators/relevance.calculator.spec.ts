import { RelevanceCalculator } from './relevance.calculator';

describe('RelevanceCalculator', () => {
  let calc: RelevanceCalculator;

  beforeEach(() => {
    calc = new RelevanceCalculator();
  });

  describe('proximityScore', () => {
    it('should return 1.5 for very close (< 50m)', () => {
      expect(calc.proximityScore(30)).toBe(1.5);
    });

    it('should return 1.2 for < 200m', () => {
      expect(calc.proximityScore(150)).toBe(1.2);
    });

    it('should return 1.0 for < 500m', () => {
      expect(calc.proximityScore(400)).toBe(1.0);
    });

    it('should return 0.7 for < 1000m', () => {
      expect(calc.proximityScore(800)).toBe(0.7);
    });

    it('should return 0.5 for far away', () => {
      expect(calc.proximityScore(2000)).toBe(0.5);
    });
  });

  describe('timeRelevance', () => {
    it('should boost lunch-time restaurant text', () => {
      const score = calc.timeRelevance(12, 'Lunch special', 'Come eat');
      expect(score).toBe(1.3);
    });

    it('should boost happy hour bar text', () => {
      const score = calc.timeRelevance(18, 'Happy hour deal', 'Drink specials');
      expect(score).toBe(1.4);
    });

    it('should return 1.0 for non-matching times', () => {
      const score = calc.timeRelevance(3, 'Burger place', 'Great food');
      expect(score).toBe(1.0);
    });
  });

  describe('weatherRelevance', () => {
    it('should boost hot drinks in cold weather', () => {
      const score = calc.weatherRelevance(
        { tempCelsius: 10, condition: 'Cloudy' },
        'Hot coffee',
        'Warm up',
      );
      expect(score).toBeGreaterThan(1.0);
    });

    it('should return 1.0 when no weather data', () => {
      expect(calc.weatherRelevance(null, 'test', 'test')).toBe(1.0);
    });
  });

  describe('compute (full relevance)', () => {
    it('should multiply proximity * time * weather', () => {
      const result = calc.compute({
        distanceMeters: 30,
        context: {
          weather: { tempCelsius: 10, condition: 'Rain' },
          timeHour: 12,
          poiDensity: 5,
        },
        headline: 'Hot lunch special',
        body: 'Warm food delivery',
      });
      expect(result).toBeGreaterThan(1.5);
    });

    it('should give low score for far away, wrong time, wrong weather', () => {
      const result = calc.compute({
        distanceMeters: 2000,
        context: {
          weather: { tempCelsius: 25, condition: 'Clear' },
          timeHour: 3,
          poiDensity: 0,
        },
        headline: 'Night drinks',
        body: 'Late night',
      });
      expect(result).toBe(0.5);
    });
  });
});

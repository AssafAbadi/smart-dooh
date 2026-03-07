import { getTimeMultiplier, getSpeedFactor } from './estimation-factors.util';

describe('estimation-factors.util', () => {
  describe('getTimeMultiplier', () => {
    it('returns 1.6 for Thu/Fri/Sat 21:00–02:00', () => {
      expect(getTimeMultiplier(4, 21)).toBe(1.6);
      expect(getTimeMultiplier(5, 22)).toBe(1.6);
      expect(getTimeMultiplier(6, 23)).toBe(1.6);
      expect(getTimeMultiplier(6, 0)).toBe(1.6);
      expect(getTimeMultiplier(5, 2)).toBe(1.6);
    });

    it('returns 1.4 for Sun–Thu 07:30–09:30 (hours 7, 8, and 9 with minute <= 30)', () => {
      expect(getTimeMultiplier(0, 7)).toBe(1.4);
      expect(getTimeMultiplier(0, 8)).toBe(1.4);
      expect(getTimeMultiplier(4, 7)).toBe(1.4);
      expect(getTimeMultiplier(0, 9, 0)).toBe(1.4);
      expect(getTimeMultiplier(0, 9, 30)).toBe(1.4);
      expect(getTimeMultiplier(4, 9, 15)).toBe(1.4);
    });

    it('returns 1.0 for hour 9 with minute > 30 (outside rush)', () => {
      expect(getTimeMultiplier(0, 9, 31)).toBe(1.0);
      expect(getTimeMultiplier(0, 9, 59)).toBe(1.0);
    });

    it('returns 0.3 for standard nights (e.g. Sun 22)', () => {
      expect(getTimeMultiplier(0, 22)).toBe(0.3);
      expect(getTimeMultiplier(2, 3)).toBe(0.3);
    });

    it('returns 1.0 for default daytime', () => {
      expect(getTimeMultiplier(2, 14)).toBe(1.0);
      expect(getTimeMultiplier(5, 12)).toBe(1.0);
    });
  });

  describe('getSpeedFactor', () => {
    it('returns 0.1 when speed > 70 km/h', () => {
      expect(getSpeedFactor(71, undefined)).toBe(0.1);
      expect(getSpeedFactor(100, 5)).toBe(0.1);
    });

    it('returns 2.0 when speed 0 and dwell > 10s', () => {
      expect(getSpeedFactor(0, 15)).toBe(2.0);
      expect(getSpeedFactor(0, 11)).toBe(2.0);
    });

    it('returns 1.0 when speed 0 but dwell <= 10', () => {
      expect(getSpeedFactor(0, 10)).toBe(1.0);
      expect(getSpeedFactor(0, 5)).toBe(1.0);
    });

    it('returns 1.0 when speed undefined or normal', () => {
      expect(getSpeedFactor(undefined, undefined)).toBe(1.0);
      expect(getSpeedFactor(50, undefined)).toBe(1.0);
    });
  });
});

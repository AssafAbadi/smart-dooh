import { GEOHASH_LEVEL, toGeohash7 } from './geohash.util';

describe('geohash.util', () => {
  describe('GEOHASH_LEVEL', () => {
    it('should be 7', () => {
      expect(GEOHASH_LEVEL).toBe(7);
    });
  });

  describe('toGeohash7', () => {
    it('should truncate long geohash to 7 chars', () => {
      expect(toGeohash7('sv8eqh2')).toBe('sv8eqh2');
      expect(toGeohash7('sv8eqh2xyz')).toBe('sv8eqh2');
    });

    it('should return short geohash as-is (no pad)', () => {
      expect(toGeohash7('abc')).toBe('abc');
    });

    it('should return empty string for empty or non-string', () => {
      expect(toGeohash7('')).toBe('');
      expect(toGeohash7(null as unknown as string)).toBe('');
      expect(toGeohash7(undefined as unknown as string)).toBe('');
    });
  });
});

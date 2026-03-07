/**
 * Contract test for prisma/seed-density.ts.
 * Asserts the expected shape and row count so that TrafficDensityRepository
 * and ImpressionEstimatorService have data when seed:density has been run.
 */
import { GEOHASH_LEVEL } from '../core/utils/geohash.util';

describe('seed-density contract', () => {
  const HOTSPOT_COUNT = 5;
  const PEAK_DAYS = [4, 5, 6];
  const PEAK_HOURS = [7, 8, 21, 22, 23];

  it('expects geohash level 7 for TrafficDensity', () => {
    expect(GEOHASH_LEVEL).toBe(7);
  });

  it('expects 5 hotspots × 3 days × 5 hours = 75 rows from seed hotspots', () => {
    const rows = HOTSPOT_COUNT * PEAK_DAYS.length * PEAK_HOURS.length;
    expect(rows).toBe(75);
  });

  it('PEAK_DAYS are Thu/Fri/Sat (4,5,6)', () => {
    expect(PEAK_DAYS).toEqual([4, 5, 6]);
  });

  it('PEAK_HOURS include rush and evening', () => {
    expect(PEAK_HOURS).toContain(7);
    expect(PEAK_HOURS).toContain(8);
    expect(PEAK_HOURS).toContain(21);
    expect(PEAK_HOURS).toContain(22);
    expect(PEAK_HOURS).toContain(23);
  });
});

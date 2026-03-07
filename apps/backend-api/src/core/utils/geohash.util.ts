/** Geohash level 7 for all location-based lookups (~150m grid in Israel). */
export const GEOHASH_LEVEL = 7;

/**
 * Normalize geohash to level 7 for TrafficDensity and estimator lookups.
 */
export function toGeohash7(geohash: string): string {
  if (!geohash || typeof geohash !== 'string') return '';
  return geohash.slice(0, GEOHASH_LEVEL);
}

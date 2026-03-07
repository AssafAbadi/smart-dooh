/**
 * Business tags (what a place is). Must match Prisma enum BusinessTag.
 * Dietary/kosher/alcohol rules apply only when RESTAURANT is present.
 */
export const BUSINESS_TAGS = [
  'RESTAURANT',
  'SERVES_ALCOHOL',
  'KOSHER',
  'VEGAN',
  'VEGETARIAN',
  'GAMBLING',
] as const;

export type BusinessTag = (typeof BUSINESS_TAGS)[number];

export function isBusinessTag(s: string): s is BusinessTag {
  return (BUSINESS_TAGS as readonly string[]).includes(s);
}

/**
 * Driver preference filters (what the driver wants). Must match Prisma enum PreferenceFilter.
 * Matching is rule-based per preference, not hasEvery on business tags.
 */
export const PREFERENCE_FILTERS = [
  'NO_ALCOHOL',
  'KOSHER_ONLY',
  'UNKOSHER_ONLY',
  'VEGAN_ONLY',
  'VEGETARIAN_ONLY',
  'NO_GAMBLING',
] as const;

export type PreferenceFilter = (typeof PREFERENCE_FILTERS)[number];

export function isPreferenceFilter(s: string): s is PreferenceFilter {
  return (PREFERENCE_FILTERS as readonly string[]).includes(s);
}

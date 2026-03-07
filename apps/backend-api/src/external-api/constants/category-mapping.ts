/**
 * Map Google Places API types (place.types) to internal business categories.
 * Used when ingesting POIs from Google to our context.
 */
export const GOOGLE_PLACE_TYPE_TO_CATEGORY: Record<string, string> = {
  restaurant: 'restaurant',
  food: 'restaurant',
  cafe: 'cafe',
  bar: 'bar',
  gym: 'gym',
  spa: 'spa',
  store: 'retail',
  clothing_store: 'retail',
  supermarket: 'retail',
  pharmacy: 'pharmacy',
  gas_station: 'gas_station',
  parking: 'parking',
  bank: 'bank',
  atm: 'bank',
  hospital: 'health',
  doctor: 'health',
  liquor_store: 'alcohol',
  meal_takeaway: 'restaurant',
  meal_delivery: 'restaurant',
  night_club: 'bar',
  shopping_mall: 'retail',
};

export const DEFAULT_INTERNAL_CATEGORY = 'poi';

export function mapGooglePlaceTypesToCategory(types: string[]): string {
  for (const t of types) {
    const mapped = GOOGLE_PLACE_TYPE_TO_CATEGORY[t];
    if (mapped) return mapped;
  }
  return DEFAULT_INTERNAL_CATEGORY;
}

/**
 * AdSelectionEngine: Strategy pattern chain.
 * Input and candidate type for ranking; output is AdInstruction[].
 */

export interface CandidateAd {
  campaignId: string;
  creativeId: string;
  variantId?: string;
  headline: string;
  body?: string;
  imageUrl?: string;
  couponCode?: string;
  businessId: string;
  cpm: number;
  budgetRemaining: number;
  priority?: number;
}

export interface SelectionContext {
  weather: { tempCelsius: number; condition: string } | null;
  timeHour: number; // 0-23
  poiDensity: number; // e.g. count of nearby POIs
}

export interface SelectionInput {
  driverId: string;
  lat: number;
  lng: number;
  geohash: string;
  bleHint?: { type: 'IMMEDIATE'; businessId: string };
  candidates: CandidateAd[];
  context: SelectionContext;
}

/** AdInstruction-shaped result (matches libs/shared/dto AdInstruction). businessId used to filter by driver preferences. */
export interface AdInstructionResult {
  campaignId: string;
  creativeId: string;
  variantId?: string;
  headline: string;
  body?: string;
  placeholders?: Record<string, string>;
  imageUrl?: string;
  couponCode?: string;
  ttlSeconds?: number;
  priority?: number;
  /** Set from candidate; absent for emergency override. Used to ensure only ads from allowed businesses are returned. */
  businessId?: string;
  /** Distance from request location to campaign geofence center (for display and live app distance). */
  distanceMeters?: number;
  /** Geofence center so the app can compute distance client-side for live updates. */
  businessLat?: number;
  businessLng?: number;
}

/**
 * Strategy returns either an override (e.g. emergency only) or the candidates to pass to next strategy.
 * When override is set, the chain stops and that list is returned as ranked result.
 */
export interface AdSelectionStrategy {
  name: string;
  apply(input: SelectionInput): Promise<
    | { override: true; instructions: AdInstructionResult[] }
    | { override: false; candidates: CandidateAd[] }
  >;
}

export interface EmergencyAlertRecord {
  id: string;
  headline: string;
  body: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface IEmergencyAlertRepository {
  findActiveForLocation(lat: number, lng: number): Promise<EmergencyAlertRecord | null>;
}

import { MMKV } from 'react-native-mmkv';
import { z } from 'zod';
import { getApiBase } from './apiClient';
import { logger } from '../utils/logger';
import { haversineMeters, bearingDegrees, bearingToDirection } from '@smart-dooh/shared-geo';
import type { ShelterInfo } from '../stores/emergencyStore';

const storage = new MMKV({ id: 'adrive-shelter-cache' });
const KEY_SHELTERS = 'nearby_shelters';
const KEY_LAST_FETCH_LAT = 'last_fetch_lat';
const KEY_LAST_FETCH_LNG = 'last_fetch_lng';
const REFETCH_DISTANCE_M = 100;
const CACHE_RADIUS_M = 1000;
const CACHE_LIMIT = 5;

const API_BASE = getApiBase();

export const cachedShelterSchema = z.object({
  id: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number(),
});
export type CachedShelter = z.infer<typeof cachedShelterSchema>;

const shelterApiItemSchema = z.object({
  id: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number(),
});

const shelterApiResponseSchema = z.object({
  shelters: z.array(shelterApiItemSchema),
});

export function getCachedShelters(): CachedShelter[] {
  try {
    const raw = storage.getString(KEY_SHELTERS);
    if (!raw) return [];
    const parsed = z.array(cachedShelterSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function getNearestCachedShelter(lat: number, lng: number): CachedShelter | null {
  const shelters = getCachedShelters();
  if (shelters.length === 0) return null;

  let nearest: CachedShelter | null = null;
  let minDist = Infinity;
  for (const s of shelters) {
    const d = haversineMeters(lat, lng, s.lat, s.lng);
    if (d < minDist) {
      minDist = d;
      nearest = { ...s, distanceMeters: Math.round(d) };
    }
  }
  return nearest;
}

/**
 * Convert a cached shelter and user position to ShelterInfo (distance, bearing, direction).
 * Used when updating the emergency store with a re-fetched nearest shelter.
 */
export function cachedShelterToShelterInfo(
  cached: CachedShelter,
  userLat: number,
  userLng: number,
): ShelterInfo {
  const distanceMeters = haversineMeters(userLat, userLng, cached.lat, cached.lng);
  const bearing = bearingDegrees(userLat, userLng, cached.lat, cached.lng);
  const direction = bearingToDirection(bearing);
  return {
    address: cached.address,
    lat: cached.lat,
    lng: cached.lng,
    distanceMeters: Math.round(distanceMeters),
    bearingDegrees: Math.round(bearing),
    direction,
  };
}

export async function refreshShelterCache(lat: number, lng: number): Promise<void> {
  const lastLat = storage.getNumber(KEY_LAST_FETCH_LAT);
  const lastLng = storage.getNumber(KEY_LAST_FETCH_LNG);

  if (lastLat != null && lastLng != null) {
    const moved = haversineMeters(lastLat, lastLng, lat, lng);
    if (moved < REFETCH_DISTANCE_M) return;
  }

  try {
    const url = `${API_BASE}/shelters/nearby?lat=${lat}&lng=${lng}&radius=${CACHE_RADIUS_M}&limit=${CACHE_LIMIT}`;
    const response = await fetch(url);
    if (!response.ok) return;
    const raw = await response.json();

    const parsed = shelterApiResponseSchema.safeParse(raw);
    if (!parsed.success) {
      logger.debug('Shelter API response validation failed');
      return;
    }

    const shelters: CachedShelter[] = parsed.data.shelters.map((s) => ({
      id: s.id,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      distanceMeters: Math.round(s.distanceMeters),
    }));
    storage.set(KEY_SHELTERS, JSON.stringify(shelters));
    storage.set(KEY_LAST_FETCH_LAT, lat);
    storage.set(KEY_LAST_FETCH_LNG, lng);
    logger.info(`Shelter cache refreshed: ${shelters.length} shelters`);
  } catch {
    logger.debug('Shelter cache refresh failed – using existing cache');
  }
}

export function clearShelterCache(): void {
  storage.delete(KEY_SHELTERS);
  storage.delete(KEY_LAST_FETCH_LAT);
  storage.delete(KEY_LAST_FETCH_LNG);
}

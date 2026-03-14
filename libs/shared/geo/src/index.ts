export type DirectionArrow = 'up' | 'down' | 'left' | 'right';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance in meters between two lat/lng points.
 * Pure function – no side effects.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Bearing in degrees from (fromLat, fromLng) to (toLat, toLng).
 * 0 = North, 90 = East, 180 = South, 270 = West.
 * Pure function – no side effects.
 */
export function bearingDegrees(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const dLon = toRad(toLng - fromLng);
  const y = Math.sin(dLon) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(dLon);
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Map a bearing (0–360) to a simple 4-way direction arrow for UI.
 * Pure function – no side effects.
 */
export function bearingToDirection(bearingDeg: number): DirectionArrow {
  if (bearingDeg >= 315 || bearingDeg < 45) return 'up';
  if (bearingDeg >= 45 && bearingDeg < 135) return 'right';
  if (bearingDeg >= 135 && bearingDeg < 225) return 'down';
  return 'left';
}

/**
 * Compute direction from user's position + heading to target, expressed as
 * a relative arrow (forward/backward/left/right mapped to up/down/left/right).
 * Pure function – no side effects.
 */
export function relativeDirection(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  headingDeg: number,
): DirectionArrow {
  const abs = bearingDegrees(userLat, userLng, targetLat, targetLng);
  const rel = ((abs - headingDeg + 360) % 360);
  if (rel >= 315 || rel < 45) return 'up';
  if (rel >= 45 && rel < 135) return 'right';
  if (rel >= 135 && rel < 225) return 'down';
  return 'left';
}

/**
 * Returns true if the user has moved more than `meters` from the reference point.
 * Pure function – no side effects.
 */
export function hasMovedMoreThanMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  meters: number,
): boolean {
  return haversineMeters(lat1, lng1, lat2, lng2) > meters;
}

/**
 * Compute a simple bounding box for a point + radius in meters.
 * Pure function – no side effects.
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusMeters: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMeters / 111_320;
  const lngDelta = radiusMeters / (111_320 * Math.cos(toRad(lat)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

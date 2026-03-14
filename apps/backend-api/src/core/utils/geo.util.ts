/**
 * Geo helpers (inlined from @smart-dooh/shared-geo to avoid rootDir/build issues).
 * Keep in sync with libs/shared/geo for behavior.
 */
export type DirectionArrow = 'up' | 'down' | 'left' | 'right';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

const R_EARTH_M = 6_371_000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R_EARTH_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

export function bearingToDirection(bearingDeg: number): DirectionArrow {
  if (bearingDeg >= 315 || bearingDeg < 45) return 'up';
  if (bearingDeg >= 45 && bearingDeg < 135) return 'right';
  if (bearingDeg >= 135 && bearingDeg < 225) return 'down';
  return 'left';
}

export function hasMovedMoreThanMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  meters: number,
): boolean {
  return haversineMeters(lat1, lng1, lat2, lng2) > meters;
}

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

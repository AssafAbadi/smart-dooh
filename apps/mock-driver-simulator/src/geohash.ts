/**
 * Base32 geohash encode (precision 7 ~153m) for cache keys and API params.
 */
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat: number, lng: number, precision = 7): string {
  const bits = precision * 5;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  const binary: number[] = [];

  for (let i = 0; i < bits; i++) {
    if (i % 2 === 0) {
      const mid = (lngMin + lngMax) / 2;
      binary.push(lng >= mid ? 1 : 0);
      if (lng >= mid) lngMin = mid;
      else lngMax = mid;
    } else {
      const mid = (latMin + latMax) / 2;
      binary.push(lat >= mid ? 1 : 0);
      if (lat >= mid) latMin = mid;
      else latMax = mid;
    }
  }

  let hash = '';
  for (let i = 0; i < binary.length; i += 5) {
    let idx = 0;
    for (let j = 0; j < 5 && i + j < binary.length; j++) {
      idx = (idx << 1) | binary[i + j];
    }
    hash += BASE32[idx];
  }
  return hash;
}

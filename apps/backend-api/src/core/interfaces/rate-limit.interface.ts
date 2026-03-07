/**
 * Rate limit result: allowed or throttled with retryAfter (seconds).
 */
export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Device limit: 1 request / 5s.
 * External API: max 10/min per geohash:service (key: api_calls:{geohash}:{service}).
 * When checkExternalApi returns allowed: false, callers should serve from cache and may return 429 with retryAfter.
 */
export interface IRateLimitService {
  /** Device: 1 req / 5s. Returns allowed or 429-style retryAfter. */
  checkDevice(deviceId: string): Promise<RateLimitResult>;

  /**
   * External API: 10/min per geohash:service. Returns allowed or retryAfter.
   * If not allowed: serve from cache and optionally return 429 with retryAfter in response.
   */
  checkExternalApi(geohash: string, service: string): Promise<RateLimitResult>;

  /** Call when serving from cache for api_calls (e.g. to avoid double-count). Optional. */
  recordCacheHit?(geohash: string, service: string): Promise<void>;
}

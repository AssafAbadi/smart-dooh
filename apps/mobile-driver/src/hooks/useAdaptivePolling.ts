import { useEffect, useRef } from 'react';

/**
 * Polling for ranked ads by location.
 * Real GPS (walking/driving): 6s so ads update as you move (backend rate limit 2 req/6s).
 * Simulator: 6s to stay in sync with simulated route.
 */
const INTERVAL_REAL_GPS_MS = 6000;
export const INTERVAL_SIMULATOR_MS = 6000;

export interface UseAdaptivePollingOptions {
  /** Override interval (e.g. INTERVAL_SIMULATOR_MS when in simulator mode). */
  intervalMs?: number;
}

export function useAdaptivePolling(callback: () => void, options?: UseAdaptivePollingOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const intervalOverride = options?.intervalMs;

  useEffect(() => {
    const interval = intervalOverride ?? INTERVAL_REAL_GPS_MS;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => cbRef.current(), interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [intervalOverride]);
}

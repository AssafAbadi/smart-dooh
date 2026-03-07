import { useEffect, useRef } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useSimulatorStore, SIMULATOR_DRIVER_ID } from '../stores/simulatorStore';
import { logger } from '../utils/logger';

import { getApiBase, apiHeaders } from '../services/apiClient';

const API_BASE = getApiBase();
const POLL_INTERVAL_MS = 4000;

/**
 * When simulator mode is on, poll backend for current simulated position (from mock-driver-simulator)
 * and update location store so ads reflect the simulated Tel Aviv drive.
 */
export function useSimulatorPosition() {
  const simulatorMode = useSimulatorStore((s) => s.simulatorMode);
  const setLocation = useLocationStore((s) => s.setLocation);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    logger.info('Simulator position effect', { simulatorMode });
    if (!simulatorMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = () => {
      const url = `${API_BASE}/simulator/position?driverId=${encodeURIComponent(SIMULATOR_DRIVER_ID)}`;
      fetch(url, { headers: apiHeaders() })
        .then((r) => {
          if (!r.ok) logger.warn('Simulator position fetch failed', { status: r.status });
          return r.json();
        })
        .then((data: { lat?: number; lng?: number; geohash?: string } | null) => {
          if (data && typeof data.lat === 'number' && typeof data.lng === 'number' && data.geohash) {
            setLocation(data.lat, data.lng, data.geohash, false, true);
          }
        })
        .catch((err) => logger.error('Simulator position error', err));
    };

    poll(); // once immediately
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [simulatorMode, setLocation]);
}

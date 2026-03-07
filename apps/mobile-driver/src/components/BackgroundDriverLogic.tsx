import { useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useLocationStore } from '../stores/locationStore';
import { useAdStore } from '../stores/adStore';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';
import { useLocation } from '../hooks/useLocation';
import { useSimulatorPosition } from '../hooks/useSimulatorPosition';
import { useAdaptivePolling, INTERVAL_SIMULATOR_MS } from '../hooks/useAdaptivePolling';
import { SIMULATOR_DRIVER_ID } from '../stores/simulatorStore';
import { syncWithBackoff, createImpressionSender } from '../services/impressionSync';
import { getApiBase, apiHeaders } from '../services/apiClient';
import { logger } from '../utils/logger';

const API_BASE = getApiBase();
const DEVICE_ID_KEY = 'adrive_device_id';

let fallbackDeviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  try {
    const store = SecureStore;
    if (store?.getItemAsync) {
      let id = await store.getItemAsync(DEVICE_ID_KEY);
      if (!id) {
        id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        if (store.setItemAsync) await store.setItemAsync(DEVICE_ID_KEY, id);
      }
      return id;
    }
  } catch {
    // SecureStore not available (e.g. web) or failed
  }
  if (!fallbackDeviceId) {
    fallbackDeviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  return fallbackDeviceId;
}

/**
 * Runs in the drawer layout so location, heartbeat, and ad-selection polling
 * keep working in the background regardless of which screen is open.
 */
export function BackgroundDriverLogic() {
  const { setInstructions, refreshTrigger } = useAdStore();
  const { enqueue, getQueue, dequeue } = useOfflineQueueStore();
  const { lat, lng, geohash, isSimulated } = useLocationStore();
  const deviceIdRef = useRef<string | null>(null);
  const lastRecordedKeyRef = useRef<string | null>(null);
  const lastEnqueuedFromLastRef = useRef<string | null>(null);

  useLocation();
  useSimulatorPosition();

  useEffect(() => {
    let cancelled = false;
    getDeviceId().then((id) => {
      if (!cancelled) deviceIdRef.current = id;
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const deviceId = deviceIdRef.current;
      if (!deviceId) return;
      const driverId = isSimulated ? SIMULATOR_DRIVER_ID : 'driver-1';
      fetch(`${API_BASE}/car-screens/heartbeat`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ deviceId, driverId }),
      }).catch((e) => logger.error('Heartbeat failed', e));
    }, 120000);
    return () => clearInterval(t);
  }, [isSimulated]);

  // Real-time GPS: POST /driver/location every 7s so backend has current position and area/neighborhood (Google Geocoding)
  const DRIVER_LOCATION_INTERVAL_MS = 7000;
  useEffect(() => {
    if (isSimulated || lat == null || lng == null || !geohash) return;
    const deviceId = deviceIdRef.current ?? `device-${Date.now()}`;
    const driverId = 'driver-1';
    const send = () => {
      fetch(`${API_BASE}/driver/location`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ driverId, deviceId, lat, lng, geohash }),
      }).catch((e) => logger.warn('Driver location POST failed', e));
    };
    send();
    const t = setInterval(send, DRIVER_LOCATION_INTERVAL_MS);
    return () => clearInterval(t);
  }, [isSimulated, lat, lng, geohash]);

  // Debounce: backend allows 1 req/5s per device; avoid 429 when initial fetch + refresh or interval fire close together
  const lastAdFetchTimeRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL_MS = 5500;

  const fetchRanked = useCallback(() => {
    if (lat == null || lng == null || !geohash) return;
    const now = Date.now();
    if (now - lastAdFetchTimeRef.current < MIN_FETCH_INTERVAL_MS) return;
    lastAdFetchTimeRef.current = now;

    const deviceId = deviceIdRef.current ?? `device-${Date.now()}`;
    const driverId = isSimulated ? SIMULATOR_DRIVER_ID : 'driver-1';
    const url = `${API_BASE}/ad-selection/ranked?driverId=${encodeURIComponent(driverId)}&lat=${lat}&lng=${lng}&geohash=${geohash}&timeHour=${new Date().getHours()}`;
    logger.info('Ranked request', { lat, lng, geohash });
    fetch(url, { headers: apiHeaders({ 'x-device-id': deviceId }) })
      .then((r) => {
        if (!r.ok) {
          logger.warn('Ad-selection ranked failed', { status: r.status, driverId });
          if (r.status === 429) lastAdFetchTimeRef.current = 0;
          return { res: r, data: null };
        }
        const ct = r.headers.get('content-type') ?? '';
        if (ct.includes('text/html')) {
          logger.warn('Ranked response is HTML (e.g. ngrok interstitial), not JSON');
          return { res: r, data: null };
        }
        return r.json().then((data) => ({ res: r, data }));
      })
      .then(({ data }) => {
        if (data != null && Array.isArray(data.instructions)) {
          logger.info('Ranked response', { count: data.instructions.length });
          setInstructions(data.instructions, 'ranked');
          const first = data.instructions[0];
          const deviceId = deviceIdRef.current ?? `device-${Date.now()}`;
          const driverId = isSimulated ? SIMULATOR_DRIVER_ID : 'driver-1';
          if (
            first?.campaignId &&
            first.campaignId !== 'emergency' &&
            first.creativeId &&
            lat != null &&
            lng != null &&
            geohash
          ) {
            const key = `${first.campaignId}:${first.creativeId}:${geohash}`;
            if (lastRecordedKeyRef.current !== key) {
              lastRecordedKeyRef.current = key;
              enqueue({
                campaignId: first.campaignId,
                creativeId: first.creativeId,
                deviceId,
                driverId,
                lat,
                lng,
                geohash,
              });
              const queue = getQueue();
              if (queue.length > 0) {
                syncWithBackoff(queue, createImpressionSender(API_BASE))
                  .then(({ synced }) => {
                    synced.forEach((client_uuid) => dequeue(client_uuid));
                  })
                  .catch((e) => logger.warn('Impression sync failed', e));
              }
            }
          }
        }
      })
      .catch((e) => logger.error('Ad-selection ranked error', e));
  }, [lat, lng, geohash, isSimulated, setInstructions, enqueue, getQueue, dequeue]);

  // In simulator mode poll every 6s (rate limit 5s) so ads update as the route advances
  useAdaptivePolling(fetchRanked, {
    intervalMs: isSimulated ? INTERVAL_SIMULATOR_MS : undefined,
  });

  // Fetch ranked immediately when we get position (real GPS or simulator), so the user sees a nearby ad without waiting for the first interval.
  const hasFetchedInitialRef = useRef(false);
  useEffect(() => {
    if (lat == null || lng == null || !geohash) return;
    if (hasFetchedInitialRef.current) return;
    hasFetchedInitialRef.current = true;
    fetchRanked();
  }, [lat, lng, geohash, fetchRanked]);
  useEffect(() => {
    if (!lat && !lng) hasFetchedInitialRef.current = false;
  }, [lat, lng]);

  // When preferences are saved, refresh ads immediately
  useEffect(() => {
    if (refreshTrigger > 0) fetchRanked();
  }, [refreshTrigger, fetchRanked]);

  // Sync with display: poll GET /ad-selection/last/driver-1 so the app shows the same ad as the display URL.
  // Also enqueue one impression so balance can go up when the user sees this ad.
  const driverIdForLast = isSimulated ? SIMULATOR_DRIVER_ID : 'driver-1';
  useEffect(() => {
    const fetchLast = () => {
      fetch(`${API_BASE}/ad-selection/last/${encodeURIComponent(driverIdForLast)}`, {
        headers: apiHeaders({ Accept: 'application/json' }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.instructions?.length) return;
          setInstructions(data.instructions, 'last');
          const first = data.instructions[0];
          if (
            !first?.campaignId ||
            first.campaignId === 'emergency' ||
            !first.creativeId ||
            lat == null ||
            lng == null ||
            !geohash
          )
            return;
          const key = `${first.campaignId}:${first.creativeId}`;
          if (lastEnqueuedFromLastRef.current === key) return;
          lastEnqueuedFromLastRef.current = key;
          const deviceId = deviceIdRef.current ?? `device-${Date.now()}`;
          enqueue({
            campaignId: first.campaignId,
            creativeId: first.creativeId,
            deviceId,
            driverId: driverIdForLast,
            lat,
            lng,
            geohash,
          });
          const queue = getQueue();
          if (queue.length > 0) {
            syncWithBackoff(queue, createImpressionSender(API_BASE))
              .then(({ synced }) => synced.forEach((client_uuid) => dequeue(client_uuid)))
              .catch((e) => logger.warn('Impression sync (from last) failed', e));
          }
        })
        .catch(() => {});
    };
    fetchLast();
    const t = setInterval(fetchLast, 10000);
    return () => clearInterval(t);
  }, [driverIdForLast, lat, lng, geohash, setInstructions, enqueue, getQueue, dequeue]);

  return null;
}

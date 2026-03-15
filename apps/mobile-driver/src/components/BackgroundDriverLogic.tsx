import { useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useLocationStore } from '../stores/locationStore';
import { useAdStore } from '../stores/adStore';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';
import { useEmergencyStore } from '../stores/emergencyStore';
import { useLocation } from '../hooks/useLocation';
import { useSimulatorPosition } from '../hooks/useSimulatorPosition';
import { useAdaptivePolling, INTERVAL_SIMULATOR_MS } from '../hooks/useAdaptivePolling';
import { SIMULATOR_DRIVER_ID } from '../stores/simulatorStore';
import { syncWithBackoff, createImpressionSender } from '../services/impressionSync';
import { connectSocket, updateSocketPosition, disconnectSocket } from '../services/socketService';
import { refreshShelterCache } from '../services/shelterCache';
import { getApiBase, apiHeaders } from '../services/apiClient';
import { logger } from '../utils/logger';
import { haversineMeters } from '@smart-dooh/shared-geo';

const API_BASE = getApiBase();
/** When user has moved this many meters from last successful ranked response, trigger an immediate ranked fetch so new nearby ads appear (helps when on cellular and some requests fail). */
const MOVE_THRESHOLD_FOR_REFRESH_M = 100;
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
  const { setInstructions, refreshTrigger, requestRefresh } = useAdStore();
  const { enqueue, getQueue, dequeue } = useOfflineQueueStore();
  const { lat, lng, geohash, isSimulated } = useLocationStore();
  const deviceIdRef = useRef<string | null>(null);
  const lastRecordedKeyRef = useRef<string | null>(null);
  const lastEnqueuedFromLastRef = useRef<string | null>(null);
  const lastSuccessfulRankedLatRef = useRef<number | null>(null);
  const lastSuccessfulRankedLngRef = useRef<number | null>(null);

  useLocation();
  useSimulatorPosition();

  useEffect(() => {
    let cancelled = false;
    getDeviceId().then((id) => {
      if (!cancelled) deviceIdRef.current = id;
    });
    return () => { cancelled = true; };
  }, []);

  // Connect emergency socket once we have a valid position.
  // Must depend on lat/lng so the effect re-runs when location becomes available.
  const hasConnectedRef = useRef(false);
  useEffect(() => {
    if (hasConnectedRef.current || lat == null || lng == null) return;
    hasConnectedRef.current = true;
    const driverId = isSimulated ? SIMULATOR_DRIVER_ID : 'driver-1';
    connectSocket(driverId, lat, lng);
    return () => {
      disconnectSocket();
      hasConnectedRef.current = false;
    };
  }, [lat, lng, isSimulated]);

  useEffect(() => {
    if (lat == null || lng == null) return;
    updateSocketPosition(lat, lng);
    refreshShelterCache(lat, lng).catch(() => {});
  }, [lat, lng]);

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
    const RANKED_FETCH_TIMEOUT_MS = 15000;
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), RANKED_FETCH_TIMEOUT_MS);
    fetch(url, { headers: apiHeaders({ 'x-device-id': deviceId }), signal: ac.signal })
      .then((r) => {
        clearTimeout(timeoutId);
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
        if (data == null || !Array.isArray(data.instructions)) return;
        const list = data.instructions;
        logger.info('Ranked response', { count: list.length });
        setInstructions(list, 'ranked');
        lastSuccessfulRankedLatRef.current = lat;
        lastSuccessfulRankedLngRef.current = lng;
        if (list.length === 0) return;
        const first = list[0];
          if (first?.emergencyData) {
            const ed = first.emergencyData;
            useEmergencyStore.getState().setAlert(
              {
                address: ed.shelterAddress,
                lat: ed.shelterLat,
                lng: ed.shelterLng,
                distanceMeters: ed.distanceMeters,
                bearingDegrees: ed.bearingDegrees,
                direction: ed.direction,
              },
              ed.alertHeadline,
            );
          } else if (first?.campaignId !== 'emergency') {
            const emergStore = useEmergencyStore.getState();
            if (emergStore.isAlertActive && emergStore.alertTimestamp && Date.now() - emergStore.alertTimestamp > 600_000) {
              emergStore.clearAlert();
            }
          }
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
      })
      .catch((e) => {
        clearTimeout(timeoutId);
        if (e?.name === 'AbortError') {
          logger.warn('Ad-selection ranked timeout (e.g. on cellular) – will retry next poll');
          lastAdFetchTimeRef.current = 0;
        }
        logger.error('Ad-selection ranked error', e);
      });
  }, [lat, lng, geohash, isSimulated, setInstructions, enqueue, getQueue, dequeue]);

  // When user has moved significantly from where we last got a successful ranked result, trigger an immediate ranked fetch so new nearby businesses appear (e.g. after walking/driving on cellular when some requests had failed).
  useEffect(() => {
    if (lat == null || lng == null || isSimulated) return;
    const lastLat = lastSuccessfulRankedLatRef.current;
    const lastLng = lastSuccessfulRankedLngRef.current;
    if (lastLat == null || lastLng == null) return;
    const moved = haversineMeters(lat, lng, lastLat, lastLng);
    if (moved >= MOVE_THRESHOLD_FOR_REFRESH_M) {
      lastAdFetchTimeRef.current = 0;
      requestRefresh();
    }
  }, [lat, lng, isSimulated, requestRefresh]);

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
  // Only use "last" when ranked hasn't responded recently (e.g. cellular failures) to avoid flip-flopping.
  const driverIdForLast = isSimulated ? SIMULATOR_DRIVER_ID : 'driver-1';
  useEffect(() => {
    const fetchLast = () => {
      const currentSource = useAdStore.getState().adSource;
      const timeSinceRanked = Date.now() - lastAdFetchTimeRef.current;
      if (currentSource === 'ranked' && timeSinceRanked < 30_000) return;

      fetch(`${API_BASE}/ad-selection/last/${encodeURIComponent(driverIdForLast)}`, {
        headers: apiHeaders({ Accept: 'application/json' }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.instructions?.length) return;
          const rankedStale = Date.now() - lastAdFetchTimeRef.current > 30_000;
          if (!rankedStale && useAdStore.getState().adSource === 'ranked') return;
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

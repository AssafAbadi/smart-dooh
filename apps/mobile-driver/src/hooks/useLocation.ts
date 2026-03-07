import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { requestLocationPermission, startLocationUpdates } from '../services/locationService';
import { useLocationStore } from '../stores/locationStore';
import { useSimulatorStore } from '../stores/simulatorStore';

// Fallback when location permission is denied – Chacho's Cafe Geula (32.0862, 34.7814)
const FALLBACK_LAT = 32.0862;
const FALLBACK_LNG = 34.7814;
const FALLBACK_GEOHASH = 'o-16';
const USE_FALLBACK_WHEN_DENIED = true; // Set to false to see real error (no position set)

function tryRequestPermission(setLocation: (lat: number, lng: number, geohash: string, isFallback?: boolean) => void, cleanupRef: React.MutableRefObject<(() => void) | null>, mounted: () => boolean) {
  requestLocationPermission().then((result) => {
    if (!mounted()) return;
    const { granted, foregroundStatus, backgroundStatus, error } = result;
    console.log('[useLocation] Permission result:', { granted, foregroundStatus, backgroundStatus, error });

    if (granted) {
      startLocationUpdates(setLocation).then((cleanup) => {
        if (mounted()) cleanupRef.current = cleanup;
      });
      return;
    }

    // Permission denied or error – log exact status so we can see real error code
    console.warn('[useLocation] Permission denied or error. foregroundStatus:', foregroundStatus, 'backgroundStatus:', backgroundStatus, 'error:', error);
    if (USE_FALLBACK_WHEN_DENIED) {
      console.log('[useLocation] Using fallback (Chacho\'s):', FALLBACK_LAT, FALLBACK_LNG);
      setLocation(FALLBACK_LAT, FALLBACK_LNG, FALLBACK_GEOHASH, true);
    } else {
      console.log('[useLocation] Fallback disabled – not setting location so you can see the error state.');
    }
  }).catch((e) => {
    console.error('[useLocation] Request failed:', e);
    if (mounted() && USE_FALLBACK_WHEN_DENIED) {
      setLocation(FALLBACK_LAT, FALLBACK_LNG, FALLBACK_GEOHASH, true);
    }
  });
}

export function useLocation() {
  const simulatorMode = useSimulatorStore((s) => s.simulatorMode);
  const { setLocation } = useLocationStore();
  const cleanupRef = useRef<(() => void) | null>(null);
  const retryDoneRef = useRef(false);

  useEffect(() => {
    console.log('[useLocation] Effect running, simulatorMode:', simulatorMode);
    if (simulatorMode) {
      console.log('[useLocation] Simulator mode ON, skipping GPS/fallback');
      return;
    }
    let mounted = true;

    // Log current permission status immediately (exact status from getForegroundPermissionsAsync)
    Location.getForegroundPermissionsAsync().then((r) => {
      console.log('[useLocation] getForegroundPermissionsAsync() at start:', r.status, JSON.stringify(r));
    }).catch((e) => console.warn('[useLocation] getForegroundPermissionsAsync failed:', e));

    tryRequestPermission(setLocation, cleanupRef, () => mounted);

    // Retry once after 2.5s in case the first request ran before the app was fully ready
    const retryTimer = setTimeout(() => {
      if (!mounted || retryDoneRef.current) return;
      retryDoneRef.current = true;
      console.log('[useLocation] Retry: checking permission again');
      tryRequestPermission(setLocation, cleanupRef, () => mounted);
    }, 2500);

    return () => {
      mounted = false;
      clearTimeout(retryTimer);
      cleanupRef.current?.();
    };
  }, [simulatorMode, setLocation]);
}

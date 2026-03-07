import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useLocationStore } from '../stores/locationStore';

const LOCATION_TASK_NAME = 'adrive-background-location';

/** Simple geohash (precision ~5km) for cache/API keys. */
function simpleGeohash(lat: number, lng: number): string {
  const latStr = Math.floor((lat + 90) / 5).toString(36);
  const lngStr = Math.floor((lng + 180) / 5).toString(36);
  return `${latStr}-${lngStr}`;
}

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  (event: { data: { locations: { coords: { latitude: number; longitude: number } }[] }; error: Error | null }) => {
    if (event.error) return;
    const locations = event.data?.locations;
    if (!locations?.length) return;
    const { latitude, longitude } = locations[locations.length - 1].coords;
    useLocationStore.getState().setLocation(latitude, longitude, simpleGeohash(latitude, longitude));
  }
);

export type PermissionResult = { granted: boolean; foregroundStatus?: string; backgroundStatus?: string; error?: string };

export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    console.log('[locationService] getForegroundPermissionsAsync (before request):', current.status, JSON.stringify(current));
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    console.log('[locationService] requestForegroundPermissionsAsync result:', foregroundStatus);
    if (foregroundStatus !== 'granted') {
      return { granted: false, foregroundStatus, backgroundStatus: undefined };
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    console.log('[locationService] requestBackgroundPermissionsAsync result:', bg.status);
    return {
      granted: bg.status === 'granted',
      foregroundStatus,
      backgroundStatus: bg.status,
    };
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.warn('[locationService] Location permission request failed:', msg);
    return { granted: false, error: msg };
  }
}

export async function startLocationUpdates(
  _setLocation: (lat: number, lng: number, geohash: string) => void
): Promise<() => void> {
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 50,
    foregroundService: {
      notificationTitle: 'Adrive',
      notificationBody: 'Updating location for nearby ads.',
    },
  });
  return () => {
    void Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  };
}

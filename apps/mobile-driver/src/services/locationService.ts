import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useLocationStore } from '../stores/locationStore';

const LOCATION_TASK_NAME = 'adrive-background-location';

/** Simple geohash (precision ~5km) for cache/API keys. */
export function simpleGeohash(lat: number, lng: number): string {
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

/** Foreground: watch position so distance updates when you move (e.g. across the house). */
export function startForegroundWatch(
  setLocation: (lat: number, lng: number, geohash: string) => void
): () => void {
  let subscription: { remove: () => void } | null = null;
  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 4000,
      distanceInterval: 5,
    },
    (loc) => {
      const { latitude, longitude } = loc.coords;
      setLocation(latitude, longitude, simpleGeohash(latitude, longitude));
    }
  )
    .then((sub) => {
      subscription = sub;
    })
    .catch((e) => {
      console.warn('[locationService] watchPositionAsync failed', (e as Error)?.message ?? e);
    });
  return () => {
    subscription?.remove();
    subscription = null;
  };
}

/** Watch compass heading so direction arrows follow the phone's orientation. */
export function startHeadingWatch(
  setHeading: (heading: number) => void
): () => void {
  let subscription: { remove: () => void } | null = null;
  Location.watchHeadingAsync((headingData) => {
    if (headingData.trueHeading >= 0) {
      setHeading(headingData.trueHeading);
    } else if (headingData.magHeading >= 0) {
      setHeading(headingData.magHeading);
    }
  })
    .then((sub) => {
      subscription = sub;
    })
    .catch((e) => {
      console.warn('[locationService] watchHeadingAsync failed', (e as Error)?.message ?? e);
    });
  return () => {
    subscription?.remove();
    subscription = null;
  };
}

export async function startLocationUpdates(
  _setLocation: (lat: number, lng: number, geohash: string) => void
): Promise<() => void> {
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    foregroundService: {
      notificationTitle: 'Adrive',
      notificationBody: 'Updating location for nearby ads.',
    },
  });
  return () => {
    void Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  };
}

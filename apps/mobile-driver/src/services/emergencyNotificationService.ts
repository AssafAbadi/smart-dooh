import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { openGoogleMapsNavigation } from './navigationService';
import { useEmergencyStore } from '../stores/emergencyStore';
import { getApiBase, apiHeaders } from './apiClient';
import { logger } from '../utils/logger';

const EMERGENCY_CHANNEL_ID = 'emergency-alerts';

/** Payload from remote EMERGENCY_ALERT push or local notification (may have only shelterLat/shelterLng). */
export interface EmergencyNotificationData {
  type?: 'EMERGENCY_ALERT';
  shelterLat?: number;
  shelterLng?: number;
  shelterAddress?: string;
  headline?: string;
  distanceMeters?: number;
  bearingDegrees?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

/**
 * Fetch shelter for current location from backend. Returns null on any failure.
 */
async function fetchShelterForCurrentLocation(lat: number, lng: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const base = getApiBase().replace(/\/$/, '');
    const res = await fetch(`${base}/emergency/check?lat=${lat}&lng=${lng}`, { headers: apiHeaders() });
    if (!res.ok) return null;
    const raw = await res.json();
    if (raw?.active === true && raw?.shelter && Number.isFinite(raw.shelter.lat) && Number.isFinite(raw.shelter.lng)) {
      return { lat: raw.shelter.lat, lng: raw.shelter.lng };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Apply emergency notification data: set ALERT_ACTIVE in the store (if full payload) and open maps to shelter.
 * Prefers shelter for user's *current* location (from GET /emergency/check) so Maps navigates to the nearest shelter,
 * not the one from the push payload (which for offline drivers may be based on default coords and far away).
 */
export function handleEmergencyNotificationData(data: EmergencyNotificationData): void {
  if (data?.type === 'EMERGENCY_ALERT' && typeof data.shelterAddress === 'string' && typeof data.headline === 'string') {
    const shelter = {
      address: data.shelterAddress,
      lat: typeof data.shelterLat === 'number' ? data.shelterLat : 0,
      lng: typeof data.shelterLng === 'number' ? data.shelterLng : 0,
      distanceMeters: typeof data.distanceMeters === 'number' ? data.distanceMeters : 0,
      bearingDegrees: typeof data.bearingDegrees === 'number' ? data.bearingDegrees : 0,
      direction: (['up', 'down', 'left', 'right'].includes(data.direction ?? '') ? data.direction : 'up') as 'up' | 'down' | 'left' | 'right',
    };
    useEmergencyStore.getState().setAlert(shelter, data.headline);
    logger.info('Set ALERT_ACTIVE from notification tap', { headline: data.headline });
  }

  const payloadLat = data?.shelterLat;
  const payloadLng = data?.shelterLng;
  const fallbackCoords =
    typeof payloadLat === 'number' && typeof payloadLng === 'number' && Number.isFinite(payloadLat) && Number.isFinite(payloadLng)
      ? { lat: payloadLat, lng: payloadLng }
      : null;

  (async () => {
    let coordsToUse = fallbackCoords;
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 15000,
      });
      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const shelterCoords = await fetchShelterForCurrentLocation(lat, lng);
        if (shelterCoords) {
          coordsToUse = shelterCoords;
          logger.info('Using shelter for current location (from /emergency/check)', shelterCoords);
        }
      }
    } catch {
      // use fallback
    }
    if (coordsToUse) {
      openGoogleMapsNavigation(coordsToUse.lat, coordsToUse.lng);
      logger.info('Opened maps from notification', coordsToUse);
    }
  })();
}

/** Async load so we never synchronously require expo-notifications (avoids crash when native module missing). */
async function getNotificationsAsync(): Promise<typeof import('expo-notifications') | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

let inited = false;

/**
 * Call once at app startup to handle notification taps (open maps to shelter, set ALERT_ACTIVE for remote pushes).
 * Uses async import so expo-notifications is never loaded synchronously (avoids crash if native module missing).
 */
export function initEmergencyNotifications(): void {
  if (inited) return;
  getNotificationsAsync()
    .then((Notifications) => {
      if (!Notifications) return;
      inited = true;
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          }),
        });
        Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as EmergencyNotificationData;
          if (data?.type === 'EMERGENCY_ALERT') {
            handleEmergencyNotificationData(data);
          } else {
            const lat = data?.shelterLat;
            const lng = data?.shelterLng;
            if (typeof lat === 'number' && typeof lng === 'number') {
              openGoogleMapsNavigation(lat, lng);
              logger.info('Opened maps from notification tap', { lat, lng });
            }
          }
        });
      } catch {
        /* ignore */
      }
    })
    .catch(() => {});
}

/**
 * Call on app mount to handle cold start: user tapped a notification while app was killed.
 * If the last notification was EMERGENCY_ALERT, restore alert state and open maps.
 */
export async function handleLastNotificationResponseIfEmergency(): Promise<void> {
  const Notifications = await getNotificationsAsync();
  if (!Notifications) return;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    const data = response?.notification?.request?.content?.data as EmergencyNotificationData | undefined;
    if (data?.type === 'EMERGENCY_ALERT') {
      handleEmergencyNotificationData(data);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Show a local notification for the missile alert. No-op if native module unavailable.
 */
export async function scheduleEmergencyAlert(
  shelterLat: number,
  shelterLng: number,
  headline: string,
): Promise<void> {
  const Notifications = await getNotificationsAsync();
  if (!Notifications) return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let hasPermission = existing === 'granted';
    if (!hasPermission) {
      const { status } = await Notifications.requestPermissionsAsync();
      hasPermission = status === 'granted';
    }
    if (!hasPermission) return;

    if (typeof shelterLat !== 'number' || typeof shelterLng !== 'number' || !Number.isFinite(shelterLat) || !Number.isFinite(shelterLng)) {
      return;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      } catch {
        /* ignore */
      }
    }

    const title = 'Missile Alert';
    const body = headline ? `${headline} – Tap to open navigation to shelter` : 'Tap to open navigation to shelter';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { shelterLat, shelterLng },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        channelId: EMERGENCY_CHANNEL_ID,
      },
      trigger: null,
    });
    logger.info('Scheduled emergency notification', { shelterLat, shelterLng });
  } catch {
    /* ignore */
  }
}

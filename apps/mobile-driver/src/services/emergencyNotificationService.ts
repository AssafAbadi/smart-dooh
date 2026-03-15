import { Platform } from 'react-native';
import { openGoogleMapsNavigation } from './navigationService';
import { logger } from '../utils/logger';

const EMERGENCY_CHANNEL_ID = 'emergency-alerts';

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
 * Call once at app startup to handle notification taps (open maps to shelter).
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
          const data = response.notification.request.content.data as { shelterLat?: number; shelterLng?: number };
          const lat = data?.shelterLat;
          const lng = data?.shelterLng;
          if (typeof lat === 'number' && typeof lng === 'number') {
            openGoogleMapsNavigation(lat, lng);
            logger.info('Opened maps from notification tap', { lat, lng });
          }
        });
      } catch {
        /* ignore */
      }
    })
    .catch(() => {});
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

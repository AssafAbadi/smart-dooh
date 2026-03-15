import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { getApiBase, apiHeaders } from './apiClient';
import { logger } from '../utils/logger';

/**
 * Request notification permissions and return whether they are granted.
 */
export async function requestPushPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    if (!granted) {
      logger.warn('Push notification permission denied');
    }
    return granted;
  } catch (e) {
    logger.error('Failed to request push permissions', e);
    return false;
  }
}

const EXPO_TOKEN_RETRY_DELAY_MS = 2000;
const EXPO_TOKEN_MAX_RETRIES = 2;

function isExpoServiceUnavailable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('503') || msg.includes('SERVICE_UNAVAILABLE') || msg.includes('temporarily unavailable');
}

/**
 * Get the Expo push token for this device. Requires notification permissions.
 * Uses projectId from app.json extra.eas.projectId or EXPO_PUBLIC_EAS_PROJECT_ID env.
 * Retries on 503 (Expo server overload) to avoid treating transient errors as hard failures.
 */
export async function getExpoPushTokenAsync(): Promise<string | null> {
  const hasPermission = await requestPushPermissions();
  if (!hasPermission) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId || typeof projectId !== 'string') {
    logger.warn('No EAS projectId found; push token may be invalid in production');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= EXPO_TOKEN_MAX_RETRIES; attempt++) {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId ?? undefined,
      });
      const token = tokenData?.data ?? null;
      if (token) {
        logger.info('Expo push token obtained', { tokenPreview: token.slice(0, 25) + '...' });
        return token;
      }
      return null;
    } catch (e) {
      lastError = e;
      if (attempt < EXPO_TOKEN_MAX_RETRIES && isExpoServiceUnavailable(e)) {
        logger.warn('Expo push token temporarily unavailable (503), retrying...', { attempt: attempt + 1 });
        await new Promise((r) => setTimeout(r, EXPO_TOKEN_RETRY_DELAY_MS));
      } else {
        break;
      }
    }
  }
  if (isExpoServiceUnavailable(lastError)) {
    logger.warn('Expo push token unavailable after retries (Expo server may be overloaded); try again later.', lastError);
  } else {
    logger.error('Failed to get Expo push token', lastError);
  }
  return null;
}

/**
 * Register the current device's push token with the backend for the given driver.
 * Idempotent: safe to call on every app open. No-op if permissions denied or token unavailable.
 */
export async function registerPushToken(driverId: string): Promise<void> {
  const token = await getExpoPushTokenAsync();
  if (!token) return;

  const apiBase = getApiBase();
  const url = `${apiBase.replace(/\/$/, '')}/drivers/push-token`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ driverId, pushToken: token }),
    });
    if (!res.ok) {
      logger.warn('Push token registration failed', { status: res.status, driverId });
      return;
    }
    logger.info('Push token registered', { driverId });
  } catch (e) {
    logger.error('Push token registration request failed', e);
  }
}

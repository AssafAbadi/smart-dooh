import { Linking, Platform } from 'react-native';
import { logger } from '../utils/logger';

/** Google Maps: universal (Android + some iOS). mode=d = driving. */
const GOOGLE_NAV_SCHEME = 'google.navigation';
/** Google Maps iOS app: use this first on iOS for reliable driving directions. */
const GOOGLE_MAPS_IOS_SCHEME = 'comgooglemaps://';
/** Apple Maps: directions by car (dirflg=d). */
const APPLE_MAPS_BASE = 'https://maps.apple.com/?';

/** Reasonable bounds so we don't open Maps to 0,0 or invalid coords. */
function isValidDestination(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Opens maps with turn-by-turn driving navigation to the given coordinates.
 * Tries Google Maps first (on iOS: comgooglemaps:// then google.navigation:); then Apple Maps on iOS.
 * All URLs use driving mode (not walking).
 */
export async function openGoogleMapsNavigation(lat: number, lng: number): Promise<void> {
  if (!isValidDestination(lat, lng)) {
    logger.warn('Maps navigation skipped: invalid coordinates', { lat, lng });
    return;
  }
  const openUrl = async (url: string): Promise<boolean> => {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  };

  try {
    if (Platform.OS === 'ios') {
      // iOS: try Google Maps app first (most reliable for driving).
      const googleIosUrl = `${GOOGLE_MAPS_IOS_SCHEME}?saddr=&daddr=${lat},${lng}&directionsmode=driving`;
      if (await openUrl(googleIosUrl)) {
        logger.info('Opened Google Maps (iOS app) driving navigation', { lat, lng });
        return;
      }
    }

    // Universal Google Maps URL (Android; also works on some iOS).
    const googleNavUrl = `${GOOGLE_NAV_SCHEME}:q=${lat},${lng}&mode=d`;
    let canOpen = false;
    try {
      canOpen = await Linking.canOpenURL(googleNavUrl);
    } catch {
      /* ignore */
    }
    if (canOpen && (await openUrl(googleNavUrl))) {
      logger.info('Opened Google Maps navigation', { lat, lng });
      return;
    }
    if (await openUrl(googleNavUrl)) {
      logger.info('Opened Google Maps navigation (fallback)', { lat, lng });
      return;
    }

    if (Platform.OS === 'ios') {
      const appleUrl = `${APPLE_MAPS_BASE}dirflg=d&daddr=${lat},${lng}`;
      if (await openUrl(appleUrl)) {
        logger.info('Opened Apple Maps driving navigation (fallback)', { lat, lng });
        return;
      }
      logger.warn('Failed to open Apple Maps navigation');
      return;
    }
    logger.warn('Google Maps navigation not available', { url: googleNavUrl });
  } catch (e) {
    logger.warn('Failed to open maps navigation', e);
  }
}

import { Linking, Platform } from 'react-native';
import { logger } from '../utils/logger';

const GOOGLE_NAV_SCHEME = 'google.navigation';
/** Apple Maps: directions to a place (lat,lng). */
const APPLE_MAPS_DIRECTIONS = 'https://maps.apple.com/?daddr=';

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
 * Opens Google Maps with turn-by-turn driving navigation to the given coordinates.
 * Falls back to opening the URL even when canOpenURL is false (Android/iOS often block
 * querying custom schemes). On iOS, falls back to Apple Maps if Google Maps fails.
 */
export async function openGoogleMapsNavigation(lat: number, lng: number): Promise<void> {
  if (!isValidDestination(lat, lng)) {
    logger.warn('Google Maps navigation skipped: invalid coordinates', { lat, lng });
    return;
  }
  const url = `${GOOGLE_NAV_SCHEME}:q=${lat},${lng}&mode=d`;
  try {
    let canOpen = false;
    try {
      canOpen = await Linking.canOpenURL(url);
    } catch {
      // canOpenURL can throw on some devices; proceed to try openURL
    }
    if (canOpen) {
      await Linking.openURL(url);
      logger.info('Opened Google Maps navigation', { lat, lng });
      return;
    }
    // Try openURL anyway – canOpenURL often returns false for custom schemes even when the app is installed.
    try {
      await Linking.openURL(url);
      logger.info('Opened Google Maps navigation (openURL fallback)', { lat, lng });
      return;
    } catch {
      // Google Maps URL failed
    }
    // iOS: fallback to Apple Maps directions
    if (Platform.OS === 'ios') {
      const appleUrl = `${APPLE_MAPS_DIRECTIONS}${lat},${lng}`;
      try {
        await Linking.openURL(appleUrl);
        logger.info('Opened Apple Maps navigation (fallback)', { lat, lng });
      } catch (e2) {
        logger.warn('Failed to open Apple Maps navigation', e2);
      }
      return;
    }
    logger.warn('Google Maps navigation URL not supported and openURL failed', { url });
  } catch (e) {
    logger.warn('Failed to open Google Maps navigation', e);
  }
}

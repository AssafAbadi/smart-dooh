import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useEmergencyStore } from '../stores/emergencyStore';
import { useLocationStore } from '../stores/locationStore';
import { getNearestCachedShelter } from '../services/shelterCache';
import { openGoogleMapsNavigation } from '../services/navigationService';
import { haversineMeters, bearingDegrees, bearingToDirection, relativeDirection, type DirectionArrow } from '@smart-dooh/shared-geo';

const NAVIGATION_DELAY_MS = 2000;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const ARROW_MAP: Record<DirectionArrow, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export function EmergencyOverlay() {
  const { isAlertActive, shelter, alertHeadline, updateShelterDistance } = useEmergencyStore();
  const { lat, lng, heading } = useLocationStore();
  const [liveDistance, setLiveDistance] = useState<number | null>(null);
  const [liveDirection, setLiveDirection] = useState<DirectionArrow>('up');
  const [displayAddress, setDisplayAddress] = useState<string>('');
  const navigationTriggeredRef = useRef(false);

  // 2s after overlay is shown, open Google Maps driving navigation to shelter (once per alert).
  // Depend only on shelter location (lat/lng), not the whole shelter object, so we don't re-run
  // every second when updateShelterDistance() updates distance/bearing (new object ref).
  const shelterNavLat = shelter?.lat ?? null;
  const shelterNavLng = shelter?.lng ?? null;
  useEffect(() => {
    if (!isAlertActive || shelter == null || shelterNavLat == null || shelterNavLng == null) {
      navigationTriggeredRef.current = false;
      return;
    }
    if (navigationTriggeredRef.current) return;
    const timeoutId = setTimeout(() => {
      navigationTriggeredRef.current = true;
      let navLat = shelterNavLat;
      let navLng = shelterNavLng;
      if (navLat === 0 && navLng === 0 && lat != null && lng != null) {
        const cached = getNearestCachedShelter(lat, lng);
        if (cached) {
          navLat = cached.lat;
          navLng = cached.lng;
        }
      }
      openGoogleMapsNavigation(navLat, navLng);
    }, NAVIGATION_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [isAlertActive, shelterNavLat, shelterNavLng, lat, lng]);

  // Depend only on primitive values that identify the shelter location, not the whole
  // shelter object. Otherwise updateShelterDistance() would change shelter reference
  // and re-trigger this effect → infinite loop.
  const shelterLat = shelter?.lat ?? 0;
  const shelterLng = shelter?.lng ?? 0;
  const shelterAddress = shelter?.address ?? '';

  useEffect(() => {
    if (!isAlertActive || !shelter) return;

    let resolvedLat = shelterLat;
    let resolvedLng = shelterLng;
    let resolvedAddr = shelterAddress;

    if (resolvedLat === 0 && resolvedLng === 0 && lat != null && lng != null) {
      const cached = getNearestCachedShelter(lat, lng);
      if (cached) {
        resolvedLat = cached.lat;
        resolvedLng = cached.lng;
        resolvedAddr = cached.address;
      }
    }

    setDisplayAddress(resolvedAddr);

    function tick() {
      if (lat == null || lng == null) return;
      const dist = haversineMeters(lat, lng, resolvedLat, resolvedLng);
      const dir: DirectionArrow =
        heading != null
          ? relativeDirection(lat, lng, resolvedLat, resolvedLng, heading)
          : bearingToDirection(bearingDegrees(lat, lng, resolvedLat, resolvedLng));
      const bearing = bearingDegrees(lat, lng, resolvedLat, resolvedLng);
      setLiveDistance(Math.round(dist));
      setLiveDirection(dir);
      updateShelterDistance(Math.round(dist), Math.round(bearing), dir);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shelter identity via primitives only
  }, [isAlertActive, shelterLat, shelterLng, shelterAddress, lat, lng, heading]);

  const openNavigation = useCallback(() => {
    let navLat = shelter?.lat ?? 0;
    let navLng = shelter?.lng ?? 0;
    if ((navLat === 0 && navLng === 0) && lat != null && lng != null) {
      const cached = getNearestCachedShelter(lat, lng);
      if (cached) {
        navLat = cached.lat;
        navLng = cached.lng;
      }
    }
    openGoogleMapsNavigation(navLat, navLng);
  }, [shelter?.lat, shelter?.lng, lat, lng]);

  if (!isAlertActive || !shelter) return null;

  const displayDistance = liveDistance ?? shelter.distanceMeters;
  const arrowChar = ARROW_MAP[liveDirection];

  return (
    <View style={styles.container}>
      <View style={styles.topBand}>
        <Text style={styles.alertType}>MISSILE ALERT</Text>
        <Text style={styles.alertTypeHe}>אזעקת טילים</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>
          {alertHeadline ?? 'EMERGENCY ALERT'}
        </Text>

        <Text style={styles.arrow}>{arrowChar}</Text>

        <Text style={styles.shelterLabel}>NEAREST SHELTER</Text>
        <Text style={styles.shelterAddress}>{displayAddress || shelter.address}</Text>

        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {displayDistance != null ? `${displayDistance}m` : '---'}
          </Text>
          <Text style={styles.distanceSubtext}>straight-line</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]} onPress={openNavigation}>
          <Text style={styles.navButtonText}>Navigate to Shelter</Text>
        </Pressable>

        <Text style={styles.instruction}>
          Head {liveDirection === 'up' ? 'forward' : liveDirection === 'down' ? 'behind you' : liveDirection} to the nearest shelter
        </Text>
      </View>

      <View style={styles.bottomBand}>
        <Text style={styles.bottomText}>Stay safe. Move to shelter immediately.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: 9999,
    backgroundColor: '#CC0000',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBand: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#990000',
    alignItems: 'center',
  },
  alertType: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 3,
  },
  alertTypeHe: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 120,
    fontWeight: '900',
    lineHeight: 130,
    textAlign: 'center',
  },
  shelterLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 20,
  },
  shelterAddress: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  distanceBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginVertical: 12,
  },
  distanceText: {
    color: '#1a1a1a',
    fontSize: 36,
    fontWeight: '900',
  },
  distanceSubtext: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  navButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 20,
    minWidth: 280,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  navButtonPressed: {
    opacity: 0.9,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  instruction: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 32,
  },
  bottomBand: {
    width: '100%',
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#990000',
    alignItems: 'center',
  },
  bottomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

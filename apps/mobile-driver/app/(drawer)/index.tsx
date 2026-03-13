import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocationStore } from '../../src/stores/locationStore';
import { useAdStore } from '../../src/stores/adStore';
import { useSimulatorStore, SIMULATOR_DRIVER_ID } from '../../src/stores/simulatorStore';
import { useDriverBalance } from '../../src/hooks/useDriverBalance';
import { AdSlot } from '../../src/components/AdSlot';
import { colors } from '../../src/theme/colors';

const DEFAULT_DRIVER_ID = 'driver-1';
const LIVE_DISTANCE_INTERVAL_MS = 5000;

/** Approximate distance in meters between two WGS84 points (haversine). */
function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export default function HomeScreen() {
  const { lat, lng, isSimulated } = useLocationStore();
  const { simulatorMode } = useSimulatorStore();
  const driverId = simulatorMode ? SIMULATOR_DRIVER_ID : DEFAULT_DRIVER_ID;
  const { balance, refetch } = useDriverBalance(driverId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  const { instructions, adSource } = useAdStore();
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({
    DISTANCE: '—',
    TIME_LEFT: '—',
    COUPON_CODE: '—',
  });
  const isOnline = lat != null && lng != null;
  const slot1 = instructions[0] ?? null;

  // Set COUPON_CODE and initial DISTANCE when instruction or location changes
  useEffect(() => {
    const inst = instructions[0];
    if (!inst) return;
    setPlaceholders((p) => {
      let DISTANCE = p.DISTANCE;
      if (lat != null && lng != null && inst.businessLat != null && inst.businessLng != null) {
        DISTANCE = formatDistance(distanceMeters(lat, lng, inst.businessLat, inst.businessLng));
      } else if (inst.distanceMeters != null) {
        DISTANCE = formatDistance(inst.distanceMeters);
      }
      return {
        ...p,
        DISTANCE,
        TIME_LEFT: '45 min',
        COUPON_CODE: inst.couponCode ?? '—',
      };
    });
  }, [lat, lng, instructions]);

  // Every 5s refresh distance from phone to current ad's business for live updates
  useEffect(() => {
    function tick() {
      const inst = instructions[0];
      if (lat == null || lng == null || inst?.businessLat == null || inst?.businessLng == null) return;
      const m = distanceMeters(lat, lng, inst.businessLat, inst.businessLng);
      setPlaceholders((p) => ({ ...p, DISTANCE: formatDistance(m) }));
    }
    const id = setInterval(tick, LIVE_DISTANCE_INTERVAL_MS);
    tick();
    return () => clearInterval(id);
  }, [lat, lng, instructions]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
          <Text style={styles.badgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
        {isSimulated && (
          <Text style={styles.hint}>Simulator mode – position from PC drive</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Current ad</Text>
        {adSource === 'ranked' && (
          <Text style={styles.adSourceHint}>From your location (nearby)</Text>
        )}
        {adSource === 'last' && (
          <Text style={styles.adSourceHint}>From display (synced)</Text>
        )}
        <View style={styles.slotWrap}>
          <AdSlot instruction={slot1} placeholders={placeholders} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Current balance</Text>
        <Text style={styles.amount}>
          {balance != null ? `₪${balance.toFixed(2)}` : '—'}
        </Text>
        <Text style={styles.hint}>Payouts and history in Earnings & Payments</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeOnline: {
    backgroundColor: 'rgba(0,180,0,0.2)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  badgeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
    marginVertical: 4,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  adSourceHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  slotWrap: {
    marginTop: 4,
  },
});
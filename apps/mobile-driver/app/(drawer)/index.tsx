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

  useEffect(() => {
    if (lat != null && lng != null) {
      setPlaceholders((p) => ({
        ...p,
        DISTANCE: '300m',
        TIME_LEFT: '45 min',
        COUPON_CODE: instructions[0]?.couponCode ?? '—',
      }));
    }
  }, [lat, lng, instructions]);

  const slot1 = instructions[0] ?? null;

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
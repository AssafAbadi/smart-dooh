import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSimulatorStore, SIMULATOR_DRIVER_ID } from '../../src/stores/simulatorStore';
import { useAuthDriverId } from '../../src/hooks/useAuthDriverId';
import { useDriverTotalEarnings } from '../../src/hooks/useDriverEarnings';
import { colors } from '../../src/theme/colors';

const DEFAULT_DRIVER_ID = 'driver-1';

export default function EarningsScreen() {
  const { simulatorMode } = useSimulatorStore();
  const authDriverId = useAuthDriverId();
  const driverId = simulatorMode ? SIMULATOR_DRIVER_ID : (authDriverId ?? DEFAULT_DRIVER_ID);
  const { earnings: totalEarnings, loading, error, refetch } = useDriverTotalEarnings(driverId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.card}>
        <Text style={styles.label}>Total earnings</Text>
        <Text style={styles.amount}>
          {loading ? '…' : error ? error : totalEarnings != null ? `₪${totalEarnings.toFixed(2)}` : '—'}
        </Text>
        <Text style={styles.hint}>All-time earnings from impressions</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Payout history</Text>
        <Text style={styles.hint}>Historical payouts and statements in a future release.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  amount: { color: colors.text, fontSize: 22, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});

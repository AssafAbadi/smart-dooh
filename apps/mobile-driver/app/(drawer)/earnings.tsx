import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSimulatorStore, SIMULATOR_DRIVER_ID } from '../../src/stores/simulatorStore';
import { useDriverBalance } from '../../src/hooks/useDriverBalance';
import { colors } from '../../src/theme/colors';

const DEFAULT_DRIVER_ID = 'driver-1';

export default function EarningsScreen() {
  const { simulatorMode } = useSimulatorStore();
  const driverId = simulatorMode ? SIMULATOR_DRIVER_ID : DEFAULT_DRIVER_ID;
  const { balance, loading, error, refetch } = useDriverBalance(driverId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.card}>
        <Text style={styles.label}>Current balance</Text>
        <Text style={styles.amount}>
          {loading ? '…' : error ? error : balance != null ? `₪${balance.toFixed(2)}` : '—'}
        </Text>
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
  hint: { color: colors.textMuted, fontSize: 12 },
});

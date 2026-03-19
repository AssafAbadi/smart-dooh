import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSimulatorStore, SIMULATOR_DRIVER_ID } from '../../src/stores/simulatorStore';
import { useDriverPreferences } from '../../src/hooks/useDriverPreferences';
import { colors } from '../../src/theme/colors';

function FilterRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function PreferencesScreen() {
  const { simulatorMode } = useSimulatorStore();
  const driverId = simulatorMode ? SIMULATOR_DRIVER_ID : 'driver-1';
  const { preferences, loading, saving, saveError, updatePref, refetch } = useDriverPreferences(driverId, {
    syncToBothDrivers: true,
    useMeApi: !simulatorMode,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.intro}>
        Only ads for places matching your choices are shown. Changes apply to both normal and simulator mode.
      </Text>
      {saveError ? (
        <Text style={styles.error}>Couldn&apos;t save: {saveError}. Open this screen again to retry.</Text>
      ) : null}
      {loading ? (
        <Text style={styles.hint}>Loading…</Text>
      ) : (
        <View style={styles.filterCard}>
          <FilterRow label="Vegan only" value={preferences.pref_veganOnly} onValueChange={(v) => updatePref('pref_veganOnly', v)} />
          <FilterRow label="Vegetarian only" value={preferences.pref_vegetarianOnly} onValueChange={(v) => updatePref('pref_vegetarianOnly', v)} />
          <FilterRow label="Kosher only" value={preferences.pref_kosherOnly} onValueChange={(v) => updatePref('pref_kosherOnly', v)} />
          <FilterRow label="Unkosher only" value={preferences.pref_unkosherOnly} onValueChange={(v) => updatePref('pref_unkosherOnly', v)} />
          <FilterRow label="No alcohol" value={preferences.pref_noAlcohol} onValueChange={(v) => updatePref('pref_noAlcohol', v)} />
          <FilterRow label="No gambling" value={preferences.pref_noGambling} onValueChange={(v) => updatePref('pref_noGambling', v)} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: 20, paddingBottom: 32 },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
  },
  hint: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
  error: { color: colors.accent, fontSize: 13, marginBottom: 12 },
  filterCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 24,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGlass,
  },
  filterLabel: { color: colors.text, fontSize: 16, fontWeight: '500' },
});

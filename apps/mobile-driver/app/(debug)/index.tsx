import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../src/components/Header';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useLocationStore } from '../../src/stores/locationStore';
import { useDeviceStore } from '../../src/stores/deviceStore';
import { useAdStore } from '../../src/stores/adStore';
import { useSimulatorStore } from '../../src/stores/simulatorStore';
import { getApiBase } from '../../src/services/apiClient';
import { colors } from '../../src/theme/colors';

export default function DebugScreen() {
  const router = useRouter();
  const { lat, lng, geohash, isSimulated } = useLocationStore();
  const { uniqueCount } = useDeviceStore();
  const { instructions } = useAdStore();
  const { simulatorMode, setSimulatorMode } = useSimulatorStore();

  return (
    <View style={styles.container}>
      <Header title="Admin Room" showBack onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.sectionLabel}>Simulator (Tel Aviv drive)</Text>
        <Text style={styles.dataRow}>
          When ON, the app uses position from the mock-driver-simulator running on your PC. Run: cd apps/mock-driver-simulator and npm run run
        </Text>
        <PrimaryButton
          title={simulatorMode ? 'Turn off simulator mode' : 'Start simulator mode (use PC drive)'}
          variant={simulatorMode ? 'secondary' : 'primary'}
          onPress={() => setSimulatorMode(!simulatorMode)}
        />
        <Text style={[styles.dataRow, { marginTop: 8 }]}>
          Status: {simulatorMode ? 'ON – ads follow simulated route' : 'OFF'}
        </Text>
        <Text style={styles.dataRow}>Ad filters: set in menu → Preferences & Filters</Text>

        <Text style={styles.sectionLabel}>Design / Highlight</Text>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapLabel}>Map (geofence)</Text>
          <View style={styles.geofence} />
        </View>
        <View style={styles.dataRows}>
          <Text style={styles.dataRow}>Location: {lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—'} {isSimulated ? '(simulated)' : ''}</Text>
          <Text style={styles.dataRow}>Geohash: {geohash ?? '—'}</Text>
          <Text style={styles.dataRow}>Unique devices: {uniqueCount}</Text>
          <Text style={styles.dataRow}>Ad Visual: {instructions.length} active</Text>
          <Text style={styles.dataRow}>API base (ranked/ads): {getApiBase()}</Text>
          <Text style={[styles.dataRow, { marginTop: 4, fontSize: 11 }]}>
            If this is localhost or 192.168.x, ads will not update on cellular. Use ngrok in apps/mobile-driver/.env and run Expo from that folder; try --clear if wrong.
          </Text>
        </View>
        <Text style={styles.sectionLabel}>Stats</Text>
        <View style={styles.chartPlaceholder}>
          <View style={styles.bar} />
          <View style={[styles.bar, styles.barShort]} />
          <View style={[styles.bar, styles.barMid]} />
          <View style={styles.bar} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    color: colors.industrialRed,
    fontSize: 12,
    marginBottom: 8,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapLabel: {
    color: colors.textMuted,
    padding: 8,
    fontSize: 12,
  },
  geofence: {
    position: 'absolute',
    top: 40,
    left: 40,
    width: 120,
    height: 100,
    borderWidth: 3,
    borderColor: colors.industrialRed,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  dataRows: {
    marginBottom: 16,
  },
  dataRow: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  chartPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  bar: {
    width: 24,
    height: 60,
    backgroundColor: colors.industrialRed,
    borderRadius: 4,
  },
  barShort: {
    height: 30,
  },
  barMid: {
    height: 45,
  },
});

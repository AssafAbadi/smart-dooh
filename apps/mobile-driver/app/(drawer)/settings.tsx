import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.card}>
        <Text style={styles.label}>Notifications</Text>
        <Text style={styles.hint}>Notification preferences in a future release.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Language</Text>
        <Text style={styles.value}>English</Text>
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
  value: { color: colors.text, fontSize: 16 },
  hint: { color: colors.textMuted, fontSize: 12 },
});

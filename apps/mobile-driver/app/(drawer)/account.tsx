import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function AccountScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.card}>
        <Text style={styles.label}>Profile</Text>
        <Text style={styles.value}>Driver account</Text>
        <Text style={styles.hint}>Profile details and documentation in a future release.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Vehicle</Text>
        <Text style={styles.value}>—</Text>
        <Text style={styles.hint}>Vehicle info and documents.</Text>
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
  value: { color: colors.text, fontSize: 16, marginBottom: 4 },
  hint: { color: colors.textMuted, fontSize: 12 },
});

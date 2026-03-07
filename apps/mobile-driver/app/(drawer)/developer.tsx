import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors } from '../../src/theme/colors';

export default function DeveloperScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Simulator mode and debug tools.</Text>
      <PrimaryButton
        title="Open Admin Room"
        onPress={() => router.push('/(debug)')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
});

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../src/theme/colors';
import { getAuthTokenKey } from '../src/services/apiClient';
import { decodeJwtPayload } from '../src/services/authHelpers';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    SecureStore.getItemAsync(getAuthTokenKey()).then((token) => {
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const payload = decodeJwtPayload(token);
      if (payload?.isVerified === false) {
        router.replace('/(auth)/email-verification');
        return;
      }
      router.replace('/(drawer)');
    });
  }, [router]);

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../src/theme/colors';

const AUTH_TOKEN_KEY = 'adrive_auth_token';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    SecureStore.getItemAsync(AUTH_TOKEN_KEY).then((token) => {
      if (token) {
        router.replace('/(drawer)');
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, [router]);

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.industrialRed} />
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

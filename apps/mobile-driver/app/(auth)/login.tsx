import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors } from '../../src/theme/colors';
import { getApiBase, apiHeaders, getAuthTokenKey } from '../../src/services/apiClient';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/login`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
          Alert.alert(
            'Email not verified',
            'Please verify your email first. You can request a new code from the verification screen.',
            [
              { text: 'OK', onPress: () => router.replace({ pathname: '/(auth)/email-verification', params: { email: email.trim() } }) },
            ],
          );
          return;
        }
        Alert.alert('Error', data?.message ?? 'Sign in failed. Please try again.');
        return;
      }
      const token = data?.accessToken;
      if (!token) {
        Alert.alert('Error', 'Invalid response from server.');
        return;
      }
      await SecureStore.setItemAsync(getAuthTokenKey(), token);
      Alert.alert('Success', 'You are signed in.');
      router.replace('/(drawer)');
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Adrive</Text>
      <Text style={styles.subtitle}>Driver app</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <PrimaryButton title="Sign in" onPress={handleLogin} />
      )}
      <View style={styles.secondaryButtonWrap}>
        <PrimaryButton
          title="Create account"
          variant="secondary"
          onPress={() => router.push('/(auth)/signup')}
        />
      </View>
      <PrimaryButton
        title="Forgot password?"
        variant="secondary"
        onPress={() => router.push('/(auth)/forgot-password')}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    color: colors.text,
    marginBottom: 16,
  },
  loader: {
    marginVertical: 16,
  },
  secondaryButtonWrap: {
    marginTop: 10,
  },
});

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

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/signup`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 409
            ? 'An account with this email already exists. Sign in or use a different email.'
            : (data?.message ?? 'Sign up failed. Please try again.');
        Alert.alert('Error', message);
        return;
      }
      const token = data?.accessToken;
      if (!token) {
        Alert.alert('Error', 'Invalid response from server.');
        return;
      }
      await SecureStore.setItemAsync(getAuthTokenKey(), token);
      Alert.alert(
        'Success',
        'Verification code sent to your email. Enter it on the next screen.',
        [{ text: 'OK', onPress: () => router.replace({ pathname: '/(auth)/email-verification', params: { email: email.trim() } }) }],
      );
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
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>We’ll send a verification code to your email.</Text>
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
        placeholder="Password (min 8 characters)"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <PrimaryButton title="Sign up" onPress={handleSignup} />
      )}
      <View style={styles.secondaryButtonWrap}>
        <PrimaryButton
          title="Back to sign in"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
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

import { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { OtpInput } from '../../src/components/OtpInput';
import { colors } from '../../src/theme/colors';
import { getApiBase, apiHeaders, getAuthTokenKey } from '../../src/services/apiClient';
import { decodeJwtPayload } from '../../src/services/authHelpers';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params?.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (email) return;
    SecureStore.getItemAsync(getAuthTokenKey()).then((token) => {
      if (token) {
        const payload = decodeJwtPayload(token);
        if (payload?.email) setEmail(payload.email);
      }
    });
  }, []);

  const handleVerify = async () => {
    if (!email.trim() || code.length !== 6) {
      Alert.alert('Error', 'Please enter your email and the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/verify-email`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data?.message ?? 'Invalid or expired code. Request a new one.');
        return;
      }
      const token = data?.accessToken;
      if (!token) {
        Alert.alert('Error', 'Invalid response from server.');
        return;
      }
      await SecureStore.setItemAsync(getAuthTokenKey(), token);
      Alert.alert('Success', 'Your email is verified. You can use the app now.');
      router.replace('/(drawer)');
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email first.');
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/resend-verification`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: email.trim() }),
      });
      await res.json().catch(() => ({}));
      Alert.alert('Success', 'If the account exists and is unverified, a new code was sent to your email.');
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code we sent to your email.</Text>
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
      <View style={styles.otpWrap}>
        <OtpInput value={code} onChange={setCode} editable={!loading} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <PrimaryButton title="Verify" onPress={handleVerify} />
      )}
      {resendLoading ? (
        <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
      ) : (
        <PrimaryButton title="Resend code" variant="secondary" onPress={handleResend} />
      )}
      <PrimaryButton title="Back to sign in" variant="secondary" onPress={() => router.replace('/(auth)/login')} />
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
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    color: colors.text,
    marginBottom: 24,
  },
  otpWrap: {
    marginBottom: 24,
  },
  loader: {
    marginVertical: 16,
  },
});

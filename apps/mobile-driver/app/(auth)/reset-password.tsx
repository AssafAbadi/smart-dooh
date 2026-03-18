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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { OtpInput } from '../../src/components/OtpInput';
import { colors } from '../../src/theme/colors';
import { getApiBase, apiHeaders } from '../../src/services/apiClient';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || code.length !== 6 || !newPassword) {
      Alert.alert('Error', 'Please enter email, the 6-digit code, and a new password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          email: email.trim(),
          code,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data?.message ?? 'Invalid or expired code. Request a new one.');
        return;
      }
      Alert.alert('Success', 'Password has been reset. You can sign in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
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
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Enter the code from your email and choose a new password.</Text>
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
      <TextInput
        style={styles.input}
        placeholder="New password (min 8 characters)"
        placeholderTextColor={colors.textMuted}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        editable={!loading}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <PrimaryButton title="Reset password" onPress={handleSubmit} />
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
    marginBottom: 16,
  },
  otpWrap: {
    marginBottom: 24,
  },
  loader: {
    marginVertical: 16,
  },
});

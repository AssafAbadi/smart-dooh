import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../src/sentry';
import { colors } from '../src/theme/colors';

import { getApiBase } from '../src/services/apiClient';
import { initEmergencyNotifications, handleLastNotificationResponseIfEmergency } from '../src/services/emergencyNotificationService';

const API_BASE = getApiBase();

export default function RootLayout() {
  useEffect(() => {
    const host = API_BASE.replace(/^https?:\/\//, '').split('/')[0];
    console.log('[Adrive] API base:', host, '(expect ngrok or your backend host; 404 = wrong host)');
  }, []);

  useEffect(() => {
    initEmergencyNotifications();
  }, []);

  useEffect(() => {
    handleLastNotificationResponseIfEmergency();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="(debug)" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}


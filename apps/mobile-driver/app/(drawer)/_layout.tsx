import { StyleSheet, Pressable, Text } from 'react-native';
import { Stack } from 'expo-router';
import { useMenuStore } from '../../src/stores/menuStore';
import { BackgroundDriverLogic } from '../../src/components/BackgroundDriverLogic';
import { DrawerMenu } from '../../src/components/DrawerMenu';
import { colors } from '../../src/theme/colors';

const TITLES: Record<string, string> = {
  index: 'Adrive',
  account: 'Account',
  earnings: 'Earnings & Payments',
  settings: 'Settings',
  preferences: 'Ad Filters',
  messages: 'Messages',
  developer: 'Admin Room',
};

export default function DrawerLayout() {
  const toggleMenu = useMenuStore((s) => s.toggleMenu);

  return (
    <>
      <BackgroundDriverLogic />
      <DrawerMenu />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background, borderBottomColor: colors.border },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'monospace', fontSize: 18 },
          headerLeft: () => (
            <Pressable onPress={toggleMenu} style={styles.menuBtn}>
              <Text style={styles.menuIcon}>☰</Text>
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="index" options={{ title: TITLES.index }} />
        <Stack.Screen name="account" options={{ title: TITLES.account }} />
        <Stack.Screen name="earnings" options={{ title: TITLES.earnings }} />
        <Stack.Screen name="settings" options={{ title: TITLES.settings }} />
        <Stack.Screen name="preferences" options={{ title: TITLES.preferences }} />
        <Stack.Screen name="messages" options={{ title: TITLES.messages }} />
        <Stack.Screen name="developer" options={{ title: TITLES.developer }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  menuBtn: { paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  menuIcon: { fontSize: 20, color: colors.text },
});

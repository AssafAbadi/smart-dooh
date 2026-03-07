import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMenuStore } from '../stores/menuStore';
import { colors } from '../theme/colors';

const MENU_ITEMS: { route: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { route: '/(drawer)', label: 'Home', icon: 'home-outline' },
  { route: '/(drawer)/account', label: 'Account', icon: 'person-outline' },
  { route: '/(drawer)/earnings', label: 'Earnings & Payments', icon: 'wallet-outline' },
  { route: '/(drawer)/settings', label: 'Settings', icon: 'settings-outline' },
  { route: '/(drawer)/preferences', label: 'Preferences & Filters', icon: 'options-outline' },
  { route: '/(drawer)/messages', label: 'Messages', icon: 'mail-outline' },
  { route: '/(drawer)/developer', label: 'Developer', icon: 'code-slash-outline' },
];

export function DrawerMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { menuOpen, setMenuOpen } = useMenuStore();

  const onItem = (route: string) => {
    setMenuOpen(false);
    if (route === '/(drawer)') {
      router.replace('/(drawer)');
    } else {
      router.push(route as any);
    }
  };

  return (
    <Modal visible={menuOpen} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Adrive</Text>
          {MENU_ITEMS.map(({ route, label, icon }) => {
            const base = pathname?.replace(/\/$/, '') || '';
            const isActive = base === route || (route !== '/(drawer)' && base.startsWith(route));
            return (
              <Pressable
                key={route}
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => onItem(route)}
              >
                <Ionicons name={icon} size={22} color={isActive ? colors.industrialRed : colors.textMuted} />
                <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  panel: {
    width: 280,
    backgroundColor: colors.surface,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: colors.background,
  },
  itemLabel: {
    fontSize: 16,
    color: colors.textMuted,
  },
  itemLabelActive: {
    color: colors.industrialRed,
  },
});

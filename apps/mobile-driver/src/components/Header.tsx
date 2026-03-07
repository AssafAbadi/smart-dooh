import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors } from '../theme/colors';

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showMenu?: boolean;
  onMenu?: () => void;
  right?: React.ReactNode;
}

function formatTime() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function Header({
  title = 'Adrive',
  showBack,
  onBack,
  showMenu,
  onMenu,
  right,
}: HeaderProps) {
  const [time, setTime] = React.useState(formatTime());
  React.useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 44 : 12 }]}>
      <Text style={styles.time}>{time}</Text>
      {showBack ? (
        <Pressable onPress={onBack} style={styles.icon}>
          <Text style={styles.iconText}>←</Text>
        </Pressable>
      ) : showMenu ? (
        <Pressable onPress={onMenu} style={styles.icon}>
          <Text style={styles.iconText}>☰</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {right ?? (
        <View style={styles.icons}>
          <Text style={styles.iconText}>★</Text>
          <Text style={[styles.iconText, { marginLeft: 12 }]}>⎘</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  time: {
    color: colors.textMuted,
    fontSize: 14,
    marginRight: 12,
  },
  icon: {
    padding: 4,
    marginRight: 8,
  },
  iconText: {
    color: colors.text,
    fontSize: 18,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontFamily: 'monospace',
  },
  icons: {
    flexDirection: 'row',
  },
});

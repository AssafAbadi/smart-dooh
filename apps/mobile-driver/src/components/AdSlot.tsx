import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { AdInstruction } from '@smart-dooh/shared-dto';
import { colors } from '../theme/colors';

export interface AdSlotProps {
  instruction: AdInstruction | null;
  /** Live values for placeholder replacement: [DISTANCE], [TIME_LEFT], [COUPON_CODE] */
  placeholders?: Record<string, string>;
}

function replacePlaceholders(text: string | undefined | null, placeholders: Record<string, string> = {}): string {
  let out = typeof text === 'string' ? text : '';
  out = out.replace(/\[DISTANCE\]/g, placeholders.DISTANCE ?? '—');
  out = out.replace(/\[TIME_LEFT\]/g, placeholders.TIME_LEFT ?? '—');
  out = out.replace(/\[COUPON_CODE\]/g, placeholders.COUPON_CODE ?? '—');
  Object.entries(placeholders).forEach(([key, value]) => {
    out = out.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  });
  return out;
}

export function AdSlot({ instruction, placeholders = {} }: AdSlotProps) {
  if (!instruction) {
    return (
      <View style={styles.slot}>
        <Text style={styles.placeholderLabel}>Active Ad Drive ad</Text>
      </View>
    );
  }
  const mergedPlaceholders = { ...instruction.placeholders, ...placeholders };
  const headline = replacePlaceholders(instruction.headline, mergedPlaceholders) || 'Ad';
  const body = instruction.body
    ? replacePlaceholders(instruction.body, mergedPlaceholders)
    : null;
  const coupon = instruction.couponCode
    ? replacePlaceholders(instruction.couponCode, mergedPlaceholders)
    : null;

  return (
    <View style={styles.slot}>
      {instruction.imageUrl ? (
        <Image source={{ uri: instruction.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}
      <Text style={styles.headline} numberOfLines={2}>{headline}</Text>
      {body ? <Text style={styles.body} numberOfLines={3}>{body}</Text> : null}
      {coupon ? <Text style={styles.coupon}>{coupon}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  image: {
    width: '100%',
    height: 80,
    borderRadius: 4,
    marginBottom: 8,
  },
  headline: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  body: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  coupon: {
    color: colors.industrialRed,
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

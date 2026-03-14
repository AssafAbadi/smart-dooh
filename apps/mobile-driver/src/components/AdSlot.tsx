import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { AdInstruction } from '@smart-dooh/shared-dto';
import { colors } from '../theme/colors';

export interface AdSlotProps {
  instruction: AdInstruction | null;
  /** Live values for placeholder replacement: [DISTANCE], [TIME_LEFT], [COUPON_CODE] */
  placeholders?: Record<string, string>;
  /** User's compass heading in degrees (0=N). Used to compute relative arrow direction. */
  heading?: number | null;
  /** User's current lat/lng for computing bearing to business. */
  userLat?: number | null;
  userLng?: number | null;
}

const DIRECTION_ARROWS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' };
const DIRECTION_ARROW_CHARS = '↑↓←→';

function bearingDeg(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(toLng - fromLng);
  const y = Math.sin(dLon) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(dLon);
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/** Relative direction from phone's perspective: bearing to business minus phone heading. */
function relativeDirection(
  userLat: number, userLng: number,
  businessLat: number, businessLng: number,
  heading: number
): 'up' | 'down' | 'left' | 'right' {
  const absolute = bearingDeg(userLat, userLng, businessLat, businessLng);
  const relative = ((absolute - heading) % 360 + 360) % 360;
  if (relative >= 315 || relative < 45) return 'up';
  if (relative >= 45 && relative < 135) return 'right';
  if (relative >= 135 && relative < 225) return 'down';
  return 'left';
}

function replacePlaceholders(
  text: string | undefined | null,
  placeholders: Record<string, string> = {},
  distanceOnly = false
): string {
  let out = typeof text === 'string' ? text : '';
  let dist = placeholders.DISTANCE ?? '—';
  if (distanceOnly && dist) {
    dist = dist.replace(new RegExp(`^[${DIRECTION_ARROW_CHARS}]\\s*`), '').trim() || dist;
  }
  out = out.replace(/\[DISTANCE\]/g, dist);
  out = out.replace(/\[TIME_LEFT\]/g, placeholders.TIME_LEFT ?? '—');
  out = out.replace(/\[COUPON_CODE\]/g, placeholders.COUPON_CODE ?? '—');
  Object.entries(placeholders).forEach(([key, value]) => {
    out = out.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  });
  return out;
}

export function AdSlot({ instruction, placeholders = {}, heading, userLat, userLng }: AdSlotProps) {
  if (!instruction) {
    return (
      <View style={styles.slot}>
        <Text style={styles.placeholderLabel}>Active Ad Drive ad</Text>
      </View>
    );
  }
  const mergedPlaceholders = { ...instruction.placeholders, ...placeholders };

  let arrowDirection: 'up' | 'down' | 'left' | 'right' | undefined;
  if (
    heading != null &&
    userLat != null && userLng != null &&
    instruction.businessLat != null && instruction.businessLng != null
  ) {
    arrowDirection = relativeDirection(userLat, userLng, instruction.businessLat, instruction.businessLng, heading);
  } else if (instruction.direction) {
    arrowDirection = instruction.direction as 'up' | 'down' | 'left' | 'right';
  }

  const showBigArrow = Boolean(arrowDirection && DIRECTION_ARROWS[arrowDirection]);
  const headline = replacePlaceholders(instruction.headline, mergedPlaceholders) || 'Ad';
  const body = instruction.body
    ? replacePlaceholders(instruction.body, mergedPlaceholders, showBigArrow)
    : null;
  const coupon = instruction.couponCode
    ? replacePlaceholders(instruction.couponCode, mergedPlaceholders)
    : null;
  const arrowChar = showBigArrow ? DIRECTION_ARROWS[arrowDirection!] : null;

  return (
    <View style={styles.slot}>
      {instruction.imageUrl ? (
        <Image source={{ uri: instruction.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}
      <Text style={styles.headline} numberOfLines={2}>{headline}</Text>
      {body ? <Text style={styles.body} numberOfLines={3}>{body}</Text> : null}
      {arrowChar ? <Text style={styles.directionArrow}>{arrowChar}</Text> : null}
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
  directionArrow: {
    color: '#0af',
    fontSize: 64,
    fontWeight: '700',
    marginVertical: 8,
    textAlign: 'center',
  },
  coupon: {
    color: colors.industrialRed,
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

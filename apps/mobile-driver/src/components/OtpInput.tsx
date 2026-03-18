import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Pressable,
} from 'react-native';
import { colors } from '../theme/colors';

const LENGTH = 6;
const BOX_SIZE = 48;

export interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  editable?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  editable = true,
  autoFocus = true,
}: OtpInputProps) {
  const digits = value.padEnd(LENGTH, ' ').split('').slice(0, LENGTH);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);

  const setDigit = useCallback(
    (index: number, char: string) => {
      const next = value.split('');
      while (next.length < LENGTH) next.push('');
      next[index] = char.replace(/\D/g, '').slice(-1);
      const newValue = next.join('').trimEnd().slice(0, LENGTH);
      onChange(newValue);
    },
    [value, onChange],
  );

  const focus = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
    setFocusedIndex(index);
  }, []);

  const handleChangeText = useCallback(
    (index: number, text: string) => {
      const digitsOnly = text.replace(/\D/g, '');
      if (digitsOnly.length > 1) {
        const pasted = digitsOnly.slice(0, LENGTH);
        onChange(pasted);
        focus(Math.min(pasted.length, LENGTH - 1));
        return;
      }
      const digit = digitsOnly.slice(-1);
      if (digit) {
        setDigit(index, digit);
        if (index < LENGTH - 1) {
          focus(index + 1);
        }
      }
    },
    [setDigit, focus, onChange],
  );

  const handleKeyPress = useCallback(
    (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
        focus(index - 1);
        setDigit(index - 1, '');
      }
    },
    [digits, focus, setDigit],
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: LENGTH }, (_, i) => (
        <Pressable
          key={i}
          onPress={() => editable && focus(i)}
          style={[styles.box, focusedIndex === i && styles.boxFocused]}
        >
          <TextInput
            ref={(el) => { inputRefs.current[i] = el; }}
            value={digits[i]?.trim() ?? ''}
            onChangeText={(text) => handleChangeText(i, text)}
            onKeyPress={(e) => handleKeyPress(i, e)}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(null)}
            keyboardType="number-pad"
            maxLength={i === 0 ? LENGTH : 1}
            editable={editable}
            selectTextOnFocus
            style={styles.input}
            autoFocus={autoFocus && i === 0}
            accessibilityLabel={`Digit ${i + 1}`}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: {
    borderColor: colors.accent,
  },
  input: {
    fontSize: 22,
    fontFamily: 'monospace',
    color: colors.text,
    width: '100%',
    textAlign: 'center',
    padding: 0,
  },
});

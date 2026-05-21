import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/src/utils/theme';

type AccessibleButtonProps = {
  label: string;
  onPress: () => void;
  hint?: string;
  accessibilityLabel?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function AccessibleButton({
  label,
  onPress,
  hint,
  accessibilityLabel,
  variant = 'primary',
  disabled = false,
}: AccessibleButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        pressed && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
      ]}>
      <Text
        style={[
          styles.text,
          !isPrimary && styles.secondaryText,
          disabled && styles.disabledText,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 76,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryText: {
    color: colors.text,
  },
  disabledText: {
    color: colors.textMuted,
  },
});

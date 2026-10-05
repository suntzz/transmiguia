import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { triggerSelectionHaptic } from '@/src/services/hapticsService';
import { borders, colors, radius, spacing, touchTargets } from '@/src/utils/theme';

export type AccessibleButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger';

type AccessibleButtonProps = {
  label: string;
  onPress: () => void;
  hint?: string;
  accessibilityLabel?: string;
  variant?: AccessibleButtonVariant;
  disabled?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
};

export function AccessibleButton({
  label,
  onPress,
  hint,
  accessibilityLabel,
  variant = 'primary',
  disabled = false,
  icon,
  subtitle,
}: AccessibleButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    void triggerSelectionHaptic();
    onPress();
  };

  const getVariantStyles = (pressed: boolean) => {
    switch (variant) {
      case 'accent':
        return {
          container: [
            styles.accent,
            pressed && styles.accentPressed,
          ],
          text: styles.accentText,
          subtext: styles.accentSubtext,
        };
      case 'danger':
        return {
          container: [
            styles.danger,
            pressed && styles.dangerPressed,
          ],
          text: styles.dangerText,
          subtext: styles.dangerSubtext,
        };
      case 'secondary':
        return {
          container: [
            styles.secondary,
            pressed && styles.secondaryPressed,
          ],
          text: styles.secondaryText,
          subtext: styles.secondarySubtext,
        };
      case 'primary':
      default:
        return {
          container: [
            styles.primary,
            pressed && styles.primaryPressed,
          ],
          text: styles.primaryText,
          subtext: styles.primarySubtext,
        };
    }
  };

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${label}. ${subtitle}` : label)}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      hitSlop={touchTargets.hitSlop}
      style={({ pressed }) => {
        const variantStyle = getVariantStyles(pressed);
        return [
          styles.base,
          variantStyle.container,
          disabled && styles.disabled,
        ];
      }}>
      {({ pressed }) => {
        const variantStyle = getVariantStyles(pressed);
        return (
          <View style={styles.contentRow}>
            {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
            <View style={styles.textContainer}>
              <Text
                allowFontScaling={true}
                style={[
                  styles.label,
                  variantStyle.text,
                  disabled && styles.disabledText,
                ]}>
                {label}
              </Text>
              {subtitle ? (
                <Text
                  allowFontScaling={true}
                  style={[
                    styles.subtitle,
                    variantStyle.subtext,
                    disabled && styles.disabledText,
                  ]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargets.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
    borderWidth: borders.standard,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  label: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },

  // Primary: Crimson Red with pure white text
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryPressed,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
    opacity: 0.92,
  },
  primaryText: {
    color: colors.textInverse,
  },
  primarySubtext: {
    color: '#FFE4E6',
  },

  // Secondary: Pure White surface with deep black text & border
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  secondaryPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  secondaryText: {
    color: colors.text,
  },
  secondarySubtext: {
    color: colors.textMuted,
  },

  // Accent: High-Visibility Safety Amber (Maximum contrast & urgency)
  accent: {
    backgroundColor: colors.accent,
    borderColor: colors.border,
    borderWidth: borders.bold,
  },
  accentPressed: {
    backgroundColor: colors.accentPressed,
  },
  accentText: {
    color: colors.accentText,
  },
  accentSubtext: {
    color: colors.accentText,
  },

  // Danger: High-contrast alert
  danger: {
    backgroundColor: colors.error,
    borderColor: '#991B1B',
  },
  dangerPressed: {
    backgroundColor: '#991B1B',
  },
  dangerText: {
    color: colors.textInverse,
  },
  dangerSubtext: {
    color: '#FEE2E2',
  },

  // Disabled State
  disabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderMuted,
  },
  disabledText: {
    color: colors.textSoft,
  },
});

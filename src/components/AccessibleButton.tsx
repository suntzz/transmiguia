import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { triggerSelectionHaptic } from '@/src/services/hapticsService';
import { colors, radius, shadows, spacing, touchTargets } from '@/src/utils/theme';

export type AccessibleButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
export type AccessibleButtonSize = 'standard' | 'large' | 'compact';

type AccessibleButtonProps = {
  label: string;
  onPress: () => void;
  hint?: string;
  accessibilityLabel?: string;
  variant?: AccessibleButtonVariant;
  size?: AccessibleButtonSize;
  disabled?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  fullWidth?: boolean;
};

export function AccessibleButton({
  label,
  onPress,
  hint,
  accessibilityLabel,
  variant = 'primary',
  size = 'standard',
  disabled = false,
  icon,
  subtitle,
  fullWidth = true,
}: AccessibleButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    void triggerSelectionHaptic();
    onPress();
  };

  const getVariantStyles = (pressed: boolean) => {
    switch (variant) {
      case 'secondary':
        return {
          container: [
            styles.secondary,
            pressed && styles.secondaryPressed,
          ],
          text: styles.secondaryText,
          subtext: styles.secondarySubtext,
        };
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
      case 'ghost':
        return {
          container: [
            styles.ghost,
            pressed && styles.ghostPressed,
          ],
          text: styles.ghostText,
          subtext: styles.ghostSubtext,
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

  const getSizeStyle = () => {
    switch (size) {
      case 'large':
        return styles.sizeLarge;
      case 'compact':
        return styles.sizeCompact;
      case 'standard':
      default:
        return styles.sizeStandard;
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
          getSizeStyle(),
          fullWidth && styles.fullWidth,
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
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  sizeStandard: {
    minHeight: touchTargets.primary,
    paddingVertical: spacing.sm,
  },
  sizeLarge: {
    minHeight: 62,
    paddingVertical: spacing.md,
  },
  sizeCompact: {
    minHeight: touchTargets.minSize,
    paddingVertical: spacing.xs,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 1,
  },

  // Primary: TransMilenio Red with subtle modern shadow
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.subtle,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
    opacity: 0.92,
  },
  primaryText: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  primarySubtext: {
    color: '#FEE2E2',
  },

  // Secondary: Clean white surface with subtle 1px border
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.subtle,
  },
  secondaryPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '600',
  },
  secondarySubtext: {
    color: colors.textSecondary,
  },

  // Accent: High-Glanceability Safety Amber
  accent: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accentPressed,
    ...shadows.subtle,
  },
  accentPressed: {
    backgroundColor: colors.accentPressed,
  },
  accentText: {
    color: colors.accentText,
    fontWeight: '700',
  },
  accentSubtext: {
    color: colors.textSecondary,
  },

  // Danger: Refined error red
  danger: {
    backgroundColor: colors.error,
    borderWidth: 1,
    borderColor: colors.errorPressed,
  },
  dangerPressed: {
    backgroundColor: colors.errorPressed,
  },
  dangerText: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  dangerSubtext: {
    color: '#FEE2E2',
  },

  // Ghost: Borderless and lightweight
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  ghostPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  ghostText: {
    color: colors.primary,
    fontWeight: '600',
  },
  ghostSubtext: {
    color: colors.textSecondary,
  },

  // Disabled State
  disabled: {
    opacity: 0.45,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: colors.textSecondary,
  },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { triggerSelectionHaptic } from '@/src/services/hapticsService';
import { colors, radius, shadows, spacing, touchTargets } from '@/src/utils/theme';

export type AccessibleButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
export type AccessibleButtonSize = 'standard' | 'large' | 'compact';
export type AccessibleButtonAlign = 'center' | 'left';

type IconProp = React.ReactNode | keyof typeof MaterialIcons.glyphMap | string;

type AccessibleButtonProps = {
  label: string;
  onPress: () => void;
  hint?: string;
  accessibilityLabel?: string;
  variant?: AccessibleButtonVariant;
  size?: AccessibleButtonSize;
  align?: AccessibleButtonAlign;
  disabled?: boolean;
  icon?: IconProp;
  rightIcon?: IconProp;
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
  align,
  disabled = false,
  icon,
  rightIcon,
  subtitle,
  fullWidth = true,
}: AccessibleButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    void triggerSelectionHaptic();
    onPress();
  };

  const getIconColor = (btnVariant: AccessibleButtonVariant, pressed: boolean, isDisabled: boolean) => {
    if (isDisabled) return colors.textSecondary;
    switch (btnVariant) {
      case 'primary':
      case 'danger':
        return colors.textInverse;
      case 'accent':
        return colors.accentText;
      case 'ghost':
        return colors.primary;
      case 'secondary':
      default:
        return colors.text;
    }
  };

  const renderIcon = (iconItem: IconProp | undefined, isRight = false, pressed = false) => {
    if (!iconItem) return null;
    if (React.isValidElement(iconItem)) {
      return iconItem;
    }
    if (typeof iconItem === 'string') {
      const iconSize = size === 'large' ? 24 : size === 'compact' ? 18 : 20;
      return (
        <MaterialIcons
          name={iconItem as any}
          size={iconSize}
          color={getIconColor(variant, pressed, disabled)}
        />
      );
    }
    return null;
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

  const isLeftAligned = align === 'left' || (align === undefined && Boolean(subtitle));

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
          pressed && !disabled && styles.pressedTransform,
          disabled && styles.disabled,
        ];
      }}>
      {({ pressed }) => {
        const variantStyle = getVariantStyles(pressed);
        return (
          <View style={[styles.contentRow, isLeftAligned ? styles.contentRowLeft : styles.contentRowCenter]}>
            {icon ? (
              <View style={[styles.iconContainer, isLeftAligned && styles.iconContainerLeft]}>
                {renderIcon(icon, false, pressed)}
              </View>
            ) : null}

            <View style={[styles.textContainer, isLeftAligned ? styles.textContainerLeft : styles.textContainerCenter]}>
              <Text
                allowFontScaling={true}
                style={[
                  styles.label,
                  variantStyle.text,
                  isLeftAligned ? styles.labelLeft : styles.labelCenter,
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
                    isLeftAligned ? styles.subtitleLeft : styles.subtitleCenter,
                    disabled && styles.disabledText,
                  ]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            {rightIcon ? (
              <View style={styles.rightIconContainer}>
                {renderIcon(rightIcon, true, pressed)}
              </View>
            ) : null}
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
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  sizeCompact: {
    minHeight: touchTargets.minSize,
    paddingVertical: spacing.xs,
  },
  pressedTransform: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  contentRowCenter: {
    justifyContent: 'center',
    gap: spacing.sm,
  },
  contentRowLeft: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },

  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerLeft: {
    marginRight: 2,
  },
  rightIconContainer: {
    marginLeft: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textContainer: {
    justifyContent: 'center',
  },
  textContainerCenter: {
    alignItems: 'center',
    flexShrink: 1,
  },
  textContainerLeft: {
    alignItems: 'flex-start',
    flex: 1,
  },

  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  labelCenter: {
    textAlign: 'center',
  },
  labelLeft: {
    textAlign: 'left',
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 2,
  },
  subtitleCenter: {
    textAlign: 'center',
  },
  subtitleLeft: {
    textAlign: 'left',
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  ghostSubtext: {
    color: colors.textSecondary,
  },

  // Disabled State
  disabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: colors.textSecondary,
  },
});

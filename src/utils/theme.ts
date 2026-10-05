/**
 * Design System Tokens for TransMilenio Accesible
 * Crafted for high-contrast accessibility (WCAG 2.2 AAA),
 * modern visual aesthetics, and mobile touch ergonomics.
 */

export const colors = {
  // Brand Identity: TransMilenio Red (used with precision & purpose)
  primary: '#E30613',
  primaryPressed: '#C0040F',
  primaryLight: '#FEE2E2',
  primarySurface: '#FEF2F2',

  // Secondary Action / High-Glanceability Accent: Safety Amber
  accent: '#FFC400',
  accentPressed: '#E0A800',
  accentLight: '#FFFBEB',
  accentSurface: '#FFFBEB',
  accentText: '#111827',

  // Foundations: Clean warm neutrals
  background: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F3F4F6',
  surfaceHover: '#F9FAFB',
  surfaceMuted: '#E5E7EB',
  cream: '#F7F7F5',

  // High-Contrast Typography
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#4B5563',
  textTertiary: '#6B7280',
  textSoft: '#6B7280',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E5E7EB',
  borderSubtle: '#D1D5DB',
  borderMedium: '#D1D5DB',
  borderFocus: '#E30613',
  borderMuted: '#E5E7EB',

  // Feedback & Statuses (Accessible tones)
  success: '#16803C',
  successPressed: '#0E622C',
  successLight: '#DCFCE7',
  successSoft: '#DCFCE7',

  warning: '#B45309',
  warningPressed: '#8A3E05',
  warningLight: '#FEF3C7',
  warningSoft: '#FEF3C7',

  error: '#B91C1C',
  errorPressed: '#8F1515',
  errorLight: '#FEE2E2',
  errorSoft: '#FEE2E2',

  info: '#2563EB',
  infoPressed: '#1D4ED8',
  infoLight: '#EFF6FF',
  infoSoft: '#EFF6FF',

  dark: '#111827',
  darkSoft: '#1F2937',
  map: '#E5E7EB',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const borders = {
  standard: 1,
  medium: 1.5,
  bold: 2,
  heavy: 2.5,
};

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
};

export const touchTargets = {
  minSize: 48,
  standard: 52,
  primary: 56,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800' as const,
  },
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600' as const,
  },
  bodySecondary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  secondary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  secondaryMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },

  // Backwards compatibility keys
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  tiny: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600' as const,
  },
};

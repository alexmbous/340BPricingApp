// Visual design tokens for ApexCare.
// Direction: calm clinical-modern — slate-blue primary, neutral surfaces,
// tight type scale, soft rounded cards. Healthcare trust without the tired
// stock "mint leaf on white" look.

export const palette = {
  // Brand
  primary50: '#EEF2FB',
  primary100: '#D6DEF3',
  primary300: '#8094D9',
  primary500: '#3D58B5', // main
  primary700: '#263A87',
  primary900: '#111D52',

  // Neutrals
  bg: '#F7F8FB',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  hairline: '#E5E8EE',
  overlay: 'rgba(15, 22, 42, 0.48)',

  // Text
  textPrimary: '#0F1629',
  textSecondary: '#4B5569',
  textTertiary: '#7B8395',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success500: '#1F8A5A',
  success50: '#E4F4ED',
  warning500: '#B3660A',
  warning50: '#FBF1E1',
  danger500: '#B3261E',
  danger50: '#FBE9E7',
  info500: '#2F6FB3',
  info50: '#E6F0FB',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  // 1.333 modular scale
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.4 },
  heading: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.2 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  mono: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const, fontFamily: 'Menlo' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F1629',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export type Palette = typeof palette;

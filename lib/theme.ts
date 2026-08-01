import { Platform } from 'react-native';

export const colors = {
  // Primary: Deep Teal (#0F766E) — trust, stability, professionalism
  primary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },
  // Secondary: Warm Copper/Bronze (#B45309) — premium, reliable, warm
  secondary: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Accent: Rose/Coral — for ratings and highlights
  accent: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
  full: 9999,
};

export const typography = {
  fontFamilyRegular: Platform.OS === 'web' ? 'Inter, Noto Sans Malayalam, system-ui, sans-serif' : 'Noto-Sans-Malayalam-Regular',
  fontFamilyMedium: Platform.OS === 'web' ? 'Inter, Noto Sans Malayalam, system-ui, sans-serif' : 'Noto-Sans-Malayalam-Medium',
  fontFamilyBold: Platform.OS === 'web' ? 'Inter, Noto Sans Malayalam, system-ui, sans-serif' : 'Noto-Sans-Malayalam-Bold',
  headingLineHeight: 28,
  bodyLineHeight: 24,
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
};

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    android: { elevation: 1 },
    default: { boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)' },
  }),
  md: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12 },
    android: { elevation: 3 },
    default: { boxShadow: '0 3px 12px rgba(15, 23, 42, 0.07)' },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 20 },
    android: { elevation: 6 },
    default: { boxShadow: '0 6px 20px rgba(15, 23, 42, 0.09)' },
  }),
  xl: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 32 },
    android: { elevation: 10 },
    default: { boxShadow: '0 10px 32px rgba(15, 23, 42, 0.12)' },
  }),
};

// Helper for Malayalam text styles - Malayalam script needs more line height
// and proper letter spacing and font family for correct vertical alignment in APK
export function getLangTextStyle(lang: string) {
  if (lang === 'ml') {
    return {
      fontFamily: Platform.OS === 'web' ? 'Noto Sans Malayalam, Inter, sans-serif' : 'Noto-Sans-Malayalam-Regular',
      lineHeight: Platform.OS === 'web' ? 28 : 26,
      letterSpacing: 0,
      includeFontPadding: false,
      textAlignVertical: 'center' as const,
    };
  }
  return {
    includeFontPadding: false,
  };
}

// Apply Malayalam text style to a StyleSheet style object
export function withLangStyle(style: object, lang: string) {
  if (lang === 'ml') {
    return { ...style, ...getLangTextStyle(lang) };
  }
  return { ...style, includeFontPadding: false };
}


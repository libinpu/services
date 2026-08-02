import { Platform } from 'react-native';

// Dark theme: charcoal background + vibrant orange accent.
// Color indices are mapped so existing references produce correct dark-theme values.
// neutral[0] = white (for text on colored backgrounds)
// neutral[50] = charcoal app background
// neutral[100] = dark card/input surface
// neutral[200] = slightly lighter surface (icon containers, dividers)
// neutral[300] = muted gray (inactive icons, chevrons)
// neutral[400] = muted gray (placeholder, inactive icons)
// neutral[500]/[600] = secondary text gray
// neutral[700]/[800]/[900] = white (headings/primary text)

export const colors = {
  // Primary: Vibrant Orange (#FF9142 → #F5821F)
  primary: {
    50: 'rgba(255,145,66,0.12)',
    100: 'rgba(255,145,66,0.18)',
    200: 'rgba(255,145,66,0.25)',
    300: '#FF9142',
    400: '#FF9142',
    500: '#FF9142',
    600: '#FF9142',
    700: '#F5821F',
    800: '#F5821F',
    900: '#F5821F',
  },
  // Secondary: Orange (single accent — same as primary)
  secondary: {
    50: 'rgba(255,145,66,0.12)',
    100: 'rgba(255,145,66,0.18)',
    200: 'rgba(255,145,66,0.25)',
    300: '#FF9142',
    400: '#FF9142',
    500: '#FF9142',
    600: '#F5821F',
    700: '#F5821F',
    800: '#F5821F',
    900: '#F5821F',
  },
  // Accent: Orange (used for ratings/highlights — single accent color)
  accent: {
    50: 'rgba(255,145,66,0.12)',
    100: 'rgba(255,145,66,0.18)',
    200: 'rgba(255,145,66,0.25)',
    300: '#FF9142',
    400: '#FF9142',
    500: '#FF9142',
    600: '#F5821F',
    700: '#F5821F',
    800: '#F5821F',
    900: '#F5821F',
  },
  success: {
    50: 'rgba(48,209,88,0.12)',
    100: 'rgba(48,209,88,0.18)',
    200: 'rgba(48,209,88,0.25)',
    300: '#30D158',
    400: '#30D158',
    500: '#30D158',
    600: '#30D158',
    700: '#28B84C',
    800: '#28B84C',
    900: '#28B84C',
  },
  warning: {
    50: 'rgba(255,214,10,0.12)',
    100: 'rgba(255,214,10,0.18)',
    200: 'rgba(255,214,10,0.25)',
    300: '#FFD60A',
    400: '#FFD60A',
    500: '#FFD60A',
    600: '#E6C109',
    700: '#E6C109',
    800: '#E6C109',
    900: '#E6C109',
  },
  error: {
    50: 'rgba(255,69,58,0.12)',
    100: 'rgba(255,69,58,0.18)',
    200: 'rgba(255,69,58,0.25)',
    300: '#FF453A',
    400: '#FF453A',
    500: '#FF453A',
    600: '#FF453A',
    700: '#E03E34',
    800: '#E03E34',
    900: '#E03E34',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#1C1C1E',
    100: '#2A2A2D',
    200: '#3A3A3D',
    300: '#8E8E93',
    400: '#8E8E93',
    500: '#9A9A9E',
    600: '#9A9A9E',
    700: '#FFFFFF',
    800: '#FFFFFF',
    900: '#FFFFFF',
    950: '#1C1C1E',
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
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4 },
    android: { elevation: 2 },
    default: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)' },
  }),
  md: Platform.select({
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 12 },
    android: { elevation: 4 },
    default: { boxShadow: '0 3px 12px rgba(0, 0, 0, 0.35)' },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 20 },
    android: { elevation: 8 },
    default: { boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)' },
  }),
  xl: Platform.select({
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 32 },
    android: { elevation: 12 },
    default: { boxShadow: '0 10px 32px rgba(0, 0, 0, 0.45)' },
  }),
};

// Helper for Malayalam text styles - Malayalam script needs more line height
// and proper font family and letter spacing for correct vertical alignment in APK
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

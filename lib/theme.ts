import { Platform } from 'react-native';

type ColorRamp = Record<number, string>;
type ColorPalette = {
  primary: ColorRamp;
  secondary: ColorRamp;
  accent: ColorRamp;
  success: ColorRamp;
  warning: ColorRamp;
  error: ColorRamp;
  neutral: ColorRamp;
};

// ─── Legacy dark palette (kept for explicit user toggle) ────
const darkColors: ColorPalette = {
  primary: {
    50: 'rgba(56, 189, 248, 0.1)',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#38BDF8', // Vibrant Sky Blue for CTA/active
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },
  secondary: {
    50: 'rgba(255,140,90,0.1)',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  accent: {
    50: 'rgba(244,106,69,0.1)',
    100: '#FFE4E0',
    200: '#FFC8C0',
    300: '#FFA093',
    400: '#FF7D6A',
    500: '#F46A45',
    600: '#F46A45', // Coral Orange for accents
    700: '#BF3D1B',
    800: '#9C2A0F',
    900: '#7A1C08',
  },
  success: {
    50: 'rgba(74, 222, 128, 0.1)',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#22C55E',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  warning: {
    50: 'rgba(250, 204, 21, 0.1)',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#EAB308',
    600: '#EAB308',
    700: '#A16207',
    800: '#854D0E',
    900: '#713F12',
  },
  error: {
    50: 'rgba(248, 113, 113, 0.1)',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#EF4444',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  neutral: {
    0: '#000000',
    50: '#0B111A',   // App Background (Deep Slate)
    100: '#131A26',  // Cards background
    200: '#1E293B',  // Borders / Dividers
    300: '#334155',  // Strong borders / Divider
    400: '#475569',  // Placeholder / light secondary
    500: '#94A3B8',  // Secondary Text
    600: '#CBD5E1',  // Medium text
    700: '#F1F5F9',  // Primary Text
    800: '#F8FAFC',
    900: '#FFFFFF',
    950: '#0B111A',
  },
};

// ─── Light palette (BEIGE premium cream + teal) ────────────
const lightColors: ColorPalette = {
  primary: {
    // Primary teal #0F766E
    50: 'rgba(15,118,110,0.08)',
    100: 'rgba(15,118,110,0.15)',
    200: 'rgba(15,118,110,0.25)',
    300: '#5AAFA5',
    400: '#2B9187',
    500: '#0F766E',
    600: '#0F766E',
    700: '#0B5F59',
    800: '#084C48',
    900: '#063B38',
  },
  secondary: {
    // Soft Orange #FF8C5A
    50: 'rgba(255,140,90,0.08)',
    100: '#FF8C5A',
    200: '#FF8C5A',
    300: '#FF8C5A',
    400: '#FF8C5A',
    500: '#FF8C5A',
    600: '#FF8C5A',
    700: '#E07A1F',
    800: '#C06000',
    900: '#A05000',
  },
  accent: {
    // Coral Orange #F46A45
    50: 'rgba(244,106,69,0.08)',
    100: '#F46A45',
    200: '#F46A45',
    300: '#F46A45',
    400: '#F46A45',
    500: '#F46A45',
    600: '#F46A45',
    700: '#D05030',
    800: '#B04020',
    900: '#903010',
  },
  success: {
    50: 'rgba(76,175,80,0.10)',
    100: 'rgba(76,175,80,0.15)',
    200: 'rgba(76,175,80,0.22)',
    300: '#4CAF50',
    400: '#4CAF50',
    500: '#4CAF50',
    600: '#4CAF50',
    700: '#388E3C',
    800: '#388E3C',
    900: '#388E3C',
  },
  warning: {
    50: 'rgba(245,166,35,0.10)',
    100: 'rgba(245,166,35,0.15)',
    200: 'rgba(245,166,35,0.22)',
    300: '#F5A623',
    400: '#F5A623',
    500: '#F5A623',
    600: '#F5A623',
    700: '#E69512',
    800: '#E69512',
    900: '#E69512',
  },
  error: {
    50: 'rgba(244,67,54,0.10)',
    100: 'rgba(244,67,54,0.15)',
    200: 'rgba(244,67,54,0.22)',
    300: '#F44336',
    400: '#F44336',
    500: '#F44336',
    600: '#F44336',
    700: '#D32F2F',
    800: '#D32F2F',
    900: '#D32F2F',
  },
  neutral: {
    0: '#FFF9F0',
    50: '#F8F5EF',   // Warm beige background
    100: '#FFF9F0',  // Cream cards
    200: '#E4E8DE',  // Soft green borders
    300: '#D6DCCF',  // Dividers
    400: '#A7B0A3',  // Placeholder
    500: '#6B7280',  // Secondary text
    600: '#4B5563',  // Medium text
    700: '#1A1A1A',  // Primary text
    800: '#1A1A1A',
    900: '#111827',
    950: '#F8F5EF',
  },
};

// Deep-clone so we have a mutable object whose nested refs stay stable
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Mutable colors object (swapped in-place by setActiveTheme) ──
export const colors: ColorPalette = deepClone(lightColors);

export type ThemeMode = 'light' | 'dark';

let _currentMode: ThemeMode = 'light';

export function getThemeMode(): ThemeMode {
  return _currentMode;
}

export function setActiveTheme(mode: ThemeMode) {
  if (mode === _currentMode) return;
  _currentMode = mode;
  const source = mode === 'light' ? lightColors : darkColors;
  for (const group of Object.keys(source) as (keyof ColorPalette)[]) {
    for (const shade of Object.keys(source[group])) {
      const numShade = Number(shade);
      colors[group][numShade] = source[group][numShade];
    }
  }
  // Update shadows in-place
  const s = mode === 'light' ? lightShadows : darkShadows;
  (shadows as any).sm = s.sm;
  (shadows as any).md = s.md;
  (shadows as any).lg = s.lg;
  (shadows as any).xl = s.xl;
}

// ─── Shadows ──────────────────────────────────────────────────
const darkShadows = {
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

const lightShadows = {
  sm: Platform.select({
    ios: { shadowColor: '#334E68', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
    android: { elevation: 1 },
    default: { boxShadow: '0 2px 6px rgba(51, 78, 104, 0.04)' },
  }),
  md: Platform.select({
    ios: { shadowColor: '#334E68', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16 },
    android: { elevation: 3 },
    default: { boxShadow: '0 4px 16px rgba(51, 78, 104, 0.06)' },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#334E68', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.09, shadowRadius: 24 },
    android: { elevation: 6 },
    default: { boxShadow: '0 8px 24px rgba(51, 78, 104, 0.09)' },
  }),
  xl: Platform.select({
    ios: { shadowColor: '#334E68', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 36 },
    android: { elevation: 10 },
    default: { boxShadow: '0 16px 36px rgba(51, 78, 104, 0.12)' },
  }),
};

export const shadows: { sm: any; md: any; lg: any; xl: any } = {
  sm: lightShadows.sm,
  md: lightShadows.md,
  lg: lightShadows.lg,
  xl: lightShadows.xl,
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
  lg: 24, // Generous 24px rounded corners per guideline
  xl: 28, // High end card corners
  full: 9999, // Pill shape
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

export function withLangStyle(style: object, lang: string) {
  if (lang === 'ml') {
    return { ...style, ...getLangTextStyle(lang) };
  }
  return { ...style, includeFontPadding: false };
}

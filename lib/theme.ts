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

// ─── Dark palette ─────────────────────────────────────────────
const darkColors: ColorPalette = {
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

// ─── Light palette ────────────────────────────────────────────
const lightColors: ColorPalette = {
  primary: {
    50: 'rgba(255,145,66,0.10)',
    100: 'rgba(255,145,66,0.15)',
    200: 'rgba(255,145,66,0.22)',
    300: '#FF9142',
    400: '#FF9142',
    500: '#FF9142',
    600: '#F5821F',
    700: '#E6730E',
    800: '#E6730E',
    900: '#E6730E',
  },
  secondary: {
    50: 'rgba(255,145,66,0.10)',
    100: 'rgba(255,145,66,0.15)',
    200: 'rgba(255,145,66,0.22)',
    300: '#FF9142',
    400: '#FF9142',
    500: '#FF9142',
    600: '#F5821F',
    700: '#E6730E',
    800: '#E6730E',
    900: '#E6730E',
  },
  accent: {
    50: 'rgba(255,145,66,0.10)',
    100: 'rgba(255,145,66,0.15)',
    200: 'rgba(255,145,66,0.22)',
    300: '#FF9142',
    400: '#FF9142',
    500: '#FF9142',
    600: '#F5821F',
    700: '#E6730E',
    800: '#E6730E',
    900: '#E6730E',
  },
  success: {
    50: 'rgba(48,209,88,0.10)',
    100: 'rgba(48,209,88,0.15)',
    200: 'rgba(48,209,88,0.22)',
    300: '#30D158',
    400: '#30D158',
    500: '#28B84C',
    600: '#24A843',
    700: '#1F9238',
    800: '#1F9238',
    900: '#1F9238',
  },
  warning: {
    50: 'rgba(255,214,10,0.10)',
    100: 'rgba(255,214,10,0.15)',
    200: 'rgba(255,214,10,0.22)',
    300: '#FFD60A',
    400: '#FFD60A',
    500: '#E6C109',
    600: '#D4AF09',
    700: '#D4AF09',
    800: '#D4AF09',
    900: '#D4AF09',
  },
  error: {
    50: 'rgba(255,69,58,0.10)',
    100: 'rgba(255,69,58,0.15)',
    200: 'rgba(255,69,58,0.22)',
    300: '#FF453A',
    400: '#FF453A',
    500: '#FF453A',
    600: '#E03E34',
    700: '#CC352C',
    800: '#CC352C',
    900: '#CC352C',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F2F2F7',
    100: '#FFFFFF',
    200: '#E5E5EA',
    300: '#C7C7CC',
    400: '#8E8E93',
    500: '#636366',
    600: '#48484A',
    700: '#1C1C1E',
    800: '#1C1C1E',
    900: '#000000',
    950: '#F2F2F7',
  },
};

// Deep-clone so we have a mutable object whose nested refs stay stable
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Mutable colors object (swapped in-place by setActiveTheme) ──
export const colors: ColorPalette = deepClone(darkColors);

export type ThemeMode = 'light' | 'dark';

let _currentMode: ThemeMode = 'dark';

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
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    android: { elevation: 1 },
    default: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)' },
  }),
  md: Platform.select({
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 12 },
    android: { elevation: 3 },
    default: { boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20 },
    android: { elevation: 6 },
    default: { boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)' },
  }),
  xl: Platform.select({
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.20, shadowRadius: 32 },
    android: { elevation: 10 },
    default: { boxShadow: '0 10px 32px rgba(0, 0, 0, 0.20)' },
  }),
};

export const shadows: { sm: any; md: any; lg: any; xl: any } = {
  sm: darkShadows.sm,
  md: darkShadows.md,
  lg: darkShadows.lg,
  xl: darkShadows.xl,
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

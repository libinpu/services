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

// ─── Dark palette (warm charcoal + forest green) ───────────────
const darkColors: ColorPalette = {
  primary: {
    50: 'rgba(111, 191, 149, 0.10)',
    100: 'rgba(111, 191, 149, 0.18)',
    200: 'rgba(111, 191, 149, 0.28)',
    300: '#9AD6B7',
    400: '#7FCAA4',
    500: '#6FBF95',
    600: '#6FBF95', // Mint-forest green for CTA/active
    700: '#4E9E77',
    800: '#3A7B5C',
    900: '#2A5A43',
  },
  secondary: {
    50: 'rgba(230, 188, 107, 0.10)',
    100: 'rgba(230, 188, 107, 0.18)',
    200: 'rgba(230, 188, 107, 0.28)',
    300: '#F0D49A',
    400: '#EAC782',
    500: '#E6BC6B', // Warm gold
    600: '#E6BC6B',
    700: '#C79C4C',
    800: '#A47E37',
    900: '#7F6027',
  },
  accent: {
    50: 'rgba(111, 191, 149, 0.10)',
    100: 'rgba(111, 191, 149, 0.18)',
    200: 'rgba(111, 191, 149, 0.28)',
    300: '#9AD6B7',
    400: '#7FCAA4',
    500: '#6FBF95', // CTA green
    600: '#6FBF95',
    700: '#4E9E77',
    800: '#3A7B5C',
    900: '#2A5A43',
  },
  success: {
    50: 'rgba(96, 200, 140, 0.12)',
    100: 'rgba(96, 200, 140, 0.18)',
    200: 'rgba(96, 200, 140, 0.28)',
    300: '#8FDCB4',
    400: '#74D0A0',
    500: '#60C88C',
    600: '#60C88C',
    700: '#42A76D',
    800: '#2F8253',
    900: '#22603D',
  },
  warning: {
    50: 'rgba(230, 188, 107, 0.12)',
    100: 'rgba(230, 188, 107, 0.18)',
    200: 'rgba(230, 188, 107, 0.28)',
    300: '#F0D49A',
    400: '#EAC782',
    500: '#E6BC6B',
    600: '#E6BC6B',
    700: '#C79C4C',
    800: '#A47E37',
    900: '#7F6027',
  },
  error: {
    50: 'rgba(232, 114, 92, 0.12)',
    100: 'rgba(232, 114, 92, 0.18)',
    200: 'rgba(232, 114, 92, 0.28)',
    300: '#F0A091',
    400: '#EC8874',
    500: '#E8725C',
    600: '#E8725C',
    700: '#C4553F',
    800: '#9E402D',
    900: '#772E1F',
  },
  neutral: {
    0: '#000000',
    50: '#16201A',   // App background (warm charcoal green)
    100: '#1F2A23',  // Card surfaces
    200: '#2C3A31',  // Borders
    300: '#3A4B3F',  // Strong borders / dividers
    400: '#5B6B60',  // Placeholder
    500: '#9AA69E',  // Secondary text
    600: '#C6CFC8',  // Medium text
    700: '#F5F1E8',  // Primary text (warm off-white)
    800: '#FAF6EE',
    900: '#FFFFFF',
    950: '#16201A',
  },
};

// ─── Light palette (Seva warm — beige / forest green / gold) ────────────
const lightColors: ColorPalette = {
  primary: {
    // Forest green #2F6B4F
    50: 'rgba(47,107,79,0.06)',
    100: '#E7F0EA',
    200: '#C9DFD3',
    300: '#8FBCA4',
    400: '#4E8C6C',
    500: '#2F6B4F',
    600: '#2F6B4F', // Primary accent — buttons, active states, price tags
    700: '#265842',
    800: '#1C4331',
    900: '#123023',
  },
  secondary: {
    // Warm gold #D9A441 — offers, badges, ratings
    50: 'rgba(217,164,65,0.08)',
    100: '#FBF2DF',
    200: '#F4E1B9',
    300: '#EACB84',
    400: '#E1B75F',
    500: '#D9A441',
    600: '#D9A441',
    700: '#B8862C',
    800: '#96691F',
    900: '#775217',
  },
  accent: {
    // CTA green (mirrors primary so every call-to-action is forest green)
    50: 'rgba(47,107,79,0.06)',
    100: '#E7F0EA',
    200: '#C9DFD3',
    300: '#8FBCA4',
    400: '#4E8C6C',
    500: '#2F6B4F',
    600: '#2F6B4F',
    700: '#265842',
    800: '#1C4331',
    900: '#123023',
  },
  success: {
    50: 'rgba(47,143,91,0.10)',
    100: 'rgba(47,143,91,0.15)',
    200: 'rgba(47,143,91,0.22)',
    300: '#7CC49B',
    400: '#4CA875',
    500: '#2F8F5B',
    600: '#2F8F5B',
    700: '#26744A',
    800: '#1D5A39',
    900: '#154029',
  },
  warning: {
    50: 'rgba(217,164,65,0.10)',
    100: 'rgba(217,164,65,0.16)',
    200: 'rgba(217,164,65,0.24)',
    300: '#EACB84',
    400: '#E1B75F',
    500: '#D9A441',
    600: '#D9A441',
    700: '#B8862C',
    800: '#96691F',
    900: '#775217',
  },
  error: {
    // Warm red — also drives the emergency "red mode" flow
    50: 'rgba(192,69,47,0.10)',
    100: 'rgba(192,69,47,0.15)',
    200: 'rgba(192,69,47,0.22)',
    300: '#E39182',
    400: '#D46A55',
    500: '#C0452F',
    600: '#C0452F',
    700: '#9E3626',
    800: '#7C291C',
    900: '#5A1D14',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#FAF6EE',   // App background — warm beige/cream
    100: '#FFFFFF',  // Card surfaces
    200: '#EDE5D6',  // Borders
    300: '#E2D9C8',  // Dividers
    400: '#A8A093',  // Placeholder
    500: '#6B6B6B',  // Subtext
    600: '#4A4A4A',  // Medium text
    700: '#1E1E1E',  // Headings
    800: '#1E1E1E',
    900: '#1E1E1E',
    950: '#FAF6EE',
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

// Warm, soft shadows tinted with the forest-green brand colour
const lightShadows = {
  sm: Platform.select({
    ios: { shadowColor: '#5A4A32', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 1 },
    default: { boxShadow: '0 2px 8px rgba(90, 74, 50, 0.06)' },
  }),
  md: Platform.select({
    ios: { shadowColor: '#5A4A32', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18 },
    android: { elevation: 3 },
    default: { boxShadow: '0 6px 18px rgba(90, 74, 50, 0.08)' },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#5A4A32', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.10, shadowRadius: 28 },
    android: { elevation: 6 },
    default: { boxShadow: '0 10px 28px rgba(90, 74, 50, 0.10)' },
  }),
  xl: Platform.select({
    ios: { shadowColor: '#2F6B4F', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.14, shadowRadius: 40 },
    android: { elevation: 10 },
    default: { boxShadow: '0 18px 40px rgba(47, 107, 79, 0.14)' },
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
  sm: 12,
  md: 16,
  lg: 20, // Card minimum per design system
  xl: 24, // Large card / sheet corners
  xxl: 32,
  full: 9999, // Pill shape
};

const WEB_BODY_STACK = 'Poppins, Noto Sans Malayalam, system-ui, sans-serif';
const WEB_DISPLAY_STACK = 'Sora, Poppins, Noto Sans Malayalam, system-ui, sans-serif';

export const typography = {
  fontFamilyRegular: Platform.OS === 'web' ? WEB_BODY_STACK : 'Poppins-Regular',
  fontFamilyMedium: Platform.OS === 'web' ? WEB_BODY_STACK : 'Poppins-Medium',
  fontFamilyBold: Platform.OS === 'web' ? WEB_BODY_STACK : 'Poppins-Bold',
  /** Rounded display face used for hero headlines ("Smart Home, Smooth Service") */
  fontFamilyDisplay: Platform.OS === 'web' ? WEB_DISPLAY_STACK : 'Poppins-Bold',
  headingLineHeight: 28,
  bodyLineHeight: 24,
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    /** Hero headline size (tight line-height, two-line headings) */
    xxxl: 30,
    display: 40,
  },
};

/** Hero headline text style — bold, rounded, tight line-height. */
export const heroHeadline = {
  fontSize: typography.sizes.xxxl,
  lineHeight: 36,
  fontWeight: '800' as const,
  fontFamily: typography.fontFamilyDisplay,
  color: '#1E1E1E',
  letterSpacing: -0.5,
};

/**
 * Gradient pairs for the 3D illustrated category icon tiles.
 * One shared lighting model (light source top-left) keeps the whole icon set
 * visually consistent — see components/ServiceIcon3D.tsx.
 */
export const iconTileGradients: Record<string, [string, string]> = {
  green: ['#4E9E77', '#2F6B4F'],
  gold: ['#EFC069', '#D9A441'],
  sky: ['#6FB6E8', '#3B7FC4'],
  coral: ['#F2937C', '#D9614A'],
  violet: ['#A88FE0', '#7A5FC4'],
  teal: ['#5FC4BC', '#2E8F88'],
  clay: ['#D3A98A', '#A9765A'],
  rose: ['#EF9BB4', '#D2648B'],
};

export type IconTileTone = keyof typeof iconTileGradients;

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

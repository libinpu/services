import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import {
  NotoSansMalayalam_400Regular,
  NotoSansMalayalam_500Medium,
  NotoSansMalayalam_600SemiBold,
  NotoSansMalayalam_700Bold,
} from '@expo-google-fonts/noto-sans-malayalam';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { LanguageProvider } from '@/lib/language-context';
import { ThemeProvider, useTheme } from '@/lib/theme-context';

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Noto-Sans-Malayalam-Regular': NotoSansMalayalam_400Regular,
    'Noto-Sans-Malayalam-Medium': NotoSansMalayalam_500Medium,
    'Noto-Sans-Malayalam-SemiBold': NotoSansMalayalam_600SemiBold,
    'Noto-Sans-Malayalam-Bold': NotoSansMalayalam_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && fontsLoaded) {
      const styleId = 'malayalam-font-fallback';
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        @font-face {
          font-family: 'Noto Sans Malayalam';
          font-weight: 400;
          src: url('https://fonts.gstatic.com/s/notosansmalayalam/v28/sJoi3-2xKqOkEklVHRgsrYyL4AtxAomUQV5Tb0z0jg.woff2') format('woff2');
          font-display: swap;
        }
        @font-face {
          font-family: 'Noto Sans Malayalam';
          font-weight: 500;
          src: url('https://fonts.gstatic.com/s/notosansmalayalam/v28/sJoi3-2xKqOkEklVHRgsrYyL4AtxAomUQV5Tb0z0jg.woff2') format('woff2');
          font-display: swap;
        }
        @font-face {
          font-family: 'Noto Sans Malayalam';
          font-weight: 600;
          src: url('https://fonts.gstatic.com/s/notosansmalayalam/v28/sJoi3-2xKqOkEklVHRgsrYyL4AtxAomUQV5Tb0z0jg.woff2') format('woff2');
          font-display: swap;
        }
        @font-face {
          font-family: 'Noto Sans Malayalam';
          font-weight: 700;
          src: url('https://fonts.gstatic.com/s/notosansmalayalam/v28/sJoi3-2xKqOkEklVHRgsrYyL4AtxAomUQV5Tb0z0jg.woff2') format('woff2');
          font-display: swap;
        }
        /* Global font stack includes Malayalam fallback */
        body, html, #root {
          font-family: 'Inter', 'Noto Sans Malayalam', system-ui, sans-serif;
        }
        /* When Malayalam is active, apply proper rendering */
        [lang="ml"], [data-lang="ml"] {
          font-family: 'Noto Sans Malayalam', 'Inter', system-ui, sans-serif !important;
          line-height: 1.7 !important;
          letter-spacing: 0.01em !important;
          word-spacing: normal !important;
          font-feature-settings: "kern" on, "liga" on, "calt" on, "mark" on, "mkmk" on !important;
          text-rendering: optimizeLegibility !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
        }
        [lang="ml"] *, [data-lang="ml"] * {
          font-family: 'Noto Sans Malayalam', 'Inter', system-ui, sans-serif !important;
          line-height: 1.7 !important;
          letter-spacing: 0.01em !important;
          font-feature-settings: "kern" on, "liga" on, "calt" on, "mark" on, "mkmk" on !important;
          text-rendering: optimizeLegibility !important;
        }
        /* Malayalam combining marks and chill letters need proper baseline */
        [data-lang="ml"] Text, [data-lang="ml"] text {
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          font-feature-settings: "kern" on, "liga" on, "calt" on, "mark" on, "mkmk" on !important;
        }
        /* Fix for Malayalam numerals alignment */
        [data-lang="ml"] [class*="fontFamily"] {
          font-family: 'Noto Sans Malayalam', 'Inter', system-ui, sans-serif !important;
        }
      `;
    }
  }, [fontsLoaded, fontError]);

  // Do not block the whole app while remote fonts finish loading.
  // This keeps the first screen responsive and avoids long blank startup periods.
  if (Platform.OS !== 'web' && !fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <AppShell />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Watches auth session — redirects to /login on logout, /(tabs) on login
function AuthGuard() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const onLoginScreen = segments[0] === 'login';
    const onRootScreen = segments[0] === undefined;
    const isPublicScreen = onLoginScreen || onRootScreen;

    if (!session) {
      if (!isPublicScreen) {
        router.replace('/login');
      }
      return;
    }

    if (isPublicScreen) {
      router.replace('/(tabs)');
    }

    if (!session && inTabsGroup) {
      router.replace('/login');
    }
  }, [session, loading, segments, router]);

  return null;
}

function AppShell() {
  const { isDark } = useTheme();
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    if (Platform.OS === 'web') {
      // On web: use Supabase's built-in OAuth redirect (server handles token exchange)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) return { error: error.message };
      // signInWithOAuth triggers a page redirect, so nothing else runs here
      return { error: null };
    } else {
      // On native: use expo-auth-session with PKCE (no client secret needed)
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'myapp' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) return { error: error.message };
      if (!data?.url) return { error: 'Could not get Google sign-in URL.' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { error: null };
      }

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');

        if (accessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? '',
          });
          if (sessionError) return { error: sessionError.message };
          return { error: null };
        }
      }

      return { error: 'Google sign-in failed.' };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Google sign-in failed.' };
  }
}

export { WebBrowser };

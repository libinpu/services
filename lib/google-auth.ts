import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const GOOGLE_CLIENT_SECRET =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ?? '';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!GOOGLE_CLIENT_ID) {
    return {
      error:
        'Google sign-in is not configured. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your environment.',
    };
  }

  try {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'myapp' });
    const state = Math.random().toString(36).substring(2);

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      state,
      usePKCE: true,
      extraParams: { prompt: 'select_account' },
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'dismiss' || result.type === 'cancel') {
      return { error: null };
    }

    if (result.type !== 'success') {
      return { error: 'Google sign-in was cancelled or failed.' };
    }

    const { code, state: returnedState } = result.params;
    if (!code || returnedState !== state) {
      return { error: 'Google sign-in response was invalid.' };
    }

    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET || undefined,
        code,
        redirectUri,
        extraParams: request.codeVerifier
          ? { code_verifier: request.codeVerifier }
          : {},
      },
      discovery
    );

    const { accessToken: providerToken, idToken } = tokenResponse;
    if (!providerToken && !idToken) {
      return { error: 'Google did not return a valid token.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken ?? providerToken,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Google sign-in failed.' };
  }
}

export { WebBrowser, Linking };

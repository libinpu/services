import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Fallbacks ensure the client initializes even when the bundler fails to
// inline the EXPO_PUBLIC_* env vars (e.g. stale cache or missing .env in the
// build environment). The anon key is safe to ship to the client by design.
const FALLBACK_SUPABASE_URL = 'https://wrozyadpfcktedltxhox.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY ='sb_publishable_5np-bqp5_mm7nxtV8bKDYQ_T8TKauFK';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    AsyncStorage.removeItem(key);
  },
};

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [
      !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
      !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    ]
      .filter(Boolean)
      .join(', ');

    const message =
      `Supabase environment variables are missing (${missing}). ` +
      `Add them to your .env file at the project root and restart the dev server ` +
      `with a cleared cache (expo start --clear).`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      console.error(message);
    }

    throw new Error(message);
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
      storage: Platform.OS === 'web' ? window.localStorage : ExpoSecureStoreAdapter,
    },
  });
}

export const supabase = createSupabaseClient();

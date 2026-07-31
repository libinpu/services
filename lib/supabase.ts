import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Fallbacks ensure the client initializes even when the bundler fails to
// inline the EXPO_PUBLIC_* env vars (e.g. stale cache or missing .env in the
// build environment). The anon key is safe to ship to the client by design.
const FALLBACK_SUPABASE_URL = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

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
      detectSessionInUrl: false,
      storage: Platform.OS === 'web' ? window.localStorage : ExpoSecureStoreAdapter,
    },
  });
}

export const supabase = createSupabaseClient();

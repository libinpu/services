import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { cache } from './cache';
import { dedupeRequest } from './query';
import { signInWithGoogle as googleSignIn } from './google-auth';
import type { Profile, Language } from './types';

interface AuthContextValue {
  session: { user: { id: string; email?: string } } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLanguage: (lang: Language) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const cacheKey = `profile:${userId}`;
    const cached = cache.get<Profile>(cacheKey);
    if (cached) {
      setProfile(cached);
      return;
    }
    const { data, error } = await dedupeRequest(cacheKey, () => supabase
      .from('profiles')
      .select('id, role, full_name, phone, email, avatar_url, preferred_language, zone_id, is_active, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle());
    if (error) {
      return;
    }
    if (data) cache.set(cacheKey, data as Profile, 5 * 60 * 1000);
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    let isActive = true;

    const initializeAuth = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!isActive) return;

      setSession(s as AuthContextValue['session']);

      if (s?.user?.id) {
        void fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    void initializeAuth();

    // onAuthStateChange is registered only once on mount.
    // Keeping session?.user?.id in the dep array would re-register this
    // listener on every login, creating duplicate subscriptions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!isActive) return;

      setSession(s as AuthContextValue['session']);
      // TOKEN_REFRESHED is frequent and does not change the profile. Fetching it
      // here created an otherwise invisible steady stream of profile queries.
      if (s?.user?.id && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        cache.invalidate(`profile:${s.user.id}`);
        void fetchProfile(s.user.id);
      } else if (!s?.user?.id) {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await fetchProfile(data.user.id);
    }
    return { error: null };
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    return googleSignIn();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  const updateLanguage = useCallback(async (lang: Language) => {
    if (!session?.user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ preferred_language: lang, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    if (!error && profile) {
      setProfile({ ...profile, preferred_language: lang });
      cache.set(`profile:${session.user.id}`, { ...profile, preferred_language: lang });
    }
  }, [session, profile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile, updateLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

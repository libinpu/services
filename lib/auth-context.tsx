import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
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
    console.log('[DEBUG] AuthContext: fetchProfile', { userId });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[DEBUG] AuthContext: fetchProfile error', error);
      return;
    }
    console.log('[DEBUG] AuthContext: fetchProfile success', { profileId: data?.id, role: data?.role });
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[DEBUG] AuthContext: getSession', { session: !!s, userId: s?.user?.id });
      setSession(s as AuthContextValue['session']);
      if (s?.user?.id) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // onAuthStateChange is registered only once on mount.
    // Keeping session?.user?.id in the dep array would re-register this
    // listener on every login, creating duplicate subscriptions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('[DEBUG] AuthContext: onAuthStateChange', { event, session: !!s, userId: s?.user?.id });
      setSession(s as AuthContextValue['session']);
      if (s?.user?.id) {
        (async () => {
          await fetchProfile(s.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    console.log('[DEBUG] AuthContext: refreshProfile start', { userId: session?.user?.id });
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
    console.log('[DEBUG] AuthContext: refreshProfile complete', { userId: session?.user?.id });
  }, [session, fetchProfile]);

  const updateLanguage = useCallback(async (lang: Language) => {
    if (!session?.user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ preferred_language: lang, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    if (!error && profile) {
      setProfile({ ...profile, preferred_language: lang });
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

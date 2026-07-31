import React, { createContext, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { translate, type TranslationKey } from './i18n';
import type { Language } from './types';
import { useAuth } from './auth-context';

interface LanguageContextValue {
  lang: Language;
  t: (key: TranslationKey) => string;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateLanguage } = useAuth();
  const lang = profile?.preferred_language || 'en';

  const t = (key: TranslationKey) => translate(key, lang);

  const setLang = (newLang: Language) => {
    updateLanguage(newLang);
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('data-lang', lang);
      const root = document.getElementById('root');
      if (root) {
        root.setAttribute('data-lang', lang);
      }
    }
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

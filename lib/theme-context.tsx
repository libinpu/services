import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance } from 'react-native';
import { setActiveTheme, getThemeMode, type ThemeMode } from './theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@seva_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light') {
        applyMode('light');
      } else {
        // The supplied BEIGE reference is the product default. Migrate any
        // legacy dark preference so the visible app matches the new system.
        applyMode('light');
      }
    }).catch(() => {
      applyMode('light');
    });
  }, []);

  const applyMode = useCallback((newMode: ThemeMode) => {
    setActiveTheme(newMode);
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  }, []);

  // Sync when the system appearance changes (only if user hasn't set a preference yet)
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // We intentionally do NOT auto-follow system theme once user has set a preference
      // Uncomment below to re-enable system-following behaviour:
      // const newMode: ThemeMode = colorScheme === 'light' ? 'light' : 'dark';
      // applyMode(newMode);
    });
    return () => subscription.remove();
  }, [applyMode]);

  const toggle = useCallback(() => {
    applyMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, applyMode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    applyMode(newMode);
  }, [applyMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark: mode === 'dark', toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

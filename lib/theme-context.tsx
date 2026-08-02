import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { setActiveTheme, getThemeMode, type ThemeMode } from './theme';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemScheme === 'light' ? 'light' : 'dark');

  const applyMode = useCallback((newMode: ThemeMode) => {
    setActiveTheme(newMode);
    setModeState(newMode);
  }, []);

  // Sync when the system appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const newMode: ThemeMode = colorScheme === 'light' ? 'light' : 'dark';
      applyMode(newMode);
    });
    return () => subscription.remove();
  }, [applyMode]);

  // Also sync if useColorScheme changes (web / initial load)
  useEffect(() => {
    const newMode: ThemeMode = systemScheme === 'light' ? 'light' : 'dark';
    applyMode(newMode);
  }, [systemScheme, applyMode]);

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

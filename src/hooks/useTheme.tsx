import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type ThemeId = 'dark' | 'light' | 'pink' | 'blue';

const THEME_KEY = 'vaultflow_theme';

export const THEMES: { id: ThemeId; label: string; preview: string }[] = [
  { id: 'dark', label: '暗黑', preview: '#0B0E14' },
  { id: 'light', label: '明亮', preview: '#F8FAFC' },
  { id: 'pink', label: '浅粉', preview: '#FAF5F5' },
  { id: 'blue', label: '浅蓝', preview: '#F0F5FA' },
];

function readTheme(): ThemeId {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored && THEMES.some(t => t.id === stored)) return stored as ThemeId;
  return 'dark';
}

function applyThemeToDom(theme: ThemeId) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

const ThemeContext = createContext<{
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const t = readTheme();
    applyThemeToDom(t);
    return t;
  });

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    applyThemeToDom(next);
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

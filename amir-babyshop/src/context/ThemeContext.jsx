import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const THEME_KEY = 'amir_theme'; // 'light' | 'dark'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      // 1. Check for saved preference
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;

      // 2. Fall back to system preference
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }

      return 'light';
    } catch {
      return 'light';
    }
  });

  /* Apply class to <html> + persist whenever theme changes */
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isDark: theme === 'dark',
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
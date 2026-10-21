import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { preferencesService } from '../services/api';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const THEME_KEY = 'amir_theme'; // localStorage fallback for guests

export function ThemeProvider({ children }) {
  const { user } = useAuth();

  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch { return 'light'; }
  });

  /* Tracks whether we've finished loading the user's saved pref from backend */
  const hydratedRef = useRef(false);

  /* ─── On login: load user's saved preference ─── */
  useEffect(() => {
    if (!user) { hydratedRef.current = false; return; }
    let cancelled = false;
    (async () => {
      try {
        const prefs = await preferencesService.get();
        if (cancelled || !prefs) return;
        const saved = prefs.theme;
        if (saved === 'light' || saved === 'dark') {
          setThemeState(saved);
        }
      } catch (err) {
        console.warn('[Theme] load failed:', err.message);
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* ─── Apply to <html> whenever theme changes ─── */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  /* ─── Save to backend — ONLY after hydration, not on initial load ─── */
  useEffect(() => {
    if (!user) return;
    if (!hydratedRef.current) return;   // ← the fix
    preferencesService.update({ theme }).catch(err =>
      console.warn('[Theme] save failed:', err.message)
    );
  }, [theme, user]);

  const toggleTheme = useCallback(() => {
    setThemeState(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isDark: theme === 'dark',
      setTheme: setThemeState,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
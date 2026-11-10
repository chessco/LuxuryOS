import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeVariant = 'pitaya' | 'notion' | 'cared';
export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  variant: ThemeVariant;
  mode: ThemeMode;
  setVariant: (variant: ThemeVariant) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const themeVariants: ThemeVariant[] = ['pitaya', 'notion', 'cared'];
const themeModes: ThemeMode[] = ['light', 'dark'];
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<ThemeVariant>(() => {
    const saved = localStorage.getItem('theme-variant') as ThemeVariant;
    return themeVariants.includes(saved) ? saved : 'cared';
  });
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode;
    return themeModes.includes(saved) ? saved : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const effectiveMode = variant === 'cared' ? 'dark' : mode;

    root.classList.remove('light', 'dark', 'theme-pitaya', 'theme-notion', 'theme-cared');
    root.classList.add(effectiveMode, `theme-${variant}`);
    localStorage.setItem('theme-variant', variant);
    localStorage.setItem('theme-mode', mode);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      effectiveMode === 'dark' ? '#000000' : '#ffffff',
    );
  }, [mode, variant]);

  const toggleMode = () => {
    if (variant === 'cared') {
      setVariant('pitaya');
      setMode('light');
      return;
    }
    setMode((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ variant, mode, setVariant, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

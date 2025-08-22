import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { THEMES, type Theme } from './themes';
import { AppConfig } from '@/config/app.config';

type ThemeCtx = {
  theme: Theme;
  setThemeId: (id: string) => void;
  allThemes: Theme[];
};

const Ctx = createContext<ThemeCtx | null>(null);
const LS_KEY = 'agentllm.theme';

function applyTheme(t: Theme){
  const root = document.documentElement;
  root.style.setProperty('--accent', t.vars.accent);
  root.style.setProperty('--accent-dim', t.vars.accentDim);
  if (t.vars.panel) root.style.setProperty('--panel', t.vars.panel);
}

export function ThemeProvider({ children }: { children: React.ReactNode }){
  const defaultId = (localStorage.getItem(LS_KEY) || AppConfig.defaultThemeId);
  const initial = THEMES.find(t => t.id === defaultId) || THEMES[0];
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => { applyTheme(theme); localStorage.setItem(LS_KEY, theme.id); }, [theme]);

  const value = useMemo<ThemeCtx>(() => ({
    theme,
    setThemeId: (id: string) => {
      const next = THEMES.find(t => t.id === id) || THEMES[0];
      setTheme(next);
    },
    allThemes: THEMES
  }), [theme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(){
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}

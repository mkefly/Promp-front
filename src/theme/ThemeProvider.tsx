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

// Helper so we don't set empty values
function setVar(name: string, value?: string) {
  if (!value) return;
  document.documentElement.style.setProperty(name, value);
}

function applyTheme(t: Theme) {
  const root = document.documentElement;

  // colors
  setVar('--accent', t.vars.accent);
  setVar('--accent-dim', t.vars.accentDim);
  setVar('--panel', t.vars.panel);

  // fonts (NEW)
  // These map to CSS variables used in your stylesheet:
  // body/UI: var(--ui-font); code/inputs: var(--code-font)
  setVar('--ui-font', t.vars.uiFont || '"Press Start 2P", system-ui, monospace');
  setVar('--code-font', t.vars.codeFont || '"Fira Code", "IBM Plex Mono", ui-monospace, monospace');

  // Optional: force a reflow to ensure font var takes effect immediately on large pages
  // root.style.visibility = 'hidden'; root.offsetHeight; root.style.visibility = '';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Guard against SSR/No-Storage environments
  const defaultId =
    (typeof window !== 'undefined' && localStorage.getItem(LS_KEY)) ||
    AppConfig.defaultThemeId;

  const initial = THEMES.find(t => t.id === defaultId) || THEMES[0];
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, theme.id);
    }
  }, [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      setThemeId: (id: string) => {
        const next = THEMES.find(t => t.id === id) || THEMES[0];
        setTheme(next);
      },
      allThemes: THEMES,
    }),
    [theme]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}

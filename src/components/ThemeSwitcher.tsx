import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

export function ThemeSwitcher(){
  const { theme, setThemeId, allThemes } = useTheme();
  return (
    <label className="text-xs dim flex items-center gap-2">
      <span className="k">theme</span>
      <select
        className="select-flat"
        value={theme.id}
        onChange={(e)=>setThemeId(e.target.value)}
        aria-label="Theme"
      >
        {allThemes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </label>
  );
}

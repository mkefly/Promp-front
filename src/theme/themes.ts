export type Theme = {
  id: string;
  name: string;
  vars: {
    accent: string;
    accentDim: string;
    panel?: string;
    uiFont?: string;    // CSS font-family string
    codeFont?: string;  // CSS font-family string
  };
};


export const THEMES: Theme[] = [
  {
    id: 'neon-green',
    name: 'Neon Green',
    vars: {
      accent: '#00ff66',
      accentDim: '#00cc55',
      panel: 'rgba(0,20,0,.8)',
      uiFont: '"Press Start 2P", system-ui, monospace',
      codeFont: '"Press Start 2P", system-ui, monospace',
    }
  },
  {
    id: 'aqua',
    name: 'Aqua',
    vars: {
      accent: '#00ffd0',
      accentDim: '#00c9a8',
      panel: 'rgba(0,18,18,.8)',
      uiFont: 'Inter, system-ui, sans-serif',
      codeFont: '"JetBrains Mono", ui-monospace, monospace',
    }
  },
  {
    id: 'amber',
    name: 'Amber',
    vars: {
      accent: '#e6ff00',
      accentDim: '#b4cc00',
      panel: 'rgba(18,18,0,.8)',
      uiFont: 'Inter, system-ui, sans-serif',
      codeFont: '"Fira Code", ui-monospace, monospace',
    }
  },
  {
    id: 'violet',
    name: 'Violet',
    vars: {
      accent: '#c07cff',
      accentDim: '#8a5ac7',
      panel: 'rgba(18,0,18,.8)',
      uiFont: 'Inter, system-ui, sans-serif',
      codeFont: '"JetBrains Mono", ui-monospace, monospace',
    }
  },
];

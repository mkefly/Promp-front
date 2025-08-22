export type Theme = {
  id: string;
  name: string;
  vars: {
    accent: string;
    accentDim: string;
    panel?: string;
  };
};

export const THEMES: Theme[] = [
  { id: 'neon-green', name: 'Neon Green', vars: { accent: '#00ff66', accentDim: '#00cc55', panel: 'rgba(0,20,0,.8)' } },
  { id: 'aqua', name: 'Aqua', vars: { accent: '#00ffd0', accentDim: '#00c9a8', panel: 'rgba(0,18,18,.8)' } },
  { id: 'amber', name: 'Amber', vars: { accent: '#e6ff00', accentDim: '#b4cc00', panel: 'rgba(18,18,0,.8)' } },
  { id: 'violet', name: 'Violet', vars: { accent: '#c07cff', accentDim: '#8a5ac7', panel: 'rgba(18,0,18,.8)' } },
];

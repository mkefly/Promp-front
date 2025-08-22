export type AppMode = 'demo' | 'live';

const env = (key: string, fallback: string) => import.meta.env[key as any] ?? fallback;

export const AppConfig = {
  mode: (env('VITE_APP_MODE', 'demo') as AppMode),
  stream: {
    netMin: Number(env('VITE_STREAM_NET_MIN', '70')),
    netMax: Number(env('VITE_STREAM_NET_MAX', '180')),
    charMin: Number(env('VITE_STREAM_CHAR_MIN', '6')),
    charMax: Number(env('VITE_STREAM_CHAR_MAX', '18')),
  },
  defaultBackendId: env('VITE_DEFAULT_BACKEND', 'alpha'),
  defaultThemeId: env('VITE_DEFAULT_THEME', 'neon-green'),
  features: {
    virtualLog: String(env('VITE_FEATURE_VIRTUAL_LOG', 'false')).toLowerCase() === 'true',
    pets: true,                  // <- enable pets
    promptComposer: true         // <- enable expanded composer (next section)
  }
} as const;

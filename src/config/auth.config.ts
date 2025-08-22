const env = (k: string, d?: string) => import.meta.env[k as any] ?? d;

export const ApiKeyConfig = {
  defaultKey: String(env('VITE_API_KEY', '')),
  headerName: String(env('VITE_API_KEY_HEADER', 'Authorization')),
  prefix: String(env('VITE_API_KEY_PREFIX', 'Bearer')).trim(),
};

export const apiKeyHeaderValue = (key: string) => {
  if (!key) return '';
  return ApiKeyConfig.prefix ? `${ApiKeyConfig.prefix} ${key}` : key;
};

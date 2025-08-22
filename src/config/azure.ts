const env = (k: string, d?: string) => import.meta.env[k as any] ?? d;

export const AzureConfig = {
  tenantId: String(env('VITE_AAD_TENANT_ID', '')),
  clientId: String(env('VITE_AAD_CLIENT_ID', '')),
  redirectUri: String(env('VITE_AAD_REDIRECT_URI', window.location.origin)),
  scopes: String(env('VITE_AAD_SCOPES', 'user.read')).split(/\s+/).filter(Boolean),
};

export const msalConfig = {
  auth: {
    clientId: AzureConfig.clientId,
    authority: AzureConfig.tenantId ? `https://login.microsoftonline.com/${AzureConfig.tenantId}` : 'https://login.microsoftonline.com/common',
    redirectUri: AzureConfig.redirectUri,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

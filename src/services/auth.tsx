import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ApiKeyConfig, apiKeyHeaderValue } from '@/config/auth.config';
import type { Backend } from '@/types';
import { useSso } from './sso';
import { AzureConfig } from '@/config/azure';

type AuthHeaders = Record<string, string>;

type AuthCtx = {
  apiKey: string;
  setApiKey: (k: string) => void;
  clearApiKey: () => void;
  getHeadersForBackend: (b: Backend) => Promise<AuthHeaders>;
};

const Ctx = createContext<AuthCtx | null>(null);
const LS_KEY = 'agentllm.apiKey';

export function AuthProvider({ children }: { children: React.ReactNode }){
  const sso = useSso();
  const [apiKey, setApiKeyState] = useState<string>('');

  useEffect(() => {
    const fromEnv = ApiKeyConfig.defaultKey || '';
    const fromLs = localStorage.getItem(LS_KEY) || '';
    setApiKeyState(fromLs || fromEnv);
  }, []);

  const setApiKey = (k: string) => {
    setApiKeyState(k);
    if (k) localStorage.setItem(LS_KEY, k);
    else localStorage.removeItem(LS_KEY);
  };

  const clearApiKey = () => setApiKey('');

  const getHeadersForBackend = async (b: Backend): Promise<AuthHeaders> => {
    if (!b.requiresAuth || b.requiresAuth == 'none') return {};
    if (b.requiresAuth === 'apiKey') {
      if (!apiKey) throw new Error('API key required. Set it from the header.');
      return { [ApiKeyConfig.headerName]: apiKeyHeaderValue(apiKey) };
    }
    if (b.requiresAuth === 'sso') {
      const token = await sso.getToken(AzureConfig.scopes);
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const value = useMemo<AuthCtx>(()=>({
    apiKey,
    setApiKey,
    clearApiKey,
    getHeadersForBackend,
  }), [apiKey, sso]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(){
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

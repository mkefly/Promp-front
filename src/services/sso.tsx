import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { PublicClientApplication, EventType, AccountInfo, AuthenticationResult, InteractionRequiredAuthError } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig, AzureConfig } from '@/config/azure';

type SsoCtx = {
  isAuthenticated: boolean;
  account: AccountInfo | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => void;
  getToken: (scopes?: string[]) => Promise<string>;
};

const Ctx = createContext<SsoCtx | null>(null);

export const msalInstance = new PublicClientApplication(msalConfig);

async function ensureActiveAccount() {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
    msalInstance.setActiveAccount(accounts[0]);
  }
}

export function SsoProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>(msalInstance.getActiveAccount());
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await msalInstance.handleRedirectPromise();
      } catch {}
      await ensureActiveAccount();
      setAccount(msalInstance.getActiveAccount() || null);
    })();

    const cb = msalInstance.addEventCallback((evt) => {
      if (evt.eventType === EventType.LOGIN_SUCCESS && evt.payload) {
        const p = evt.payload as AuthenticationResult;
        msalInstance.setActiveAccount(p.account);
        setAccount(p.account);
      }
      if (evt.eventType === EventType.LOGOUT_SUCCESS) {
        setAccount(null);
        setToken(null);
      }
    });
    return () => { if (cb) msalInstance.removeEventCallback(cb); };
  }, []);

  const login = useCallback(async () => {
    await msalInstance.loginPopup({ scopes: AzureConfig.scopes });
    await ensureActiveAccount();
    setAccount(msalInstance.getActiveAccount() || null);
  }, []);

  const logout = useCallback(() => {
    const acc = msalInstance.getActiveAccount();
    msalInstance.logoutPopup({ account: acc || undefined });
  }, []);

  const getToken = useCallback(async (scopes?: string[]) => {
    const active = msalInstance.getActiveAccount();
    if (!active) throw new Error('Not authenticated');
    const req = { account: active, scopes: scopes && scopes.length ? scopes : AzureConfig.scopes };

    try {
      const res = await msalInstance.acquireTokenSilent(req);
      if (!res.accessToken) throw new Error('No access token in response');
      if (!scopes || scopes.join(' ') === AzureConfig.scopes.join(' ')) setToken(res.accessToken);
      return res.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        const res = await msalInstance.acquireTokenPopup(req);
        if (!res.accessToken) throw new Error('No access token in response');
        if (!scopes || scopes.join(' ') === AzureConfig.scopes.join(' ')) setToken(res.accessToken);
        return res.accessToken;
      }
      throw e;
    }
  }, []);

  const value = useMemo(() => ({
    isAuthenticated: !!account,
    account,
    token,
    login,
    logout,
    getToken,
  }), [account, token, login, logout, getToken]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSso() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSso must be used within SsoProvider');
  return v;
}

export function SsoRoot({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <SsoProvider>{children}</SsoProvider>
    </MsalProvider>
  );
}

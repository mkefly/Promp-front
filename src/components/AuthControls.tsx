import React, { useState } from 'react';
import { useAuth } from '@/services/auth';
import { useSso } from '@/services/sso';

export function AuthControls(){
  const { apiKey, setApiKey, clearApiKey } = useAuth();
  const { isAuthenticated, login, logout } = useSso();
  const [localKey, setLocalKey] = useState(apiKey);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="dim">·</span>

      {isAuthenticated
        ? <button className="btn" onClick={logout}>sign out</button>
        : <button className="btn" onClick={login}>sign in</button>}
    </div>
  );
}

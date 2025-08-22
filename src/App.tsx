import React from 'react';
import AgentConsole from '@/features/chat/AgentConsole';
import { SsoRoot } from '@/services/sso';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthProvider } from '@/services/auth';

export default function App(){
  return (
    <ThemeProvider>
      <SsoRoot>
        <AuthProvider>
          <AgentConsole />
        </AuthProvider>
      </SsoRoot>
    </ThemeProvider>
  );
}

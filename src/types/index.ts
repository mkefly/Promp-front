export type Role = 'user' | 'assistant';
export type Message = { id: string; role: Role; content: string; isMarkdown?: boolean };

export type AuthKind = 'none' | 'apiKey' | 'sso';

export type Backend = {
  id: string;
  name: string;
  url: string;
  accent: string;
  desc: string;
  badges: string[];
  latency: number;
  requiresAuth?: AuthKind;
  demo?: boolean;
};

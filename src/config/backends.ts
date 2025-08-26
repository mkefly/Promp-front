import { z } from 'zod';
import type { Backend } from '@/types';

const BackendSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  accent: z.string().min(1),
  desc: z.string(),
  badges: z.array(z.string()),
  requiresAuth: z.enum(['none','apiKey','sso']).optional(),
  demo: z.boolean().optional(),
});

const BackendsSchema = z.array(BackendSchema).min(1);

const RAW: Backend[] = [
  { id: 'alpha', name: 'alpha-agent', url: 'https://api.alpha/v1', accent: '#00ff66', desc: 'Generalist agent with balanced reasoning.', badges: ['tools','chat','images'],  demo: true, requiresAuth: 'none' },
  { id: 'bravo', name: 'bravo-rag', url: 'https://api.bravo/v1', accent: '#00ffd0', desc: 'Retrieval-augmented with enterprise KB.', badges: ['RAG','citations','fast'], requiresAuth: 'sso' },
  { id: 'charlie', name: 'charlie-code', url: 'https://api.charlie/v1', accent: '#e6ff00', desc: 'Coding-focused with unit test hints.', badges: ['code','tests','perf'], demo: true, requiresAuth: 'apiKey' },
  { id: 'delta', name: 'delta-vision', url: 'https://api.delta/v1', accent: '#72ff9e', desc: 'Vision model for screenshots & docs.', badges: ['vision','ocr','layout'], requiresAuth: 'sso' },
  { id: 'adelta', name: 'delta-vision', url: 'https://api.delta/v1', accent: '#72ff9e', desc: 'Vision model for screenshots & docs.', badges: ['vision','ocr','layout'], requiresAuth: 'sso' },
  { id: 'ade4lta', name: 'delta-vision', url: 'https://api.delta/v1', accent: '#72ff9e', desc: 'Vision model for screenshots & docs.', badges: ['vision','ocr','layout'], requiresAuth: 'sso' },
];

export const BACKENDS: Backend[] = (() => {
  const parsed = BackendsSchema.safeParse(RAW);
  if (!parsed.success) {
    console.error('Invalid BACKENDS config:', parsed.error.issues);
    return [{ id: 'fallback', name: 'fallback-demo', url: 'https://example.invalid', accent: '#00ff66', desc: 'Fallback demo backend', badges: ['chat'], latency: 0, demo: true, requiresAuth: 'none' }];
  }
  return parsed.data;
})();

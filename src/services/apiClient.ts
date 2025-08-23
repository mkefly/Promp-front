import type { Backend } from '@/types';
import { pickDemo, streamTextDemo } from '@/lib/streamer';
import { AppConfig } from '@/config/app.config';
import { useAuth } from '@/services/auth';
import { useRef } from 'react'; // ⬅️ NEW

export type StreamCallbacks = {
  onToken: (t: string) => void;
  onError?: (e: any) => void;
};

export async function streamDemo(cb: StreamCallbacks, signal?: AbortSignal){ // ⬅️ signal (optional)
  const demo = pickDemo();
  // Make demo cancellable without changing streamTextDemo’s API
  const run = (async () => {
    await streamTextDemo(demo.text, cb.onToken);
    return { isMarkdown: demo.md };
  })();

  if (!signal) return await run;

  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  const aborted = new Promise<never>((_, reject) =>
    signal.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')), { once: true }
    )
  );
  return await Promise.race([run, aborted]);
}

function isSse(res: Response){
  const ct = res.headers.get('content-type') || '';
  return ct.includes('text/event-stream');
}

async function streamSse(res: Response, cb: StreamCallbacks){
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = raw.split(/\n/);
      for (const line of lines) {
        const m = /^data:\s?(.*)$/.exec(line);
        if (m) {
          const data = m[1];
          try {
            const obj = JSON.parse(data);
            const text = obj.delta ?? obj.content ?? obj.text ?? data;
            if (text) cb.onToken(String(text));
          } catch {
            cb.onToken(data);
          }
        }
      }
    }
  }
  if (buffer) {
    cb.onToken(buffer);
  }
}

async function streamNdjsonOrText(res: Response, cb: StreamCallbacks){
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        const text = obj.delta ?? obj.content ?? obj.text ?? trimmed;
        cb.onToken(String(text));
      } catch {
        cb.onToken(line);
      }
    }
  }
  if (buffer.trim()) {
    try {
      const obj = JSON.parse(buffer.trim());
      const text = obj.delta ?? obj.content ?? obj.text ?? buffer;
      cb.onToken(String(text));
    } catch {
      cb.onToken(buffer);
    }
  }
}

async function streamLiveInternal(
  backend: Backend,
  prompt: string,
  headers: Record<string,string>,
  cb: StreamCallbacks,
  signal?: AbortSignal // ⬅️ NEW
){
  try {
    const res = await fetch(`${backend.url}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ prompt }),
      signal, // ⬅️ pass abort signal to fetch
    });

    if (!res.ok || !res.body) {
      const fallback = `You said: ${prompt}\n\n(Live endpoint ${backend.url}/chat not reachable.)`;
      await streamTextDemo(fallback, cb.onToken);
      return { isMarkdown: false };
    }

    if (isSse(res)) {
      await streamSse(res, cb);
    } else {
      await streamNdjsonOrText(res, cb);
    }
    return { isMarkdown: true };
  } catch (e: any) {
    // Graceful cancel messaging
    if (e?.name === 'AbortError') {
      cb.onError?.('Stream stopped.');
    } else {
      cb.onError?.(e);
    }
    return { isMarkdown: false };
  }
}

export function useChatStreamer(){
  const auth = useAuth();
  const controllerRef = useRef<AbortController | null>(null); // ⬅️ NEW

  const run = async function(backend: Backend, prompt: string, cb: StreamCallbacks){
    // Abort any previous in-flight stream (optional behavior)
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    try {
      if (AppConfig.mode === 'demo' || backend.demo) {
        return await streamDemo(cb, ctrl.signal); // ⬅️ cancellable demo
      }
      const headers = await auth.getHeadersForBackend(backend);
      return await streamLiveInternal(backend, prompt, headers, cb, ctrl.signal);
    } finally {
      controllerRef.current = null;
    }
  } as (backend: Backend, prompt: string, cb: StreamCallbacks) => Promise<{ isMarkdown: boolean }>;

  // Attach a cancel method without changing your existing call site
  (run as any).cancel = () => controllerRef.current?.abort();

  return run as typeof run & { cancel: () => void };
}

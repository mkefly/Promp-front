import React, { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Backend } from '@/types';
import { BACKENDS } from '@/config/backends';
import { MarkdownRenderer, looksLikeMarkdown } from '@/lib/markdown';
import { AppConfig } from '@/config/app.config';
import { useChatStreamer } from '@/services/apiClient';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { AuthControls } from '@/components/AuthControls';
import { VirtualLog } from './VirtualLog';
import { Modal } from '@/components/Modal';
import { PromptComposer } from '@/components/PromptComposer';

function useClock() {
  const [clock, setClock] = useState<string>(new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);
  return clock;
}

export default function AgentConsole() {
  const defaultBackend = useMemo(
    () => BACKENDS.find(b => b.id === AppConfig.defaultBackendId) || BACKENDS[0],
    []
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [active, setActive] = useState<Backend>(defaultBackend);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hIndex, setHIndex] = useState<number>(-1);
  const [showComposer, setShowComposer] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const runStream = useChatStreamer();
  const clock = useClock();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  function addMessage(m: Message) {
    setMessages(prev => [...prev, m]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setHistory(prev => [...prev, text]);
    setHIndex(-1);
    addMessage({ id: uuidv4(), role: 'user', content: text, isMarkdown: false });
    setInput('');

    const aId = uuidv4();
    addMessage({ id: aId, role: 'assistant', content: '', isMarkdown: true });

    setStreaming(true);
    try {
      await runStream(active, text, {
        onToken: (ch) => {
          setMessages(prev =>
            prev.map(m => (m.id === aId ? { ...m, content: m.content + ch } : m))
          );
        },
        onError: (e) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === aId
                ? { ...m, content: `Error: ${String(e)}`, isMarkdown: false }
                : m
            )
          );
        },
      });
    } finally {
      setStreaming(false);
    }
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault(); setShowPreview(p => !p); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault(); setShowComposer(true); return;
    }
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      const idx = hIndex < 0 ? history.length - 1 : Math.max(0, hIndex - 1);
      setHIndex(idx); setInput(history[idx] || '');
    }
    if (e.key === 'ArrowDown' && history.length) {
      e.preventDefault();
      const idx = hIndex < 0 ? -1 : Math.min(history.length - 1, hIndex + 1);
      setHIndex(idx); setInput(idx >= 0 ? history[idx] : '');
    }
  };

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  const LogArea = AppConfig.features.virtualLog ? (
    <VirtualLog messages={messages} streaming={streaming} />
  ) : (
    <div className="log">
      {messages.map(m => (
        <div key={m.id} className="line">
          <span className="dim">{m.role === 'user' ? '$ ' : '> '}</span>
          {m.isMarkdown ? (
            <span className="relative block">
              <button
                onClick={() => copy(m.content)}
                className="copy-icon"
                title="copy message"
              >
                copy
              </button>
              <MarkdownRenderer text={m.content} />
            </span>
          ) : (
            <span>{m.content}</span>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );

  return (
    <div className="shell">
      {/* Header */}
      <header className="header">
        <div className="dim glow">Prompt Engine</div>
        <div className="flex items-center gap-2 text-xs">
          <ThemeSwitcher />
          <AuthControls />
          <button className="btn" onClick={() => setShowSelector(true)}>agent: [{active.name}] </button>
        </div>
      </header>

      {/* Console */}
      <main className="console">
        {LogArea}

        <div className="prompt-bar relative flex items-center gap-3">
          {/* Left side: $ + input */}
          <div className="flex items-center flex-1 gap-2">
            <span className="glow">$</span>
            <input
              className="prompt-input glow flex-1"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                if (looksLikeMarkdown(e.target.value)) setShowPreview(true);
              }}
              onKeyDown={onKeyDown}
              disabled={streaming}
              autoFocus
            />
          </div>

          {/* Right side: status + buttons */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`dim ${streaming ? 'blink' : ''}`}>
              {streaming ? 'STREAMING' : 'READY'}
            </span>
            <button
              className="btn"
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
            >
              run
            </button>
            <button
              className="btn"
              onClick={() => setShowComposer(true)}
              disabled={streaming}
            >
              expand
            </button>
          </div>

          {showPreview && input && (
            <div className="preview markdown">
              <div className="text-xs dim mb-1">markdown preview (⌘/Ctrl+P to hide)</div>
              <MarkdownRenderer text={input} />
            </div>
          )}
        </div>
      </main>



      {/* Footer */}
      <footer className="footer">
        <div className="flex flex-col gap-1 text-xs">
          <div>
            mode: <span className="k">{AppConfig.mode}</span> · status:{" "}
            <span className="k">{streaming ? 'streaming' : 'idle'}</span>
          </div>
          <div>Powered by the UBS AIops team</div>
        </div>
        <div>{clock}</div>
      </footer>

      {/* Prompt Composer */}
      {AppConfig.features.promptComposer && (
        <Modal open={showComposer} onClose={() => setShowComposer(false)} title="Prompt Composer">
          <PromptComposer
            initial={input}
            onApply={txt => { setInput(txt); setShowComposer(false); }}
          />
        </Modal>
      )}

      {/* Backend Selector */}
      {showSelector && (
        <Modal open={showSelector} onClose={() => setShowSelector(false)} title="Select Agent">
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            {BACKENDS.map(b => (
              <button
                key={b.id}
                className="w-full text-left p-4 rounded-lg border
                           border-[color-mix(in_oklab,var(--accent)_35%,black)]
                           bg-[rgba(0,0,0,.35)] hover:bg-[rgba(0,50,0,.25)]
                           transition-colors"
                onClick={() => { setActive(b); setShowSelector(false); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="glow font-semibold" style={{ color: b.accent }}>
                    {b.name}
                  </div>
                  <div className="text-xs dim">~{b.latency}ms</div>
                </div>
                <div className="text-xs dim mb-1">{b.url}</div>
                <div className="text-sm mb-1">{b.desc}</div>
                <div className="text-xs dim">capabilities: {b.badges.join(', ')}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

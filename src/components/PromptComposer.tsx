import React, { useMemo, useState } from 'react';
import { MarkdownRenderer } from '@/lib/markdown';

const DEFAULT_TEMPLATES = [
  { id:'analysis', name:'Structured Analysis', body:`## Task\n\n## Constraints\n\n## Reasoning\n- \n\n## Answer\n` },
  { id:'code-review', name:'Code Review', body:`### Context\n\n### Issues\n- \n\n### Suggestions\n- \n` },
  { id:'rag-query', name:'RAG Query', body:`Use sources: {{sources}}\n\nUser question: {{question}}\n\nReturn citations.` },
];

export function PromptComposer({
  initial,
  onApply,
}:{
  initial: string;
  onApply: (text: string) => void;
}){
  const [text, setText] = useState(initial);
  const [tab, setTab] = useState<'edit'|'templates'>('edit');

  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    // rough token estimate ~ chars/4
    const tokens = Math.ceil(chars / 4);
    return { chars, words, tokens };
  }, [text]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-xs">
        <div className="k">chars: {stats.chars}</div>
        <div className="k">words: {stats.words}</div>
        <div className="k">~tokens: {stats.tokens}</div>
        <div className="ml-auto flex gap-2">
          <button className={`btn ${tab==='edit'?'glow':''}`} onClick={()=>setTab('edit')}>edit</button>
          <button className={`btn ${tab==='templates'?'glow':''}`} onClick={()=>setTab('templates')}>templates</button>
        </div>
      </div>

      {tab === 'edit' && (
        <textarea
          className="w-full min-h-[46vh] bg-[rgba(0,0,0,.6)] text-[16px] leading-6 p-3 rounded
                     border border-[color-mix(in_oklab,var(--accent)_35%,black)] outline-none"
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="Write your full prompt…"
        />
      )}

      {tab === 'templates' && (
        <div className="grid gap-2">
          {DEFAULT_TEMPLATES.map(t => (
            <button
              key={t.id}
              className="btn text-left"
              onClick={()=>setText(prev => (prev ? (prev + '\n\n' + t.body) : t.body))}
              title={t.name}
            >
              + {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button className="btn" onClick={()=>navigator.clipboard.writeText(text)}>copy</button>
        <button className="btn" onClick={()=>onApply(text)}>apply to prompt</button>
      </div>
    </div>
  );
}

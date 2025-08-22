import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/lib/markdown';

export function VirtualLog({
  messages,
  streaming
}: {
  messages: Message[];
  streaming: boolean;
}){
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 6,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  useEffect(() => {
    if (streaming) {
      const el = parentRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, streaming]);

  return (
    <div ref={parentRef} className="log">
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const m = messages[vi.index];
          return (
            <div
              key={m.id}
              ref={rowVirtualizer.measureElement}
              className="line"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <span className="dim">{m.role === 'user' ? '$ ' : '> '}</span>
              {m.isMarkdown ? (
                <span className="relative block">
                  <button className="copy-icon" onClick={()=>navigator.clipboard.writeText(m.content)} title="copy message">copy</button>
                  <MarkdownRenderer text={m.content} />
                </span>
              ) : (
                <span>{m.content}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

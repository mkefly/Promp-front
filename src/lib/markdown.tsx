import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { CopyIco, CodeIco, TableIco } from '@/lib/icons';

export const looksLikeMarkdown = (s: string) => /[#_*`>|-]|\|.*\|/.test(s);

async function copy(text: string){ try { await navigator.clipboard.writeText(text); } catch {} }

export function MarkdownRenderer({ text }: { text: string }){
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          code({inline, children, ...props}){
            const txt = String(children);
            if (inline) return <code {...props}>{children}</code>;
            return (
              <pre className="relative">
                <button className="copy-icon" onClick={()=>copy(txt)} title="copy code"><CodeIco/>copy</button>
                <code>{children}</code>
              </pre>
            );
          },
          table({children}){
            const extractText = (node: any): string => {
              if (!node) return '';
              if (typeof node === 'string') return node;
              if (Array.isArray(node)) return node.map(extractText).join('');
              if (typeof node === 'object' && node.props?.children) return extractText(node.props.children);
              return '';
            };
            const plain = extractText(children);
            return (
              <div className="relative">
                <button className="copy-icon" onClick={()=>copy(plain)} title="copy table"><TableIco/>copy</button>
                <table>{children}</table>
              </div>
            );
          },
          th({children}){ return <th>{children}</th>; },
          td({children}){ return <td>{children}</td>; },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

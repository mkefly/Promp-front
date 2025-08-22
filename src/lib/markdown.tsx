import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export const looksLikeMarkdown = (s: string) => /[#_*`>|-]|\|.*\|/.test(s);

async function copy(text: string){ try { await navigator.clipboard.writeText(text); } catch {} }

export function MarkdownRenderer({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // NOTE: don't destructure in the param list; TS types are too generic.
          code: (props: any) => {
            const { inline, children, ...rest } = props as any;
            const txt = String(children ?? '');
            if (inline) return <code {...rest}>{children}</code>;
            return (
              <pre className="relative">
                <button className="copy-icon" onClick={() => copy(txt)} title="copy code">copy</button>
                <code {...rest}>{children}</code>
              </pre>
            );
          },
          table: (props: any) => {
            const { children, ...rest } = props;
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
                <button className="copy-icon" onClick={() => copy(plain)} title="copy table">copy</button>
                <table {...rest}>{children}</table>
              </div>
            );
          },
          th: (p: any) => <th {...p}>{p.children}</th>,
          td: (p: any) => <td {...p}>{p.children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export const looksLikeMarkdown = (s: string) => /[#_*`>|-]|\|.*\|/.test(s);

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

const extractText = (node: any): string => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node && node.props?.children)
    return extractText(node.props.children);
  return '';
};

function PreWithCopy(props: any) {
  const { children, ...rest } = props;
  const plain = extractText(children);
  return (
    <pre className="relative" {...rest}>
      <button
        className="copy-icon"
        onClick={() => copy(plain)}
        title="copy code"
      >
        copy
      </button>
      {children}
    </pre>
  );
}

export function MarkdownRenderer({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Inline code only — do NOT wrap in <pre> here.
          code: (props: any) => {
            const { inline, children, ...rest } = props as any;
            if (inline) return <code {...rest}>{children}</code>;
            // For block code, let the <pre> renderer handle the wrapper & copy button
            return <code {...rest}>{children}</code>;
          },
          pre: (props: any) => <PreWithCopy {...props} />, // one copy button per block

          table: (props: any) => {
            const { children, ...rest } = props;
            const plain = extractText(children);
            return (
              <div className="relative">
                <button
                  className="copy-icon"
                  onClick={() => copy(plain)}
                  title="copy table"
                >
                  copy
                </button>
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

import { AppConfig } from '@/config/app.config';

const DEMOS = {
  plain: `Boot sequence
────────────────
• Allocating memory banks… OK
• Mounting vector store… OK
• Scheduling tools… OK

> Ready. Type 'help' to see available commands.`,
  markdown: `# Snapshot Report
A concise **markdown** sample to verify rendering and spacing.

## Findings
1. The system maintains coherent *style rhythm*.
2. Lists, code and tables align with the grid.
3. Callouts stay monochrome to preserve the CRT vibe.

> Tip: Use \`Ctrl/Cmd + P\` to toggle prompt preview.`,
  code: "```ts\n// quick sort example with comments for extra lines\nfunction qs(a: number[]): number[] {\n  if (a.length < 2) return a;\n  const p = a[0];\n  const left = a.slice(1).filter(x => x <= p);\n  const right = a.slice(1).filter(x => x > p);\n  return [...qs(left), p, ...qs(right)];\n}\n\nconsole.log(qs([9,5,2,7,1,3,8]));\n```",
  table: `| # | Feature          | Status | Notes                           |
|:-:|:------------------|:-----:|:--------------------------------|
| 1 | Multi-backend     |  ✅   | Switch agents on the fly        |
| 2 | Theme accent      |  ✅   | Green/Cyan/Amber presets        |
| 3 | Markdown + code   |  ✅   | Copy buttons incl. code fences  |
| 4 | Streaming         |  ✅   | Per-character, smooth scroll    |`,
  mix: `### Pipeline
1. fetch context
2. synthesize
3. answer

\`\`\`bash
grep -R "insight" ./kb | head -n 2
\`\`\`

Now returning a paragraph:

The quick brown fox jumps over the lazy dog. This line exists to add volume and let you judge proportions, margins, and line length for comfortable reading at various breakpoints.`,
};

export function pickDemo(): { text: string; md: boolean } {
  const keys = Object.keys(DEMOS) as (keyof typeof DEMOS)[];
  const k = keys[Math.floor(Math.random() * keys.length)];
  const text = DEMOS[k];
  const md = (k !== 'plain');
  return { text, md };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function randInt(min: number, max: number){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function streamTextDemo(
  text: string,
  onToken: (t: string) => void
){
  let i = 0;
  const { netMin, netMax, charMin, charMax } = AppConfig.stream;
  while (i < text.length) {
    const size = randInt(12, 25);
    await sleep(randInt(netMin, netMax));
    const chunk = text.slice(i, i + size);
    i += size;
    for (const ch of chunk.split('')) {
      await sleep(randInt(charMin, charMax));
      onToken(ch);
    }
  }
}

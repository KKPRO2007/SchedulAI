import { Fragment, type ReactNode } from 'react';

// Minimal, safe Markdown for assistant replies: paragraphs, bullet and numbered lists
// (one level of nesting), **bold**, *italic* and `code`. Everything is rendered as React
// elements, never as HTML, so model output cannot inject markup.

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: { text: string; children: string[] }[] };

const BULLET = /^(\s*)(?:[-*•]|\d+[.)])\s+(.*)$/;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    if (match.index > last) out.push(text.slice(last, match.index));
    if (token.startsWith('**')) out.push(<strong key={key++} className="font-semibold text-white">{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) out.push(<code key={key++} className="rounded bg-white/[0.08] px-1 py-px font-mono text-[0.85em] text-sky-100">{token.slice(1, -1)}</code>);
    else out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '').replace(/^#{1,6}\s+/, '');
    const current = blocks.at(-1);
    if (!line.trim()) {
      if (current?.kind === 'p') blocks.push({ kind: 'p', lines: [] });
      continue;
    }
    const bullet = line.match(BULLET);
    if (bullet) {
      const [, indent, text] = bullet;
      const kind = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (indent.length >= 2 && current && current.kind !== 'p' && current.items.length) {
        current.items.at(-1)!.children.push(text);
      } else if (current && current.kind === kind) {
        current.items.push({ text, children: [] });
      } else {
        blocks.push({ kind, items: [{ text, children: [] }] });
      }
      continue;
    }
    if (current?.kind === 'p') current.lines.push(line.trim());
    else blocks.push({ kind: 'p', lines: [line.trim()] });
  }
  return blocks.filter((b) => (b.kind === 'p' ? b.lines.length > 0 : b.items.length > 0));
}

export default function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2.5 break-words">
      {parse(text).map((block, i) => {
        if (block.kind === 'p') {
          return (
            <p key={i}>
              {block.lines.map((line, j) => (
                <Fragment key={j}>{j > 0 && <br />}{inline(line)}</Fragment>
              ))}
            </p>
          );
        }
        const List = block.kind;
        return (
          <List key={i} className={`space-y-1.5 pl-5 ${List === 'ol' ? 'list-decimal marker:text-sky-300/80' : 'list-disc marker:text-sky-300/70'}`}>
            {block.items.map((item, j) => (
              <li key={j} className="pl-0.5">
                {inline(item.text)}
                {item.children.length > 0 && (
                  <ul className="mt-1 list-[circle] space-y-1 pl-5 text-[var(--text-secondary)] marker:text-indigo-300/60">
                    {item.children.map((child, k) => <li key={k}>{inline(child)}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

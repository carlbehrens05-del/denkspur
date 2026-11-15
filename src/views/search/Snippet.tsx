import { Fragment } from 'react';

function unescape(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

/** Zerlegt „a <mark>b</mark> c“ in Abschnitte. */
export function parseSnippet(html: string): { text: string; marked: boolean }[] {
  const out: { text: string; marked: boolean }[] = [];
  const re = /<mark>([\s\S]*?)<\/mark>/g;
  let last = 0;
  for (const m of html.matchAll(re)) {
    if (m.index > last) out.push({ text: unescape(html.slice(last, m.index)), marked: false });
    out.push({ text: unescape(m[1] ?? ''), marked: true });
    last = m.index + m[0].length;
  }
  if (last < html.length) out.push({ text: unescape(html.slice(last)), marked: false });
  return out;
}

/** Zeigt ein Snippet mit <mark>…</mark> an – ohne innerHTML. */
export function Snippet({ html }: { html: string }) {
  return (
    <>
      {parseSnippet(html).map((p, i) =>
        p.marked ? <mark key={i}>{p.text}</mark> : <Fragment key={i}>{p.text}</Fragment>,
      )}
    </>
  );
}

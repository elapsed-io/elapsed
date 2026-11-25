/**
 * Writes the legal pages (public/privacy.html and public/terms.html) from
 * their source, docs/legal/privacy.md and terms.md, in the soon page's style:
 * static HTML, no script. Run by a developer after changing a source; a test
 * fails if a committed page differs from what this writes.
 *
 *     node packages/soon/scripts/legal.ts
 *
 * The sources use a small part of Markdown: `#`, `##` and `###` headings,
 * paragraphs, `- ` lists (continued by indented lines) and `**bold**`. A
 * paragraph starting "Effective" is the page's date.
 *
 * One source serves two editions (round 2.16): the soon page's, written here,
 * and the app's, which the app's build writes at /privacy and /terms once the
 * app takes over elapsed.io. Blocks between `<!-- soon only -->` and
 * `<!-- end -->` belong to the soon page's edition alone; blocks between
 * `<!-- app only -->` and `<!-- end -->` to the app's. Each marker is a block
 * of its own (blank lines around it).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const LEGAL_PAGES = [
  { name: 'privacy', description: 'what elapsed keeps, what it receives, and what it never collects' },
  { name: 'terms', description: 'the terms for using elapsed' },
] as const;

export type LegalPage = (typeof LEGAL_PAGES)[number]['name'];

const ROOT = new URL('../../../', import.meta.url);

export function sourcePath(page: LegalPage): string {
  return fileURLToPath(new URL(`docs/legal/${page}.md`, ROOT));
}

export function pagePath(page: LegalPage): string {
  return fileURLToPath(new URL(`packages/soon/public/${page}.html`, ROOT));
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Typographic quotes and apostrophes, then bold and email links. */
function inline(text: string): string {
  const typeset = text.replace(/(\w)'(\w)/g, '$1’$2').replace(/"([^"]*)"/g, '“$1”');
  return escapeHtml(typeset)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\b([a-z]+@elapsed\.io)\b/g, '<a href="mailto:$1">$1</a>');
}

export type LegalEdition = 'soon' | 'app';

const MARKER = /^<!-- (soon only|app only|end) -->$/;

/** The source's blocks for one edition: the other edition's blocks and every marker left out. */
export function editionBlocks(markdown: string, edition: LegalEdition): string[] {
  const blocks = markdown.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/);
  const kept: string[] = [];
  let only: LegalEdition | null = null;
  for (const block of blocks) {
    const marker = MARKER.exec(block.trim());
    if (marker !== null) {
      if (marker[1] === 'end') {
        if (only === null) throw new Error('an end marker without its start');
        only = null;
      } else {
        if (only !== null) throw new Error('an edition marker inside another');
        only = marker[1] === 'soon only' ? 'soon' : 'app';
      }
      continue;
    }
    if (block.includes('<!--')) throw new Error(`a marker must be a block of its own: ${block.slice(0, 60)}`);
    if (only === null || only === edition) kept.push(block);
  }
  if (only !== null) throw new Error('an edition marker is never ended');
  return kept;
}

/** The body of a page from its Markdown source, in one edition (the soon page's by default). */
export function renderBody(markdown: string, edition: LegalEdition = 'soon'): string {
  const blocks = editionBlocks(markdown, edition);
  const out: string[] = [];
  for (const block of blocks) {
    const heading = /^(#{1,3}) (.+)$/.exec(block);
    if (heading !== null) {
      const level = heading[1]?.length ?? 1;
      out.push(`<h${String(level)}>${inline(heading[2] ?? '')}</h${String(level)}>`);
      continue;
    }
    if (block.startsWith('- ')) {
      const items = block.split(/\n(?=- )/).map((item) => inline(item.slice(2).replace(/\n\s+/g, ' ')));
      out.push(`<ul>\n${items.map((item) => `  <li>${item}</li>`).join('\n')}\n</ul>`);
      continue;
    }
    const text = block.replace(/\n/g, ' ');
    out.push(text.startsWith('Effective ') ? `<p class="legal__date">${inline(text)}</p>` : `<p>${inline(text)}</p>`);
  }
  return out.join('\n');
}

/** A whole page. */
export function renderPage(page: LegalPage, markdown: string): string {
  const entry = LEGAL_PAGES.find((candidate) => candidate.name === page);
  const links = LEGAL_PAGES.map(({ name }) => `<a href="/${name}"${name === page ? ' aria-current="page"' : ''}>${name}</a>`).join('');
  const body = renderBody(markdown)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
  return `<!doctype html>
<!-- Written by packages/soon/scripts/legal.ts from docs/legal/${page}.md: edit that file, then run the script. -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page} · elapsed</title>
    <meta name="description" content="${escapeHtml(entry?.description ?? '')}" />
    <meta name="color-scheme" content="dark light" />
    <link rel="preload" href="/legal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/legal.css" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  </head>
  <body>
    <header class="legal__header"><a class="legal__name" href="/">elapsed</a></header>
    <main class="legal">
${body}
    </main>
    <footer class="links">${links}</footer>
  </body>
</html>
`;
}

export function writePages(): void {
  for (const { name } of LEGAL_PAGES) writeFileSync(pagePath(name), renderPage(name, readFileSync(sourcePath(name), 'utf8')));
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) writePages();

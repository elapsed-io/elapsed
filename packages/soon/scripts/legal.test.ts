import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEGAL_PAGES, pagePath, renderBody, renderPage, sourcePath } from './legal.ts';

describe('the legal pages', () => {
  it('are exactly what their sources in docs/legal write (run the script after changing one)', () => {
    for (const { name } of LEGAL_PAGES) {
      expect(readFileSync(pagePath(name), 'utf8'), name).toBe(renderPage(name, readFileSync(sourcePath(name), 'utf8')));
    }
  });

  it('carry no script, no draft marking and no open question', () => {
    for (const { name } of LEGAL_PAGES) {
      const page = readFileSync(pagePath(name), 'utf8');
      const source = readFileSync(sourcePath(name), 'utf8');
      expect(page).not.toMatch(/<script|javascript:|\son[a-z]+=/i);
      expect(source).not.toMatch(/draft|\[owner|\[your/i);
      expect(source).toMatch(/^Effective November 15, 2026\.$/m);
    }
  });

  it('render headings, lists, bold, quotes and email addresses', () => {
    expect(renderBody('# title\n\nEffective today.\n\n## part\n\n- **one:** a "b"\n  c\n- it\'s two\n\nMail privacy@elapsed.io <now>.')).toBe(
      [
        '<h1>title</h1>',
        '<p class="legal__date">Effective today.</p>',
        '<h2>part</h2>',
        '<ul>\n  <li><strong>one:</strong> a “b” c</li>\n  <li>it’s two</li>\n</ul>',
        '<p>Mail <a href="mailto:privacy@elapsed.io">privacy@elapsed.io</a> &lt;now&gt;.</p>',
      ].join('\n'),
    );
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEGAL_PAGES, editionBlocks, pagePath, renderBody, renderPage, sourcePath } from './legal.ts';

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

  it('serve two editions from one source: the soon page\'s, and the app\'s at launch (round 2.16)', () => {
    const source = '# t\n\nshared\n\n<!-- soon only -->\n\n## today\n\nsoon\n\n<!-- end -->\n\n<!-- app only -->\n\n## the timer\n\napp\n\n<!-- end -->\n\nafter';
    expect(editionBlocks(source, 'soon')).toEqual(['# t', 'shared', '## today', 'soon', 'after']);
    expect(editionBlocks(source, 'app')).toEqual(['# t', 'shared', '## the timer', 'app', 'after']);
    expect(renderBody(source)).toBe(renderBody(source, 'soon'));
    for (const broken of ['<!-- end -->', '<!-- soon only -->\n\nx', '<!-- soon only -->\n\n<!-- app only -->\n\n<!-- end -->', 'text <!-- end -->']) {
      expect(() => editionBlocks(broken, 'app'), broken).toThrow();
    }
  });

  it('give the app an edition that no longer speaks of the soon page, and says what Release 2 keeps', () => {
    const privacy = renderBody(readFileSync(sourcePath('privacy'), 'utf8'), 'app');
    expect(privacy).not.toMatch(/elapsed\.io today|has not opened yet|once it opens/);
    expect(privacy).toContain('<h2>the timer</h2>');
    expect(privacy).toContain('The tips you have seen');
    const terms = renderBody(readFileSync(sourcePath('terms'), 'utf8'), 'app');
    expect(terms).not.toMatch(/elapsed\.io today|has not opened yet/);
    // The soon page's edition is the one published today, unchanged.
    expect(renderBody(readFileSync(sourcePath('privacy'), 'utf8'))).toContain('<h2>elapsed.io today</h2>');
  });
});

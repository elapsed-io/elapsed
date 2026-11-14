import { describe, expect, it } from 'vitest';
import { escapeHtml, iconMarkup, renderTemplate } from './html.ts';

describe('renderTemplate', () => {
  it('fills copy, brand and icon placeholders', () => {
    const html = renderTemplate('<button aria-label="{{ copy.icons.settings }}">{{ icon.settings }}</button>{{copy.timer.start}}');
    expect(html).toContain('aria-label="settings"');
    expect(html).toContain('<svg class="icon"');
    expect(html.endsWith('start')).toBe(true);
  });

  it.each(['{{ copy.timer.missing }}', '{{ icon.unknown }}', '{{ brand.copy }}', '{{ copy.constructor }}', '{{ nope.x }}'])(
    'fails the build on %s',
    (template) => {
      expect(() => renderTemplate(template)).toThrow();
    },
  );

  it('fails on a malformed placeholder', () => {
    expect(() => renderTemplate('{{ copy }}')).toThrow();
  });
});

describe('escapeHtml', () => {
  it('escapes markup and quotes', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});

describe('iconMarkup', () => {
  it('draws the account icon as the design canvas does', () => {
    expect(iconMarkup('account')).toBe(
      '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg>',
    );
  });
});

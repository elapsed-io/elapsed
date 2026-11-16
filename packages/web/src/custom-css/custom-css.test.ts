import { describe, expect, it } from 'vitest';
import { highlightLines } from '../settings/css-editor.ts';
import { safeModeAddress } from '../shell/safe-mode.ts';
import { customCssRecord, parseCustomCssRecord } from '../storage/custom-css-store.ts';

describe('the stored custom CSS record', () => {
  it('reads back what was written', () => {
    expect(parseCustomCssRecord(customCssRecord('.time { color: red }'))).toBe('.time { color: red }');
    expect(customCssRecord('a')).toBe('{"schema":1,"css":"a"}');
  });

  it('reads anything else as no custom CSS', () => {
    for (const text of [null, '', 'nope', '[]', '"css"', '{"schema":2,"css":"a"}', '{"schema":1}', '{"schema":1,"css":3}', '{"schema":1,"css":"a","extra":1}']) {
      expect(parseCustomCssRecord(text), String(text)).toBe('');
    }
    expect(parseCustomCssRecord(customCssRecord('a'.repeat(50 * 1024 + 1)))).toBe('');
  });
});

describe('safe mode', () => {
  it('adds ?safe to the address, keeping the rest', () => {
    expect(safeModeAddress('https://elapsed.io/')).toBe('https://elapsed.io/?safe');
    expect(safeModeAddress('https://elapsed.io/?safe')).toBe('https://elapsed.io/?safe');
    expect(safeModeAddress('https://elapsed.io/?a=1#top')).toBe('https://elapsed.io/?a=1&safe#top');
  });
});

describe('the editor', () => {
  it('draws comments apart from the rest, line by line', () => {
    expect(highlightLines('/* a */\n.t { b: c } /* d\ne */ f')).toEqual([
      [{ text: '/* a */', comment: true }],
      [
        { text: '.t { b: c } ', comment: false },
        { text: '/* d', comment: true },
      ],
      [
        { text: 'e */', comment: true },
        { text: ' f', comment: false },
      ],
    ]);
  });

  it('starts no comment inside a string, and keeps empty lines', () => {
    expect(highlightLines('a { content: "/* x" }\n\n')).toEqual([[{ text: 'a { content: "/* x" }', comment: false }], [], []]);
  });
});

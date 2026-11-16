import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { CUSTOM_CSS_RULES, checkDeclaration, dataImageBytes, fitsCustomCss, isAllowedUrl, isCleanCss, isKeptAtRule, scanCss, splitDeclarations } from './custom-css.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('the custom CSS rules', () => {
  it('are data, with the limits from the config', () => {
    expect(CUSTOM_CSS_RULES.maxBytes).toBe(50 * 1024);
    expect(CUSTOM_CSS_RULES.dataImage.maxBytes).toBe(CONFIG.device.customCssDataImageMaxBytes);
    expect(isKeptAtRule('media')).toBe(true);
    expect(isKeptAtRule('MEDIA')).toBe(true);
    for (const name of ['import', 'font-face', 'namespace', 'charset', 'page', 'property', 'counter-style', 'font-feature-values', 'position-try']) {
      expect(isKeptAtRule(name)).toBe(false);
    }
  });

  it('measure size in UTF-8 bytes', () => {
    expect(fitsCustomCss('a'.repeat(50 * 1024))).toBe(true);
    expect(fitsCustomCss('a'.repeat(50 * 1024 + 1))).toBe(false);
    // Three bytes each in UTF-8, one UTF-16 unit each.
    expect(fitsCustomCss('€'.repeat(17_067))).toBe(false);
  });
});

describe('scanning CSS text', () => {
  it('finds at-rules, functions and url() addresses', () => {
    const scan = scanCss('@import url(//a.example/x.css); .t { color: rgb(1 2 3); background: url("b.png") } @media (width > 1px) {}');
    expect(scan.atRules).toEqual(['import', 'media']);
    expect(scan.functions).toEqual(['url', 'rgb', 'url']);
    expect(scan.urls).toEqual(['//a.example/x.css', 'b.png']);
  });

  it('undoes escapes, as the browser does', () => {
    expect(scanCss('@\\69mport "x";').atRules).toEqual(['import']);
    expect(scanCss('@\\000069 mport "x";').atRules).toEqual(['import']);
    expect(scanCss('a { b: \\75 rl(//evil.example) }').urls).toEqual(['//evil.example']);
    expect(scanCss('a { b: U\\RL( //evil.example ) }').urls).toEqual(['//evil.example']);
    expect(scanCss('a { b: url(\\2f\\2f evil.example) }').urls).toEqual(['//evil.example']);
    expect(scanCss("a { b: url('\\2f\\2f evil.example') }").urls).toEqual(['//evil.example']);
    expect(scanCss('a { b: \\69 mage-set("x" 1x) }').functions).toEqual(['image-set']);
  });

  it('skips comments and strings', () => {
    const scan = scanCss('/* @import url(x) */ .a::after { content: "@import url(x)" } .b { content: \'url(y)\' }');
    expect(scan).toEqual({ atRules: [], functions: [], urls: [] });
    expect(scanCss('/* unterminated @import url(x)').atRules).toEqual([]);
  });

  it('does not take a comment between a name and its parenthesis for a function', () => {
    expect(scanCss('a { b: url/**/(//evil.example) }').functions).toEqual([]);
  });

  it('treats hash tokens and numbers as what they are', () => {
    // "#url" is a hash token and "10url" a dimension: neither is followed by a function, as in the browser.
    expect(scanCss('#url(x) { width: 10url(x) }').functions).toEqual([]);
    expect(scanCss('a { margin: 1e3px -.5em +2px }').functions).toEqual([]);
  });

  it('ends a string at an unescaped newline, as the tokenizer does', () => {
    expect(scanCss('a { content: "x\nurl(//evil.example) }').urls).toEqual(['//evil.example']);
    expect(scanCss('a { content: "x\\\nurl(//evil.example)" }').urls).toEqual([]);
  });

  it('reads newlines of every kind, and NUL, as the tokenizer does', () => {
    expect(scanCss('a { content: "x\r\nurl(//e.example) }').urls).toEqual(['//e.example']);
    expect(scanCss('a { content: "x\furl(//e.example) }').urls).toEqual(['//e.example']);
    expect(scanCss('@\0import').atRules).toEqual(['\ufffdimport']);
  });

  it('keeps a malformed url as read, so it never passes', () => {
    expect(scanCss('a { b: url(x y) }').urls).toEqual(['x y']);
    expect(isCleanCss('a { b: url(data:image/png;base64,AAAA") }')).toBe(false);
  });
});

describe('clean CSS', () => {
  it('keeps style rules and the kept at-rules', () => {
    expect(
      isCleanCss(
        '.time { color: #f2c46b; letter-spacing: -0.02em } @media (max-width: 700px) { .time { opacity: .8 } } @keyframes k { from { opacity: 0 } } @supports selector(:has(a)) {} @layer x; @container (width > 1px) {} @scope (.a) {} @starting-style {}',
      ),
    ).toBe(true);
  });

  it('refuses @import, @font-face, @namespace and every other at-rule', () => {
    for (const css of ['@import "x.css";', '@font-face { font-family: x; src: local(x) }', '@namespace svg url(http://www.w3.org/2000/svg);', '@page { margin: 0 }', '@property --x { syntax: "*"; inherits: false }', '@charset "utf-8";']) {
      expect(isCleanCss(css), css).toBe(false);
    }
  });

  it('refuses every url() but a small data image', () => {
    expect(isCleanCss(`.a { background: url(${PNG}) }`)).toBe(true);
    expect(isCleanCss(`.a { background: url("${PNG}") }`)).toBe(true);
    for (const url of ['https://evil.example/a.png', '//evil.example/a', '/assets/x.png', 'x.png', '#svg-filter', ['java', 'script:alert(1)'].join(''), 'data:text/css,body{}', 'data:image/svg+xml,<svg/>', 'blob:https://elapsed.io/1', '']) {
      expect(isCleanCss(`.a { background: url("${url}") }`), url).toBe(false);
    }
  });

  it('refuses data images over the size limit', () => {
    const big = `data:image/png;base64,${'A'.repeat(Math.ceil((CONFIG.device.customCssDataImageMaxBytes * 4) / 3) + 4)}`;
    expect(isAllowedUrl(big)).toBe(false);
    expect(isAllowedUrl(PNG)).toBe(true);
  });

  it('refuses functions that load resources or run code', () => {
    for (const css of ['.a { background: image-set("a.png" 1x) }', '.a { background: -webkit-image-set(url(x) 1x) }', '.a { background: image("a.png") }', '.a { background: cross-fade(url(a), url(b)) }', '.a { background: element(#x) }', '.a { width: expression(alert(1)) }', '.a { background: src("a.png") }']) {
      expect(isCleanCss(css), css).toBe(false);
    }
  });
});

describe('checking a declaration', () => {
  it('keeps ordinary values', () => {
    expect(checkDeclaration('color', 'rgb(242, 196, 107)')).toBe('keep');
    expect(checkDeclaration('--x', ' 12px')).toBe('keep');
    expect(checkDeclaration('background-image', `url("${PNG}")`)).toBe('keep');
    expect(checkDeclaration('content', '"url(//evil.example)"')).toBe('keep');
  });

  it('drops resource loads, blocked properties and at-keywords in values', () => {
    expect(checkDeclaration('background-image', 'url("https://evil.example/leak?a")')).toBe('drop');
    expect(checkDeclaration('--x', 'url(//evil.example)')).toBe('drop');
    expect(checkDeclaration('--x', '\\75rl(//evil.example)')).toBe('drop');
    expect(checkDeclaration('--x', '{ @import "x"; }')).toBe('drop');
    expect(checkDeclaration('behavior', 'x')).toBe('drop');
    expect(checkDeclaration('-moz-binding', 'none')).toBe('drop');
    expect(checkDeclaration('cursor', 'url(x.cur), auto')).toBe('drop');
    expect(checkDeclaration('list-style-image', 'image-set("x" 1x)')).toBe('drop');
  });
});

describe('data image sizes', () => {
  it('are read from base64 and from percent-encoding', () => {
    expect(dataImageBytes('data:image/png;base64,AAAA')).toBe(3);
    expect(dataImageBytes('data:image/png;base64,AAA=')).toBe(2);
    expect(dataImageBytes('data:image/gif,%00%01')).toBe(2);
    expect(dataImageBytes('data:image/png;base64,***')).toBeNull();
    expect(dataImageBytes('data:image/gif,%E0%A4%A')).toBeNull();
    expect(dataImageBytes('data:text/plain,x')).toBeNull();
  });
});

describe('splitting a declaration block', () => {
  it('splits at semicolons outside strings, comments and brackets', () => {
    expect(splitDeclarations('background: url("a;b") red; color: blue !important; content: \'x;y\'; --x: { a; b }; /* c; d */ width: calc(1px + 2px)')).toEqual([
      { property: 'background', value: 'url("a;b") red', text: 'background: url("a;b") red' },
      { property: 'color', value: 'blue !important', text: 'color: blue !important' },
      { property: 'content', value: "'x;y'", text: "content: 'x;y'" },
      { property: '--x', value: '{ a; b }', text: '--x: { a; b }' },
      { property: '/* c; d */ width', value: 'calc(1px + 2px)', text: '/* c; d */ width: calc(1px + 2px)' },
    ]);
  });

  it('keeps escaped semicolons and reads an empty block as none', () => {
    expect(splitDeclarations('content: a\\;b')).toEqual([{ property: 'content', value: 'a\\;b', text: 'content: a\\;b' }]);
    expect(splitDeclarations(' ;; ')).toEqual([]);
  });
});

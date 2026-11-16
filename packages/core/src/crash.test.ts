import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { browserOf, crashBody, crashBodyBytes, crashReport, parseCrashBody, scrubCrashText } from './crash.ts';

const SITE = 'https://elapsed.io';
const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

describe('crash reports', () => {
  it('cut query strings and fragments from URLs', () => {
    expect(scrubCrashText('at f (https://elapsed.io/assets/index-a.js?token=secret#x:2:3)', 500, SITE)).toBe('at f (https://elapsed.io/assets/index-a.js)');
    expect(scrubCrashText('blob:https://elapsed.io/123?x=1 and https://elapsed.io/c#frag', 500, SITE)).toBe('blob:https://elapsed.io/123 and https://elapsed.io/c');
  });

  it('replace URLs from other origins, such as browser extensions', () => {
    expect(scrubCrashText('at x (chrome-extension://abcdefghijklmnop/content.js:1:2) at y (https://elapsed.io.evil.example/a.js)', 500, SITE)).toBe(
      'at x ([other origin]) at y ([other origin])',
    );
  });

  it('replace quoted strings, which can hold something typed', () => {
    expect(scrubCrashText('not a colour: "my secret note"', 500, SITE)).toBe('not a colour: "…"');
    expect(scrubCrashText("reading 'abc' and `def`", 500, SITE)).toBe('reading "…" and "…"');
  });

  it('drop control characters and cap the length', () => {
    expect(scrubCrashText('a\u0000b\nc', 500, SITE)).toBe('a b\nc');
    expect(scrubCrashText('x'.repeat(20), 10, SITE)).toBe(`${'x'.repeat(9)}…`);
  });

  it.each([
    [CHROME, 'chrome', 131],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0', 'edge', 131],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0', 'firefox', 133],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', 'safari', 18],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', 'safari', 18],
    ['curl/8.0', 'other', 0],
  ])('read only the browser family and major version from %s', (ua, browser, browserVersion) => {
    expect(browserOf(ua)).toEqual({ browser, browserVersion });
  });

  it('round-trip through the request body', () => {
    const report = crashReport({ message: 'TypeError: x is undefined', stack: 'at a (https://elapsed.io/a.js:1:2)', version: 'index-Bu-rRp5K', userAgent: CHROME, origin: SITE });
    expect(parseCrashBody(crashBody(report), SITE)).toEqual(report);
  });

  it('always fit in 8 KB, however long or escaped the stack', () => {
    const report = crashReport({ message: '…'.repeat(2000), stack: '\n"\\'.repeat(10_000), version: 'v', userAgent: CHROME, origin: SITE });
    expect(crashBodyBytes(report)).toBeLessThanOrEqual(CONFIG.crashReports.maxBodyBytes);
    expect(parseCrashBody(crashBody(report), SITE)).not.toBeNull();
  });

  it.each([
    ['not JSON', '{'],
    ['an array', '[]'],
    ['an extra field', JSON.stringify({ message: '', stack: '', version: 'v', browser: 'chrome', browserVersion: 1, ip: '1.2.3.4' })],
    ['an unknown browser', JSON.stringify({ message: '', stack: '', version: 'v', browser: 'netscape', browserVersion: 1 })],
    ['a fractional version', JSON.stringify({ message: '', stack: '', version: 'v', browser: 'chrome', browserVersion: 1.5 })],
    ['a version with spaces', JSON.stringify({ message: '', stack: '', version: 'a b', browser: 'chrome', browserVersion: 1 })],
    ['a long message', JSON.stringify({ message: 'x'.repeat(501), stack: '', version: 'v', browser: 'chrome', browserVersion: 1 })],
  ])('refuse %s', (_label, body) => {
    expect(parseCrashBody(body, SITE)).toBeNull();
  });

  it('scrub again on the endpoint', () => {
    const body = JSON.stringify({ message: 'bad "typed"', stack: 'https://elapsed.io/a?b=c https://x.io/a', version: 'v', browser: 'chrome', browserVersion: 1 });
    expect(parseCrashBody(body, SITE)).toMatchObject({ message: 'bad "…"', stack: 'https://elapsed.io/a [other origin]' });
  });
});

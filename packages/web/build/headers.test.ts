import { describe, expect, it } from 'vitest';
import { CSP_DIRECTIVES, headersForPath, renderCsp, renderHeadersFile, SECURITY_HEADERS } from './headers.ts';

describe('content security policy', () => {
  it('is the plan policy, with frame-src closed until the widget origin exists, plus Trusted Types', () => {
    expect(renderCsp()).toBe(
      [
        "default-src 'none'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "require-trusted-types-for 'script'",
        "trusted-types 'none'",
      ].join('; '),
    );
  });

  it('never allows inline code, eval or remote origins', () => {
    const sources = Object.values(CSP_DIRECTIVES).flat();
    for (const banned of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "'wasm-unsafe-eval'", '*', 'https:', 'http:']) {
      expect(sources).not.toContain(banned);
    }
    expect(sources.filter((s) => s.includes('://'))).toEqual([]);
  });
});

describe('security headers', () => {
  it('sends every header the plan requires on every path', () => {
    for (const path of ['/', '/index.html', '/assets/index-abc.css']) {
      expect(headersForPath(path)).toMatchObject({
        'Content-Security-Policy': renderCsp(),
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      });
    }
  });

  it('caches hashed assets forever and pages not at all', () => {
    expect(headersForPath('/assets/timer-sans-abc.woff2')['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(headersForPath('/')['Cache-Control']).toBeUndefined();
  });

  it('renders the Cloudflare _headers file', () => {
    const file = renderHeadersFile();
    expect(file).toContain(`/*\n  Content-Security-Policy: ${SECURITY_HEADERS['Content-Security-Policy'] ?? ''}`);
    expect(file).toContain('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
  });
});

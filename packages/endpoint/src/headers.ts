/**
 * Headers on every endpoint response. Static files get theirs from _headers; Worker responses need their
 * own. Kept apart from the request code so tooling/check-deployed.ts can read them.
 */
export const RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

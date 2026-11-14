# Safety overview: Release 1, round 1 (Foundations)

Date: 2026-11-14. Template: plan, Safety overviews > Round overview.

## 1. What changed

This round creates the repository from nothing: npm workspaces with `packages/core` (pure TypeScript: the
config module with every tunable number from the plan, and the brand module with the product name
placeholder, domain placeholder and all user-facing copy) and `packages/web` (the Vite site). Strict
TypeScript, ESLint with safety rules, Vitest unit tests and Playwright end-to-end tests are set up, with a
GitHub Actions workflow that runs the type check, lint, tests, the contrast check, the build, the size
budget and the end-to-end tests on every push and pull request. The ten theme presets are data, their
derived colours are computed in one function, and a CI check fails any preset below the contrast
thresholds. The CSP and security headers are defined once and written to Cloudflare's `_headers` file; the
preview server sends the same headers. Archivo is self-hosted as a trimmed, renamed variable font
("Timer Sans": width 92, weights 300 to 500, Latin). The site itself is one static page that matches the
design canvas's idle frame pixel for pixel at 720 × 450; its buttons do nothing yet. Nothing is deployed.

## 2. Data

None. The page reads nothing, stores nothing and sends nothing. A visit makes three same-origin requests
(the page, its stylesheet, the font); the end-to-end tests assert that count and that no request leaves the
origin. `docs/data-inventory.md` records the current state and mirrors the plan's Privacy table.

## 3. Inputs

No user-controlled input exists yet: the buttons have no handlers and the page reads no URL parameters,
storage or files.

Build-time inputs, all from the repository:

- `index.html` placeholders are resolved only against the brand module and icon registry; an unknown or
  malformed placeholder fails the build, and every text value is HTML-escaped (`build/html.ts`, tested).
- Theme colours pass through `parseHex`, which accepts only `#rrggbb` and is tested against injection-shaped
  strings such as `#0E0F11;background:red`. Round 6 uses it for user-chosen colours.
- The font build script accepts only a source file with the pinned SHA-256.

## 4. Dependencies

No runtime dependencies. The site ships no third-party JavaScript or CSS.

Development dependencies (all pinned exactly, lockfile committed, install scripts disabled):

| Package | Version | Licence | Unpacked size | Purpose (one-line justification) |
| --- | --- | --- | --- | --- |
| `typescript` | 6.0.3 | Apache-2.0 | 23.2 MB | Strict type checking; the plan's stack. 7.x is not yet supported by typescript-eslint. |
| `vite` | 8.3.6 | MIT | 2.3 MB | The build tool the plan names. |
| `vitest` | 5.1.0 | MIT | 2.7 MB | Unit test runner that shares Vite's resolver, so tests import the same TypeScript the site builds. |
| `eslint` | 10.14.0 | MIT | 2.8 MB | Linting, including the rule that bans unsafe HTML sinks. |
| `@eslint/js` | 10.0.1 | MIT | < 0.1 MB | ESLint's recommended rule set. |
| `typescript-eslint` | 8.72.1 | MIT | < 0.1 MB (meta-package) | Type-aware lint rules for TypeScript (strict preset). |
| `@playwright/test` | 1.65.0 | Apache-2.0 | < 0.1 MB (plus a browser download in CI) | End-to-end tests: only a real browser can verify the CSP, Trusted Types, font loading and the pixel match with the frame. |
| `@types/node` | 24.19.2 | MIT | 2.5 MB | Types for the Node scripts and tests (CI runs Node 24). |
| `minimatch` (override) | 11.0.5 | BlueOak-1.0.0 | 0.4 MB | Not added directly: forces the patched release for GHSA-g3hv-75wg-m249 under eslint and typescript-eslint (decision 9). |

Other third-party material:

| Item | Version | Licence | Purpose |
| --- | --- | --- | --- |
| Archivo (as "Timer Sans") | 2.001, google/fonts `29b4ec6d…` | SIL OFL 1.1, `OFL.txt` shipped beside the font | The default font. Provenance in `packages/web/src/assets/fonts/README.md`. |
| Tabler Icons geometry (settings, user) | v3.51.0 | MIT, `LICENSE-tabler-icons.txt` shipped | The corner icons. Copied as path data; no package installed. |
| fontTools, brotli (Python) | 4.68.0, 1.2.1 | MIT | Developer-only tool to rebuild the font; not in CI or the site. |
| GitHub Actions: checkout, setup-node, dependency-review-action | v7.0.1, v7.1.0, v5.0.0, pinned by commit SHA | MIT | CI. |
| GPL-3.0 text | FSF, SHA-256 `3972dc97…` | — | The project licence (`LICENSE`). |

## 5. Security surface

- **CSP** (every path): `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:;
  font-src 'self'; connect-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'self';
  frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types 'none'`. This is the plan's policy
  with `frame-src` closed until the widget origin exists, plus Trusted Types with no policy allowed.
- **Headers**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a one-year immutable cache for hashed
  files under `/assets/`.
- **Storage keys**: none. **Cookies**: none. **Endpoints**: none. **Auth**: none.
- **Build output** includes `.vite/manifest.json` (a map of source to hashed file names, used by the size
  check) and `_headers`. Neither contains anything secret.
- **CI**: read-only `contents` permission; checkout does not persist credentials; no secrets are used.

## 6. Abuse cases

| Abuse case | Defence |
| --- | --- |
| Script injection through future dynamic HTML | Lint bans every HTML sink; the browser enforces Trusted Types with no policy, so a missed sink still throws. Tested in a real browser. |
| Inline script or style injection | `script-src 'self'` and `style-src 'self'` without `unsafe-inline`; the page uses no inline styles or scripts. Tested: an injected `<style>` is blocked and reported. |
| Loading or leaking to third parties | `default-src 'none'` with only `'self'` sources; no remote fonts or scripts. Tested: zero cross-origin requests. |
| Clickjacking | `frame-ancestors 'none'`. |
| Base-tag hijacking, form redirection | `base-uri 'none'`, `form-action 'self'`. |
| Downgrade or cookie theft over HTTP | HSTS with `includeSubDomains`. |
| Cross-window attacks through `window.opener` | `Cross-Origin-Opener-Policy: same-origin`. |
| Inlined assets slipping past the font policy | `assetsInlineLimit: 0`, so fonts are always separate same-origin files. |
| A compromised or typosquatted npm package | Exact pins, committed lockfile, install scripts disabled, releases at least 7 days old, registry signatures verified in CI, `npm audit` in CI, dependency review on pull requests, no runtime dependencies. |
| A compromised GitHub Action | Actions pinned to full commit SHAs. |
| A tampered font source | The build script checks the source's SHA-256 and rebuilds byte for byte. |
| Copy or brand drift (the placeholder used elsewhere) | A test fails if the name placeholder appears outside the brand module. |
| Browser storage used outside the adapters | Lint restricts storage globals to `src/storage/` and bans `document.cookie`. |

## 7. Tests

Unit tests (Vitest, 93): config ranges and plan values; lowercase copy; colour parsing (including hostile
strings), mixing, luminance and contrast; derived colours against values computed with the design canvas's
own code for graphite, paper and lilac; all ten presets pass the contrast rules and a weak theme fails;
the exact CSP string, the absence of unsafe sources, every header on every path, the `_headers` rendering;
template placeholders, escaping and failure on unknown keys; the size-budget thresholds and core-file
discovery; the lint safety rules against 21 banned and 5 allowed snippets; the brand placeholder scan.

End-to-end tests (Playwright, Chromium, 10) against the production build behind the preview server with
the real headers: headers present and exact; no CSP violations, console errors or third-party requests,
and exactly three requests; Trusted Types blocks `innerHTML` and an injected `<style>` is blocked; the
trimmed font loads and is used; a pixel-for-pixel match with the idle frame reconstruction at 720 × 450
(zero differing pixels; a deliberate 1 px gap change produced 407); the scaling rules at 720 × 450,
1440 × 900, 1920 × 1080 and 390 × 844; the 44 px tap area.

CI checks: type check, lint, contrast check (all ten presets pass; lowest is 4.50:1 for text on the start
button in lilac and mint), size budget (core 25.1 KB of 150 KB, 0 KB of JavaScript), registry signatures,
`npm audit`.

## 8. Open risks and follow-ups

1. **Muted text contrast (round 8).** The muted colour passes 3:1 for icons in every preset but is 3.37:1 to
   3.78:1 on the light presets. The plan uses muted for 11 to 13 px labels, which WCAG 2.2 AA requires at
   4.5:1. The CI check does not cover it because the plan's thresholds do not; the round 8 accessibility
   pass must resolve it, possibly by changing the 45 % mix for labels.
2. **Start-button text is at the threshold.** Lilac and mint sit at 4.50:1 for the foreground on the accent.
   Any change to those presets must be rechecked; the CI check will catch a regression.
3. **Font rounding.** Pinning width 92 differs from the canvas's untrimmed variable font by sub-pixel
   antialiasing on the time's edges (decision 28). Accepted for size; noted in case exact parity is wanted.
4. **HSTS preload.** The header consents to preload-list submission with `includeSubDomains`. Do not submit
   the domain to the preload list until the product domain is final and every subdomain serves HTTPS.
5. **Trusted Types and the service worker (round 4).** `navigator.serviceWorker.register` is a script-URL
   sink. Round 4 must add a single named policy that allows only the site's own worker URL.
6. **Manifest and worker sources (round 4).** `default-src 'none'` blocks a web app manifest; round 4 must add
   `manifest-src 'self'` (and confirm `worker-src` falls back to `script-src 'self'`).
7. **Dependency review needs the dependency graph.** `actions/dependency-review-action` works on public
   repositories, or private ones with GitHub Advanced Security. If the repository stays private until
   launch, that job will fail on pull requests and should be revisited.
8. **minimatch override (decision 9).** Remove it once typescript-eslint depends on a patched minimatch.
9. **TypeScript 7.** Move when typescript-eslint supports it.
10. **Cross-browser.** End-to-end tests run in Chromium only; Firefox, Safari and Edge are round 8. Trusted
    Types support varies by browser; where it is missing, the lint rule is the only guard.
11. **Vite dev server has no CSP** (decision 34); always verify with `npm run preview` or the end-to-end tests.
12. **Domain placeholder.** `[domain]` in the brand module must be replaced before anything builds links
    (round 5's share text).
13. **No JavaScript ships yet.** The size check's JavaScript path is unit-tested but has not yet measured a
    real script; round 2 or 3 will exercise it.

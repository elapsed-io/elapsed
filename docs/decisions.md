# Decisions log

Every non-obvious choice, with its date and reason (plan, Working rules). Newest rounds at the bottom.
Owner decisions are marked **owner**.

## Release 1, round 1: Foundations (2026-11-14)

### Settled by the owner during the round

| # | Decision | Reason |
| --- | --- | --- |
| 1 | **owner** Window scaling: only the time and the 26 px gap below it scale, by one reference pixel = min(window width ÷ 720, window height ÷ 450), multiplied by the time size setting. Buttons, button text, corner icons and their 14 px inset stay at the frame's pixel sizes at every window size. | The plan says frames "scale to the window" without saying which parts. |
| 2 | **owner** Phones (no phone frame exists yet): the time shrinks with the same formula, but spacing never drops below the frame's pixel sizes, so the gap is at least 26 px. Interim until a phone frame is designed (Release 2 layouts per screen size). | The plan wants a phone default "designed for the phone"; the canvas has no phone frame. |
| 3 | **owner** The trimmed font is renamed "Timer Sans". | The plan says a modified version cannot keep the Archivo name. Archivo's OFL declares no Reserved Font Name, so the license alone would allow it, but the name table carries an Omnibus-Type trademark notice and the owner chose to follow the plan literally. |
| 4 | **owner** Interface text is at width 92, like the time. The canvas was updated so every frame sets `font-stretch: 92%` on the body and buttons inherit it. | The idle frame previously set width 92 on the time only. |

### Tooling and versions

| # | Decision | Reason |
| --- | --- | --- |
| 5 | npm workspaces: `@stopwatch/core` and `@stopwatch/web`. Core exports its TypeScript source directly (`"exports": "./src/index.ts"`); Vite, Vitest and Node compile it where it is used. | No build step or generated declarations to keep in sync. "stopwatch" is the repository's name, not the product name, so it does not need the brand module. |
| 6 | Relative imports carry the `.ts` extension, with `erasableSyntaxOnly` and `verbatimModuleSyntax`. | Node 22.18+ runs the CI scripts (`check-contrast.ts`, `check-size.ts`) directly by stripping types, so no `tsx` or `ts-node` dependency is needed. |
| 7 | TypeScript 6.0.3, not 7.0.2. | typescript-eslint 8.72 supports TypeScript below 6.1 only; TypeScript 7 (the native compiler) has no compatible type-aware linter yet. Revisit when typescript-eslint supports it. |
| 8 | Every dependency is the newest stable release that had been public for at least 7 days on 2026-11-14 (eslint 10.14.0 rather than 10.15.0, typescript-eslint 8.72.1 rather than 8.72.2, vite 8.3.6 rather than 8.3.8, @playwright/test 1.65.0 rather than 1.65.1). | Compromised npm releases are usually caught within days; a week's delay costs little. |
| 9 | `overrides: { "minimatch": "11.0.5" }`. | GHSA-g3hv-75wg-m249 (moderate, denial of service through crafted glob patterns) affects minimatch below 11.0.1, which eslint 10.14 and every typescript-eslint 8.x pull in. 11.0.5 is the newest patched release older than 7 days. Lint and tests pass with it. Remove once typescript-eslint depends on minimatch 11. |
| 10 | Node: `engines >= 22.18.0`; CI runs Node 24.22.3 (`.nvmrc`, LTS). | 22.18 is the first 22.x with type stripping on by default. 24 is a long-term-support line maintained until April 2028. |
| 11 | `.npmrc`: `ignore-scripts`, `save-exact`, `engine-strict`. CI installs with `npm ci --ignore-scripts`, verifies registry signatures and fails on moderate or worse advisories. | Plan, Supply chain. A new advisory in a dev tool will turn CI red until it is handled; that is intended. |
| 12 | Unit tests: Vitest in a Node environment. End-to-end: Playwright with Chromium only in this round. | The plan asks for end-to-end tests for refresh, sleep and multi-tab behaviour (round 4); the CSP, Trusted Types and pixel checks need a real browser now. Firefox, Safari and Edge are covered in round 8's cross-browser checks. |
| 13 | `PLAYWRIGHT_CHROMIUM_EXECUTABLE` lets a machine use a preinstalled Chromium instead of downloading one. CI downloads the version Playwright pins. | The development container ships a Chromium for an older Playwright. |

### Build, tokens and themes

| # | Decision | Reason |
| --- | --- | --- |
| 14 | The brand and config modules live in `packages/core`. | The Release 3 API needs the product name (emails) and the same thresholds (session maximum, check-ins), and imports core. |
| 15 | The config module records every number in the plan now, including later releases' (ocean, height, tree, interstellar, retention). Nothing reads those values until their round. | "Every tunable number lives in one file." Pure data; tree shaking keeps unused values out of the bundle. |
| 16 | Design tokens and the default theme are generated into CSS custom properties at build time (Vite virtual module `virtual:tokens.css`, from `packages/web/src/styles/tokens.ts`). | Invariants 8 and 11 together: numbers live in the config module, and CSS reads only custom properties. Generating avoids keeping a second copy of the numbers in CSS. |
| 17 | Derived colours are computed in TypeScript (`theme/derive.ts`), not with CSS `color-mix()`. | One place serves the build, the contrast check and (round 6) live theme edits. The mix matches the design canvas exactly: gamma-encoded sRGB, each channel rounded. Tests compare against values computed with the canvas's own code. |
| 18 | Only the default theme (graphite) is in the static CSS. The ten presets are data in `theme/presets.ts`. | Theme switching is round 6, where derived values are applied at runtime from the same function. |
| 19 | Relative luminance uses WCAG 2.2's 0.04045 threshold; the canvas uses 0.03928. | No 8-bit channel value falls between the two thresholds, so results are identical. |
| 20 | The contrast check treats "text" as the foreground on the background and on each button colour (start = accent, pause, end), all at 4.5:1; "accent graphics" is the accent on the background at 2.5:1. | Button labels are text drawn in the foreground colour (plan: "button text is always the foreground"). All ten presets pass; the lowest are lilac and mint at 4.50:1 for text on the start button. |
| 21 | Cascade layers are declared once in `styles/layers.css`, imported first. The screen shell (buttons, icons, layout) is in `base`; the time display is in `mode`. | Plan invariant 8. The time is the digits display mode; round 3 moves it into the mode's own package. |
| 22 | The idle page is static HTML filled at build time from the brand module and icon registry (`build/html.ts`). The JavaScript entry only imports the stylesheets, so Vite emits no script yet. | The page paints without JavaScript, user-facing text stays in the brand module, and no behaviour is built before round 2. |
| 23 | `build.assetsInlineLimit: 0`. | Vite inlines small assets as `data:` URIs; `font-src 'self'` would block an inlined font. |
| 24 | `font-display: block` with a preload link injected for the hashed font file. | Plan: "the trimmed default font is preloaded, so the time never jumps when the font arrives." |
| 25 | `<link rel="icon" href="data:,">`. | No icon is designed; this stops browsers requesting `/favicon.ico` and logging a 404. |

### Font

| # | Decision | Reason |
| --- | --- | --- |
| 26 | Source: Google Fonts' `Archivo[wdth,wght].ttf` (Archivo 2.001) at a pinned commit, the binary the design canvas previews with. It is identical to the upstream Omnibus-Type release except for the `head` table's timestamps. | Matches the canvas; provenance in `packages/web/src/assets/fonts/README.md`. |
| 27 | Width pinned at 92; weight axis kept as 300 to 500 (one variable file); characters: Basic Latin, Latin-1 Supplement and a short punctuation list; features: browser defaults plus `tnum`. 23.8 KB. | Weights in use are 300 (time) and 400 to 500 (interface). Latin-1 covers accented names such as "Kármán"; anything else falls back to the system font. |
| 28 | Pinning the width rounds outline points and advance widths to whole font units. Against the canvas rendered with the untrimmed variable font, 2,126 of 324,000 pixels differ at 720 × 450, all antialiasing on the time's glyph edges; layout is identical. Keeping the width axis variable would render exactly but doubles the file to 52 KB. | The brief asks for the font cut down to width 92; the difference is sub-pixel. |
| 29 | The font build is a committed Python script run by a developer (`packages/web/scripts/font/`), using fontTools 4.68.0 and brotli 1.2.1 in a throwaway virtual environment. It checks the source's SHA-256 and produces identical bytes on every run. | Reproducible without adding Python to CI. |

### Security

| # | Decision | Reason |
| --- | --- | --- |
| 30 | `frame-src 'none'`. | The plan allows only the widget origin, a second domain registered before Release 4. Until it exists, no frames. |
| 31 | Trusted Types: `require-trusted-types-for 'script'; trusted-types 'none'`. | Supporting browsers refuse every string passed to an HTML or script sink and no policy can be created. Round 4's service worker registration is a script-URL sink, so that round must add one named policy. |
| 32 | `Referrer-Policy: no-referrer`; HSTS `max-age=63072000; includeSubDomains; preload`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`; no `X-Frame-Options`. | "A strict Referrer-Policy": the strictest value. HSTS values meet the preload list's requirements. The Permissions-Policy lists exactly the plan's three features. `frame-ancestors 'none'` supersedes `X-Frame-Options` in every supported browser. |
| 33 | Headers are defined once in `packages/web/build/headers.ts`, written to Cloudflare's `_headers` file in the build output, and applied by `vite preview`, so end-to-end tests run under the deployed policy. Hashed files under `/assets/` are cached for a year as immutable. | `_headers` works for both Cloudflare Pages and Workers static assets. The choice between them is still a recommendation in the plan, so no `wrangler` configuration is added and nothing is deployed. |
| 34 | The Vite dev server does not send the CSP. | Vite's hot reload injects `<style>` elements, which `style-src 'self'` blocks. Preview, tests and production do send it. |
| 35 | Lint bans HTML sinks outright (`innerHTML`, `outerHTML`, `srcdoc`, `insertAdjacentHTML`, `createContextualFragment`, `setHTMLUnsafe`, `parseFromString`, `document.write`, `on*` attributes), not only with dynamic content, plus `eval`, string timers and `new Function`. | With Trusted Types enforced, even a constant string assigned to `innerHTML` throws, so allowing constants would only move the error to runtime. |
| 36 | Lint restricts `localStorage`, `sessionStorage` and `indexedDB` to `packages/web/src/storage/` and bans `document.cookie`. | Invariant 6 (storage behind interfaces) and "no cookies for guests", enforced from the first round. |
| 37 | The size check measures gzip at level 9 for text files and file size for fonts and images. The core set is the HTML, its scripts and their static imports, its stylesheets and what they load. | Gzip is larger than the Brotli Cloudflare usually sends, so the check is conservative. Dynamic imports are lazy tiers and excluded. |
| 38 | The domain in the brand module is the placeholder `[domain]`. | The domain follows from the undecided product name. A bracketed value fails loudly if used in a URL. |

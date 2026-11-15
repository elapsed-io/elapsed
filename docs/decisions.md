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

## Release 1, round 2: Timer engine (2026-11-15)

### Settled by the owner during the round

| # | Decision | Reason |
| --- | --- | --- |
| 39 | **owner** Device clock set back while a session is open: every stored time in the open session shifts back by the jump, so no focused time is lost and segments stay in order. While the page is open, jumps are detected by comparing `Date.now()` with `performance.now()`. | The plan requires tests for system clock changes but did not say how the timer should behave. |
| 40 | **owner** When the page reopens and the device clock is behind the last heartbeat, the session resumes from the last saved elapsed time, crediting nothing for the closed period. **Round 4** implements this with the heartbeat; round 2 has no persistence. | Same question; the reopened page has no monotonic clock to compare with. |
| 41 | **owner** Time zone and daylight saving changes are not jumps: all times are stored as UTC epoch milliseconds. The local day is decided once, from the time zone in force when the session starts. | Same question. |
| 42 | A device clock set forward counts like sleep. | It cannot be told apart from a shut lid (on macOS the monotonic clock pauses during sleep). The plan already bounds it: check-ins credit unattended time only up to the next check-in (round 4), and the server checks session times against its own clock (Release 3). |

### Engine design

| # | Decision | Reason |
| --- | --- | --- |
| 43 | Jump detection: on every wake and command the engine predicts the device clock as its last reading plus the monotonic time since. If the device clock is more than `CONFIG.engine.clockJumpTolerance` (250 ms) behind that, the open session shifts back by the whole difference. Smaller steps are absorbed (the engine's time holds still until the clock catches up) and add up until they pass the tolerance. | 250 ms is above the timer coarsening some browsers apply for privacy (Firefox's resist-fingerprinting rounds to 100 ms), so noise never shifts a session, while a real change is caught on the next wake. |
| 44 | The engine's time never goes backward except through a detected jump, and every command records `max(now, the session's latest record)`. Ended sessions are never shifted. | Segments stay ordered whatever the clock does; a finished session is history. |
| 45 | A detected jump refreshes the view and the next wake even if the command that noticed it then does not apply. | Found by the randomised test: `pause()` on a paused session noticed a jump, shifted the session and returned without refreshing the view. |
| 46 | One scheduler with one timer, keyed tasks and deadlines in monotonic time; a timer up to 2 ms early counts as on time. | Plan: "one scheduler ... never separate intervals per module." Monotonic deadlines are what browser timers use, so a clock change never delays or hurries a wake. |
| 47 | Visible precision: with seconds blurring away, every second for the first 10 s of focus, every 10 s until 60 s, then every minute; "always" is every second, "never" every minute. While paused, the pause length updates every second. | Between 10 and 60 s only the tens digit is visible, so a per-second render would repeat an unchanged value. The paused frame shows "paused for hh:mm:ss". |
| 48 | Events: `session.started`, `session.paused`, `session.resumed`, `session.ended`, `view.changed`, `milestone.hour` from the plan, plus `mode.switched` and `clock.jumped`. `gap.detected` and `checkin.due` arrive with round 4, `record.passed` with Release 3. Every payload carries `at`, when it happened. | Both additions change the stored session, so round 4's storage must hear about them. |
| 49 | A milestone is emitted once per focused hour, dated to the moment focus reached it, even when several are noticed together after sleep. | The plan's personal-record marker and later statistics need exact times; subscribers can tell a late milestone by comparing `at` with now. |
| 50 | The event bus is synchronous. An event emitted by a handler is queued and delivered after the current one, a throwing handler is reported to an injected `onError` and the rest still run. | Every subscriber sees the same order, and one broken widget cannot stop the timer. Core has no console or timers to report through, so the site injects `reportError`. |
| 51 | Engine commands return `false` when they do not apply (a double-clicked pause) and throw only for invalid arguments (an unknown end reason or a malformed mode id). | Harmless repeats from the UI; programming errors stay loud. |
| 52 | Sessions are deep-frozen. Commands are pure functions that return a new frozen session sharing unchanged segments. | Subscribers (display modes, widgets later) cannot change shared state; pure functions are what round 4's replay-on-wake needs. |
| 53 | `parseSession` is strict: exactly the schema's fields, plain objects only, data fields only (accessors are rejected without being run), whole non-negative milliseconds, ordered non-overlapping segments, at most one running segment and only last, a first mode starting with the session, a real calendar date. It returns a fresh frozen object. `migrateSession` dispatches on the schema number (only 1 exists). | Plan: data read back from storage is input. Release 3's server reuses the same code. |
| 54 | Limits in the config module: 10,000 segments, 10,000 gaps, 1,000 mode changes, mode ids up to 32 characters of `a-z`, `0-9` and `-`. At the segment limit the engine refuses to pause, so the user can still end the session. | Bounds the cost of validating untrusted data; no honest session gets near them. |
| 55 | Session ids are lowercase UUIDs from an injected generator (`crypto.randomUUID` in the site); the time zone is injected and validated, falling back to UTC. The local day uses `Intl.DateTimeFormat` in that zone with calendar arithmetic in UTC. | Core stays free of browser globals and deterministic in tests; DST cannot move the boundary. |
| 56 | Lint bans `Date.now()`, `new Date()` without arguments, `performance.now()` and `Math.random()` in core source (tests exempt). | Enforces invariant 1 mechanically. |
| 57 | The fake clock is exported as `@stopwatch/core/testing` and models normal time, sleep with the monotonic clock paused (macOS) or running (Windows), background throttling to a 1 s or 1 min grid, and device clock changes. | Round 3 and later web tests reuse it. It is never imported by the site, so it never ships. |
| 58 | The engine is not connected to the page in this round. | Round 3 builds the screen. No JavaScript ships yet and the size budget is unchanged. |

## Release 1, round 3: Default screen (2026-11-15)

### Settled by the owner during the round

| # | Decision | Reason |
| --- | --- | --- |
| 59 | **owner** Until round 6 adds a display mode setting, `?mode=ring` or `?mode=timeline` picks the mode. Only known mode ids are accepted; anything else is ignored and digits is shown. **Round 6 removes the parameter** (and adds "display mode", which its scope list does not name, to the settings panel). | Ring and timeline are built in round 3, before any settings exist. |
| 60 | **owner** In round 3, end (button or E) finishes the session and the screen returns to idle (00:00:00, start). Round 5 replaces this with the countdown and results. | The tabulating and results screens are round 5. |
| 61 | **owner** The ring's tail grows in: at 00:00 only the head shows at 12 o'clock, and the tail lengthens behind it over the first 9 min 10 s (55° of an hour), so it never covers time that has not passed. | No frame shows the start of a session. |
| 62 | **owner** Tab title: running "00:42 · name", paused "paused for 00:04 · name" (the pause length), idle "name". All times hh:mm, so it changes at most once a minute. **Round 4** adds "check in · 02:00 · name" while a check-in waits. | The plan asks for elapsed time in the tab title without a format. |

### Screen and modes

| # | Decision | Reason |
| --- | --- | --- |
| 63 | The seconds blur-away is CSS keyframes generated from the config module's formulas (smoothstep is exactly `cubic-bezier(1/3, 0, 2/3, 1)`). Script only pins the animations to focused time (`currentTime`) and plays or holds them on each render. | Plan: CSS does all motion; JavaScript changes state when something happens and never runs a loop. Pinning to focused time keeps the blur right after pauses, sleep and clock shifts. |
| 64 | The frame shrinks each seconds digit's width; the site translates the whole time by half the width removed instead, with the same curve. Widths are measured from the font once it loads and stored in em. After 60 s the seconds are removed from the layout, which looks identical. | Plan: animations use only transform, opacity and filter. The result is geometrically identical to the frame (tested at nine moments). |
| 65 | The pause treatment (blurred 10 px at 40 %, "paused for" with the pause length over it) is applied to each mode's own time; the ring and timeline stop moving while paused. | Plan, Motion: "Check-in and pause: time blurred 10 px at 40 % opacity, with the foreground text centered on it." Only the digits paused frame exists. |
| 66 | "paused for" is drawn at width 92 like all interface text. The paused frame still sets `font-stretch: 100%` on that label. | Decision 4: interface text at width 92 everywhere. The fixture uses the site's font, so the test cannot see this; the owner may want the frame updated. |
| 67 | Scaling follows decision 1: the pause length (44 px) and each mode's display (ring 280 px, timeline 640 × 110 px, their 52 and 56 px times) scale with the window; the "paused for" label and its 10 px gap stay at frame size. Each mode's own gap (digits 26, ring 20, timeline 18) scales and never drops below its frame size. | Only "the time" and its gap scale; labels are interface text. |
| 68 | Start morphs into pause by crossfading faces of one button (so keyboard focus survives); the row re-centres by sliding (first-last-invert-play with the Web Animations API, transform only); end fades in to its right. Returning to idle fades end out in place. Interface motion uses the start morph's 200 ms with `cubic-bezier(0.2, 0, 0, 1)`, read from CSS custom properties so custom CSS can retune it. The pause blur also transitions over 200 ms. | The plan gives 200 ms for the morph but no easing; this is a standard decelerating curve. |
| 69 | Reduced motion: the seconds cut out with a 200 ms crossfade at the end of each window and the time re-centres in one step; nothing slides; the pause still crossfades but its blur does not animate. The ring and timeline keep their very slow movement for now. | Plan, Motion: "no blur animation ... the final state appears with a short crossfade." Round 8's accessibility pass reviews the ring and timeline. |
| 70 | The timeline strip for the longest session (16 h plus half the visible window) is drawn once and slides by one CSS animation. Two clipped copies colour the ticks muted before now and faint after. Ticks start at 00:00. | No per-minute redraw; about 480 small SVG elements, built once. |
| 71 | The ring's tail is masked by a fixed wedge just before 12 o'clock while focus is under 9 min 10 s; the mask is removed at the first render after that, before the tail could reach the wedge again. | Implements decision 61 with transforms only. |
| 72 | The page paints the idle screen from static HTML before the script runs; the script then rebuilds it with identical markup. Tested pixel for pixel with and without JavaScript. | First paint needs no JavaScript and nothing shifts when it runs. |
| 73 | Display modes are found through a registry and described by manifests (name, tier, budget, source). Digits is bundled (core tier); ring and timeline are separate chunks with their own generated tokens (`virtual:tokens/<mode>.css`). The CI size check enforces each mode's 30 KB code and 150 KB art budgets. | Plan, Loading and performance: modes load on choice and never by direct import. |
| 74 | `replay()` is part of each mode but empty until round 5. | The plan's contract includes it; results are round 5. |
| 75 | Space starts, pauses and resumes; E ends. A focused button handles Space itself (so it acts once); E works everywhere except while typing. Comma is ignored until settings exist (round 6). Keys with any modifier and held-down repeats are ignored. | Plan, Settings catalog > Timer. |
| 76 | The engine's `sync()` runs on `visibilitychange` (when visible), `pageshow` and `focus`. | Closes round 2's open risk: a woken device shows the right time at once. |
| 77 | Lint now also bans `setAttribute('style', …)`. Measured values (the seconds widths) are set with `element.style.setProperty`, which the CSP allows. | The CSP blocks style attributes at runtime. |
| 78 | Pixel tests: screens with nothing moving must match exactly; screens with transform animations (the seconds re-centring, the ring, the timeline) allow up to 60–150 pixels that differ by more than 8 levels. A 1 px change to a gap fails every one of them. | Browsers draw transform-animated elements as separate layers, which moves anti-aliasing by a fraction of a pixel. |

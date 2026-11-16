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

## Between rounds 3 and 4 (2026-11-15)

| # | Decision | Reason |
| --- | --- | --- |
| 79 | Between-round checks are written down in `docs/checks.md` and mostly automated: a plan audit over the source (`tooling/plan-audit.test.ts`) and browser checks for response time, layout shift, long tasks and stored data (`packages/web/e2e/quality.spec.ts`). | Owner instruction: performance, security and design checks between rounds. |
| 80 | The round 3 CI run failed: GitHub's newer Chromium rasterises text inside the sliding timeline layer differently from a static drawing (983 differing pixels against a limit of 150). The ring and timeline references now draw the frame's geometry through the same kind of layer (a group turned or slid by a paused CSS animation, over the same extent), and the timeline's labels are checked by geometry (text, centre within 0.25 px, size, family, weight, colour) instead of pixels. The ring now matches exactly. | Tests should check geometry, not how a given browser version anti-aliases a layer. |
| 81 | The theme preset names moved from `theme/presets.ts` into the brand module. | Found by the audit: they are user-facing copy (shown in settings in round 6), and invariant 12 keeps all copy in one file. |
| 82 | The layout-shift check counts only shifts without recent input, as the Cumulative Layout Shift metric does. The controls row re-centring after a key press or click is the screen answering that input (and slides smoothly). | Load and idle produce no shift at all. |

## Plan changes and round 4 answers (2026-11-15)

| # | Decision | Reason |
| --- | --- | --- |
| 83 | **owner** The owner's "Plan changes for Claude Code" (13 items) are applied to `docs/plan.md` word for word: scaling, the renamed trimmed font, interface text at width 92, the ring tail, check-in timing, missed check-ins, clock changes, the tab title, the display mode setting in round 6, and the counting endpoint (a Cloudflare Worker on the site's address writing daily totals to D1). | Records the answers given in rounds 1 to 4 in the plan itself. |
| 84 | **owner** A check-in that falls due while the device sleeps or the tab is closed can still be answered until 1 hour after it fell due; the four passages that capped lid-shut credit at one interval now read "one interval plus the hour allowed to answer the check-in". | The 1-hour window conflicted with those passages. |
| 85 | **owner** A visit is a page load whose navigation type is not `reload` or `back_forward`; nothing is stored on the device to count it. Each session start counts once. | Plan change 11. |
| 86 | **owner** Check-in interval: running time since the last sign of presence (start, pause, resume or an answered check-in); pauses don't add. Unanswered for 1 hour: the session pauses, backdated to when the check-in appeared; that pause ignores the pause limit and waits up to 12 hours, then the session ends dated to the check-in with reason `checkin_missed`. The "paused after a missed check-in" frame shows it. | Plan changes 5 and 6. |
| 87 | **owner** Until round 5, the session-maximum notice's "view results" returns to idle. | The results screen is round 5. |
| 88 | **owner** Install icon: a placeholder (the ring's track and head dot in graphite and the accent green) generated as SVG and PNG by a committed script, replaced when an icon is designed. | No icon exists in the canvas. |
| 89 | **owner** Crash reports arrive in **round 6**: kept 14 days in a D1 table holding the error message, stack, build version, day, and browser family and major version; query strings and anything the user typed are stripped, each report's size is capped, and the endpoint is rate-limited. | "Kept briefly" needed a number; round 6 adds the switch. |
| 90 | The paused frame still sets the "paused for" label at width 100. The plan now says the canvas draws all interface text at width 92, and the site does; the frame needs that one fix. | Frame and plan disagree on one property; the plan is explicit. |

## Release 1, round 4: Persistence and abandonment (2026-11-15)

Owner answers for this round are decisions 83 to 90 above.

### Rules and engine

| # | Decision | Reason |
| --- | --- | --- |
| 91 | The abandonment rules are pure functions of the **active state** (the open session, the last sign of presence, the missed check-in's time and the pause limit fixed when the pause began) and the current time (`core/src/session/rules.ts`). The engine applies every rule due, in the order each is decided, on every wake, command and restore. A missed check-in is decided an hour after it falls due, so a session maximum reached inside that hour still ends the session at 16 h. | Plan: "the rules are pure functions of the session and the current time"; replay on wake. |
| 92 | Hour milestones are emitted up to each rule's outcome before it applies: an hour crossed before a backdated pause is real; one crossed only in the hour the pause takes back never happened. | Found by the randomised engine test with the rules on. |
| 93 | The engine writes its first heartbeat when a session starts, then every 30 s. A heartbeat more than 5 min old at the next wake records a gap. | So a tab closed in the first 30 s still leaves a heartbeat to measure from. |
| 94 | The engine takes `beforeWake` (run before every scheduled wake) and `observeHeartbeat(at)`. The site uses them to read what other tabs saved before applying any rule, and to count another tab's heartbeat as its own. | A tab frozen in the background would otherwise apply a missed check-in that another tab already answered, or record a gap another tab was watching. |
| 95 | Adopting another tab's state does not re-announce a check-in already announced for the same session. | A gap recorded by another tab is not a new check-in. |

### Storage and tabs

| # | Decision | Reason |
| --- | --- | --- |
| 96 | `SessionStore` keeps two local storage keys: `timer.active` (the active state as JSON with a fixed field order) and `timer.heartbeat` (a whole number of milliseconds). Both are removed when no session is open, so an idle site stores nothing. | Plan, Guest storage: local storage holds only the active session (and settings, round 6). |
| 97 | Read-back is untrusted: over 1,048,576 characters is not parsed; JSON is parsed, then validated and migrated by `core` (`parseActiveState`, `migrateActiveState`); a heartbeat must be digits only. Unreadable data is removed and the site starts idle, unless its schema number is newer than this version knows (a newer tab may be open), in which case it is left alone and not adopted. Full or blocked storage leaves the session running in memory. | Plan, Working rules: stored data is untrusted. |
| 98 | `SettingsStore` arrives with versioned settings in round 6. Until then the check-in interval (2 h), pause limit (30 min), seconds display and usage counts (on) are the defaults in code. | Round 6's scope is "versioned settings"; nothing in round 4 lets a user change a setting. |
| 99 | Tabs: the stored state is the single source of truth. A tab writes it when its own engine changes the session and posts `"changed"` on a BroadcastChannel; a tab re-reads storage on that message, on the `storage` event, before every scheduled wake and when shown again, and adopts the text if it changed. Messages carry no session data. A tab that ends a session posts `"ended"` with its id and reason, so another tab showing that session also shows the session maximum notice. | Invariant 15. A message can arrive before the write is visible in another tab; the storage event and the wake check close that gap without ordering numbers. |
| 100 | A restored session keeps the display mode it was shown in unless `?mode=` asks for another; then the switch is recorded in the session. | The temporary parameter (decision 59) should still work after a refresh. |

### Screens

| # | Decision | Reason |
| --- | --- | --- |
| 101 | Check-in screen: the time is held (blur 10 px, 40 %) and "press any key if you’re still here" (15 px, foreground) is centred over it, in every mode, while the session keeps running and the buttons stay pause and end. The line does not wrap: on a phone it is wider than the shrunken time and stays centred. | Check-in frame; plan, Motion. |
| 102 | Any key answers. A key without Ctrl, Alt or Meta is then consumed, keydown and keyup, so Space does not also pause or press a focused button; Tab and keys typed into a text field pass through. Any pointer press answers and still acts, so a click on pause answers and pauses. | Plan: "any key, click or tap", non-modal. |
| 103 | A polite live region announces a check-in, a pause after a missed check-in ("a check-in went unanswered at 2:00 pm") and the session maximum. | Plan: a check-in "is always announced to screen readers". |
| 104 | The missed check-in's time uses the browser's locale ("follow region") with `hour: numeric, minute: 2-digit`, lowercased, with the narrow no-break space before am/pm shown as a space as in the frame. Round 6's clock format setting replaces the locale default. | Paused-after-a-missed-check-in frame; Settings catalog > Clock format. |
| 105 | Session maximum notice: replaces the time and buttons; the corner icons stay. Its time scales like every time (decision 1); text, icon and the 16 px gaps keep frame sizes. It fades in over 200 ms. Its icon is drawn as in the frame (a clock with a top button; not a Tabler icon). Focus moves to "view results" when it was in the hidden buttons or nowhere. Space or "view results" returns to idle, and a new session can start at once. | Session maximum frame; owner decision 87. No motion is specified for it. |
| 106 | A session ended by the pause limit or after a missed check-in's 12 hours returns to idle until round 5. | Round 5 adds results; "sessions that end automatically skip the countdown". |
| 107 | The notice's copy says the session "has ended and been saved", as in the frame. Until round 5 an ended guest session is not kept anywhere. | Copy is the frame's; round 5 adds tab-scoped storage. Listed as an open risk. |

### Counting endpoint

| # | Decision | Reason |
| --- | --- | --- |
| 108 | The endpoint is `packages/endpoint`: one Cloudflare Worker that serves the built site as static assets and runs its script only for `/api/*` (`run_worker_first`). `POST /api/count` adds one to `daily_counts(day, event, count)` in D1 through the `COUNTS` binding. Round 6 adds crash reports to the same Worker. | Plan, Stack (owner decision 83). The plan's layout lists `core`, `web` and (Release 3) `api`; this small package is the Release 1 endpoint. |
| 109 | Counted: a page load whose navigation type is not `reload` or `back_forward` (a prerendered page counts when shown; a browser without the entry counts), and each session start in the tab that started it (not a restore or another tab's session). The request is `fetch` with `keepalive`, no credentials, no referrer, no cache, and a body of only the event's name. Offline counts are lost, never queued. | Owner decision 85; plan: nothing stored on the device to count. |
| 110 | The Worker accepts only a same-origin (`Sec-Fetch-Site`, `Origin`) POST of `application/json`, at most 256 bytes of valid UTF-8, whose body is exactly `{"event":"visit"}` or `{"event":"session"}` (shared validation in `core/src/counts.ts`). The day is the server's UTC date. Every response carries its own security headers and `no-store`, because `_headers` does not apply to Worker responses. Worker logs (`observability`), `workers.dev` and preview URLs are off. | Plan, Security > Anonymous counts: no cookies, no stored addresses, totals only. |
| 111 | No Workers or D1 type package and no Wrangler are installed: the few D1 calls are typed by hand, and tests run the real migration and SQL on Node's built-in SQLite. `wrangler.jsonc` holds a placeholder database id until the first deploy. | No new dependencies; nothing is deployed in Release 1 rounds. |

### Offline and installing

| # | Decision | Reason |
| --- | --- | --- |
| 112 | The service worker (`src/sw/sw.ts`) is built as `/sw.js`, an extra entry of the site build that the build checks has no imports or exports, and registered as a classic script for scope `/`. | One self-contained file at the root, so its scope covers the site. |
| 113 | On install it caches the core: the page and everything it loads before it is interactive (the same closure as the size budget), the manifest and the tab icon. Hashed files are cache-first and cached when first fetched, so a display mode is kept once picked and never fetched in advance. The page is network-first; every address of it shares one cache entry. Other files are network-first. `/api/`, `/sw.js` and `/sw-control.json` are never handled. Matching ignores `Vary`. | Plan, Infrastructure > Offline. Servers may vary on Origin, and module scripts are CORS requests. |
| 114 | Version check: the build version (a hash of the page, the worker and every file name) is written into `/sw.js`, which is registered with `updateViaCache: 'none'` and served `no-cache`, so every visit checks it. A new version installs in the background, removes old caches when it takes over, and takes over once no tab uses the old one. | A running tab keeps the files it started with; old lazy chunks stay reachable. |
| 115 | Kill switch: `/sw-control.json` (`{"serviceWorker":"on"}`) is read on every load with `no-store`. `"off"` tells the worker to stop caching, unregisters it and empties its caches. No answer (offline) leaves offline support on. A failed registration (private browsing, blocked) is not reported as an error. | Plan: "a remote kill switch"; offline must keep working when the network is gone. |
| 116 | CSP: `trusted-types service-worker` replaces `'none'`: one policy, created once, that accepts exactly `/sw.js` as a worker script URL. `worker-src 'self'` and `manifest-src 'self'` are added. No origin is added. | Trusted Types refuse a string as a worker URL; without `manifest-src` the default `'none'` blocks the manifest. |
| 117 | Web app manifest from the brand module and the default theme (standalone, theme colour graphite), with the placeholder icon as SVG, 192 and 512 px PNGs (the 512 px file also as maskable: the drawing stays in the safe zone) and a 180 px apple-touch-icon. The tab icon replaces the empty `data:` icon. | Owner decision 88. |
| 118 | The icons are drawn by `packages/web/scripts/icons/` without any image library (4 × 4 supersampled coverage, PNG written with Node's zlib); a test checks the committed files still match the script. | No new dependencies; reproducible art. |

### Tests and checks

| # | Decision | Reason |
| --- | --- | --- |
| 119 | Playwright blocks service workers in every test except `offline.spec.ts`, where they would otherwise answer requests out of the tests' reach. | Isolation. |
| 120 | Playwright's fake clock replaces `performance`, which hides navigation entries, so "no visit on reload" is tested without it. | Otherwise every reload under the fake clock looks like a new visit. |
| 121 | The session maximum frame test removes focus before comparing: the browser rings the focused button, and the frame draws no focus state. Focus styles are round 8's accessibility pass. | The notice moves focus on purpose (decision 105). |
| 122 | The plan audit now also keeps Cache Storage behind the storage adapters (the service worker excepted), ignores comments when looking for storage, and does not treat lists of class names as copy. | Found by the audit itself this round. |

## Round 5 answers (2026-11-15)

Settled by the owner before round 5 (End screen) began.

| # | Decision | Reason |
| --- | --- | --- |
| 123 | **owner** The results frames' guest invite ("this session isn’t saved. create an account to keep it.") is hidden until accounts exist in Release 3. | Release 1 has no accounts; no dead link. |
| 124 | **owner** For guests, the session maximum notice drops "and been saved": "a single session can hold up to 16 hours of focus. this one has ended; start a new one whenever you’re ready." Accounts (Release 3) get the frame's wording. | The results frame tells guests their session isn't saved. |
| 125 | **owner** The results headline counts up during the replay as in the frame, in CSS alone: an integer custom property registered with `@property`, animated from 0 to the total seconds over the replay, shown as hours, minutes and seconds through `counter()` with tabular figures. No JavaScript loop. With reduced motion, or where unsupported, the final value shows at once. | The frame counts up; the plan forbids animation loops in script. This one animated custom property is the only exception to "transform, opacity and filter". |
| 126 | **owner** Ring (and later analog) results: up to 6 hours exactly as the frame; beyond that the rings get closer and thinner so every hour fits in the same 230 px circle. | A session can hold 16 hours; 13 px rings fit about 6. |
| 127 | **owner** A session ended through the countdown ends at the moment end was pressed; the countdown's seconds are not focus. Cancel resumes as if end had never been pressed, so those seconds count. | "Cancel resumes with no time lost." |
| 128 | **owner** Retry, and Space on the results screen, start a new session at once. | |
| 129 | **owner** No settings and account icons during the 5-second countdown and the 0.9 s tabulating hold, as in the frames; they return with the results. | Frames and plan disagreed; the frames win here. |
| 130 | **owner** Results sizing: the focused headline scales like the timer's time; text, stats, icons and buttons stay at frame sizes; the replay graphic (strip, rings or chart) shrinks to fit narrower windows but never grows past its frame size; below 720 px wide, the six stats wrap into two rows of three. | Results frames are 720 × 520 with a 600 px strip. |
| 131 | **owner** Share opens the device's share sheet on touch devices (touch as the main pointer) and copies the text on computers, even where the browser has a share sheet. | Plan: "through the device's share sheet, or copies it on desktop". |
| 132 | **owner** After copying, the share icon becomes a check mark for 2 seconds, and screen readers hear "copied". | No frame shows it. |
| 133 | **owner** A session shorter than a minute still gets the countdown and results; the 1-minute rule is for saved history (Release 3). | |
| 134 | **owner** Reloading a tab that shows results shows them again from tab storage, in their final state, without the replay. | The replay plays once. |
| 135 | **owner** Results headline colons are tightened and raised like every other time; the results frames were corrected to match (canvas version 1794786803-7dbc). | The first results frames drew plain colons, against Design system > Type. |
| 136 | **owner** The tabulating screen keeps the countdown's layout: the buttons vanish but keep their space, so nothing moves. The results frames' tabulating layer was corrected to the same position (52 px spacer). | The first frames would have made the text and bar jump 7 px. |
| 137 | **owner** The owner's updated "Plan changes for Claude Code" (31 items) is applied to `docs/plan.md`: items 1–13 were already there (decision 83); items 14–31 are placed in Decisions (Controls, Results, Interface, Guest invite, Guest storage, History), the Design system (scaling, Type, Motion, Display modes), the Session lifecycle table (lid shut, session maximum, Consequence), the round 4 and round 6 roadmap entries and the Privacy table. Quoted wording is verbatim. | Records decisions 84, 87–89, 123–136 in the plan itself. |
| 138 | **owner** The Principles' "Appealing and fast" row names the two animation exceptions: results replays may animate SVG stroke offsets, and the results headline may count up through an animated integer custom property. The mentions under Results and Performance stay as they are. The plan audit allows exactly these two, in the replay modules and the results screen. | Plan changes, item 32. |

## Release 1, round 5: End screen (2026-11-16)

Owner answers for this round are decisions 123 to 138.

| # | Decision | Reason |
| --- | --- | --- |
| 139 | The engine gains `end(reason, { at })`, which dates the end to an earlier moment but never before the session's last pause or resume, and `now()`, its current time with any detected clock jump corrected. The countdown records `now()` when end is pressed and ends there when it completes. A device that sleeps through the countdown adds nothing. | Decision 127. |
| 140 | The countdown is one browser animation of the bar (a transform, linear, 5 s); its finishing is the countdown completing, so no timer exists. End now finishes that animation, and is ignored while its time is under 300 ms. Space or Escape cancels, E ends now. Focus moves to cancel when it was on a button the countdown replaced. | Plan, Controls; no script timers outside the one scheduler. |
| 141 | The results screen is its own chunk, loaded the first time it is needed and preloaded when the countdown starts. The focus strip is a chunk shared by digits and timeline; the ring's replay ships with the ring. | Plan, Loading: "results screen: on first use". The core grew from 15.3 to 17.8 KB of JavaScript (budget 50). |
| 142 | A mode's `replay(root, session)` may return a promise (to load its drawing code). It creates its animations with the replay's timing and no delay; the results screen sets their start, 2 s after the tabulating screen completes, or finishes them at once. The cubic ease-in-out is drawn exactly as a CSS `linear()` easing of 33 points generated from the config module. | One clock for the whole sequence; the plan's easing without approximating it by a Bézier curve. |
| 143 | The sequence is timed from the moment the tabulating screen is complete: it fades out from 0.9 s over 0.8 s, the results and the corner icons fade in from 1.0 s over 1.0 s, rising 10 px, with the frames' smoothstep. With reduced motion, the tabulating screen holds 0.9 s, then crossfades to the final results over 200 ms; there is no rise, replay or count. | Plan, Motion; the results frames' curves. |
| 144 | Focus strip: bars from 1 px after each stretch's start to 1 px before its end; start and end clock times at the ends; whole hours between, each starting 16 px before its hour as in the frame; an hour label that would come within 8 px of another label is left out (so long sessions show every other hour, and so on), rechecked when the strip's width changes. The replay reveals the bars with a clipping box sliding in while its content slides back, so only transforms move. | The frame's geometry; the plan's motion rules. |
| 145 | Ring results: each hour's focus is revealed by a mask whose stroke offset moves (the plan's allowed replay exception) while the hands turn from 12 o'clock; once the replay has finished, every hour's focus is drawn as one path, as the frame draws it. Past 6 hours the rings keep the frame's outermost and innermost radii and divide the space between them, with strokes thinned in proportion. | Decisions 126 and 138; matches the frame to the pixel. |
| 146 | The count-up animates the registered integer `--results-focused` through keyframes at each pause and resume (focus up to that moment), with the replay's easing, so it stands still across pauses; hours, minutes and seconds are shown with `counter()` and the tightened colons. Once it lands, the animation is removed and plain text remains. A visually hidden copy of the total is what screen readers read. Where `CSS.registerProperty`, `mod()` or `round()` is missing, the total shows at once. | Decision 125. |
| 147 | The finished session is kept in this tab's session storage (`timer.finished`), validated when read; it is saved when a session ends in this tab or another tab reports an automatic ending, and deleted when a session starts. A reload with no open session and a finished one shows the results in their final state. | Plan, Guest storage; decision 134. |
| 148 | Tab messages: "ended" now carries the finished session, which the receiver validates like stored data. A session that ended on its own (pause limit, missed check-in, session maximum) shows the same results or notice in every tab that was showing it; a session the user ended shows its results in that tab only, and other tabs go idle. | Rules apply in whichever tab wakes first, which may not be the one the user is looking at. |
| 149 | Clock times on the results follow the region (decision 104); the frames show a 24-hour region, which the frame tests use. The share link for guests is the site's own address. The shared duration reads "2h 47m", "47m", or "45s" under a minute. A copy the browser refuses shows no confirmation. | Plan, Results and Settings > Clock format. |
| 150 | Retry has focus when the results replace the button that had it. On the results, Space starts the next session (decision 128); E does nothing. The title is the product name, as when idle. | |
| 151 | Below 720 px wide the results keep a 16 px side margin and three stat columns; the breakpoint is generated from the config module into the token stylesheet, since a media query cannot read a custom property. The ring layout puts the drawing above the stats when they no longer fit side by side, and the results scroll if a window is too short. | Decision 130. |
| 152 | The plan audit now accounts for every script animation: inline keyframes must use transform or opacity, keyframes built elsewhere are allowed only in the ring replay and the results screen, and the only other properties allowed are stroke offsets in replay modules and `--results-focused` on the results screen. | Decision 138. |
| 153 | The results screen sets `data-ready` once everything is drawn and timed. | Tests (and later custom CSS) need a moment when the screen is complete. |

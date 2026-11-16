# Release review: Release 1

Date: 2026-11-16. Template: plan, Safety overviews > Release review, preceded by round 8's own overview
(the round template). Every checklist item is answered below; every open risk from rounds 1 to 8 is
closed, accepted with its reason, or answered by the owner (part E). Part G records the fixes made after
the owner's review, before the test run.

**Status: ready for the owner's sign-off.** Nothing is deployed: the owner runs every deploy
(`docs/test-run.md`). Release 1 is frozen once signed off; problems testers find are fixed on this
branch first, ahead of Release 2.

## A. Round 8 (Hardening)

### 1. What changed

Accessibility, performance, cross-browser, security and test-run work, without new features.

- **Accessibility (WCAG 2.2 AA):** one 2 px focus ring in the foreground colour; the settings panel is a
  modal dialog that keeps focus and closes with Escape, returning focus; the time is a `role="timer"`
  read on request in words and never announced, with the pause length read instead while paused; the
  account icon is decoration until accounts exist; 44 px tap areas everywhere; reflow at 320 px and 200 %
  zoom; muted text at 4.5:1 in every theme (decisions 206, 216 to 220).
- **Performance:** nothing is drawn in a hidden tab; the heartbeat shares the minute's wake; the time zone
  is read at load instead of on the first tap (73 ms → 23 to 36 ms on a four-times-slower processor); and,
  correcting round 3, the pause blur no longer animates, as the plan allows no animated blur but the
  seconds blur-away (decisions 221, 222, 227, 231).
- **Cross-browser:** CI runs every end-to-end test in Chromium, Firefox and WebKit. Two real bugs were
  found and fixed: Firefox drew every hour's ring in full from the replay's first frame (a unitless
  `calc()` it ignores; decision 225), and Firefox drew every scaled size 1.5 % too small on narrow screens
  (decision 228). Test-only differences between engines are handled as decisions 224, 226, 229 and 234
  record.
- **Security:** a live session is checked against the data inventory in all three engines; secrets are
  scanned in every file (and were scanned once in the whole history); a script checks a deployed build's
  headers, status codes and cookies (decisions 230, 232, 233).
- **Test run:** a `test` environment (its own Worker on workers.dev and its own database), deploy and
  Access instructions, a header check, a rollback plan, known issues and real-device checklists
  (`docs/test-run.md`, `docs/rollback.md`, `docs/known-issues.md`, `docs/device-checks.md`; decision 235).

### 2. Data

Nothing new is read, stored or sent by the site. The private test run adds Cloudflare Access on the
test address: testers' emails on the invite list, emailed sign-in codes, Cloudflare's sign-in log and a
`CF_Authorization` cookie, for the run only, disclosed in the invitation and in `docs/data-inventory.md`.
Testers' counts and crash reports go to a separate database deleted after the run.

### 3. Inputs

No new user input. `tooling/check-deployed.ts` reads an address and, behind Access, a service token from
the owner's environment; it only reads responses.

### 4. Dependencies

| Package | Purpose | Size | Licence | Version |
| --- | --- | --- | --- | --- |
| axe-core (development only) | WCAG 2.2 rule checks in the end-to-end tests | 3 MB installed, never shipped | MPL-2.0 | 4.14.0 |
| actions/upload-artifact (CI only) | Keeps a failed browser job's screenshots for 7 days | — | MIT | v7.0.2, pinned to its commit |
| wrangler (the owner's machine only, through `npx`) | Deploys; not installed in the repository | — | MIT OR Apache-2.0 | 4.162.0 |

### 5. Security surface

- **CSP and headers:** unchanged. Two registered custom properties (`--view-width`, `--view-height`)
  change no policy.
- **Storage keys, endpoints, auth:** none new. The endpoint's response headers moved to their own module.
- **Test run:** a second Worker, `elapsed-test`, on a workers.dev address behind Access, with bypass rules
  for `/api/`, the manifest and the icons, which are fetched without cookies (decision 235). Production
  keeps workers.dev and preview URLs off.
- **CI:** browser jobs upload their test images when they fail; the images show only the app.

### 6. Abuse cases

| Case | Defence |
| --- | --- |
| Someone finds the test address | Access lets only invited emails in; the bypassed paths expose only the counting and crash endpoints (public at launch too, same-origin checks, size caps, a rate limit for crash reports) and two static files. |
| Counts or crash reports posted to the test endpoint by a stranger | They land in the test database, which holds only totals and scrubbed reports and is deleted after the run. |
| A leaked service token | It opens only the test address, which holds nothing private; the instructions say to delete it after the header check. |
| A secret committed by mistake | The repository test fails on the shapes of keys and tokens; `.env*` and `.dev.vars*` are ignored. GitHub's push protection is recommended (part E). |
| A CDN or platform cookie appears | The header check fails on any cookie but Access's own during the test run. |
| A slow phone makes the first tap feel broken | The first tap no longer waits for time zone data; a Chromium test holds the first taps under 100 ms on a four-times-slower processor. |

### 7. Tests

- `e2e/accessibility.spec.ts`: axe-core on every screen and category in four themes with a planted-fault
  control; keyboard order and focus ring; the panel's focus trap and Escape; shortcuts never while typing;
  the time read on request; 44 px targets on touch; reflow; reduced motion.
- `e2e/performance.spec.ts`: a simulated two-hour hidden session (one pending timer, nothing drawn, at
  most 222 wakes, the display caught up on return) and flat memory and element count (Chromium).
- `e2e/privacy.spec.ts`: a live session against the data inventory, in all three engines.
- `e2e/quality.spec.ts`: the 100 ms response, also on a four-times-slower processor (Chromium).
- `e2e/frames.spec.ts`: a control check that the cross-engine pixel rule still fails a wrong frame.
- `tooling/plan-audit.test.ts`: no animated blur but the seconds blur-away.
- `tooling/repository-text.test.ts`: no secrets; local secret files ignored.
- `tooling/deployed-headers.test.ts`: the deployed-header check's parsing, matching and judging.
- Totals: 520 unit tests; 178 end-to-end tests in Chromium, with 2 skipped in Firefox and 4 in WebKit
  (decisions 223, 224 and 231), all inside the reference image (CI run 43825186233, commit `2c9c8ff`).

### 8. Open risks

Listed in parts C and E.

## B. The release review checklist

| Item (plan, Release review) | Answer |
| --- | --- |
| Every round overview is re-read, and each open risk is closed or accepted in writing. | Done: part C answers all 56 open risks of rounds 1 to 7; part E lists those that need the owner. |
| The data inventory matches a live session: no third-party requests, no unexpected storage keys or cookies. | Done in CI: `e2e/privacy.spec.ts` uses every Release 1 feature in Chromium, Firefox and WebKit and checks every request, body, stored key and cookie against `docs/data-inventory.md`. On the deployed build, `npm run check:deployed` checks cookies too; the owner runs it after the deploy. |
| Dependencies are audited for known vulnerabilities, unused packages are removed, and the lockfile is committed. | Done: `npm audit` finds 0 vulnerabilities; all 136 installed packages have verified registry signatures, and 53 of them verified attestations; the site has no runtime dependencies, and each of the 9 development dependencies is used; the lockfile is committed and CI installs from it without install scripts. The `minimatch` override (decision 9) is still needed: typescript-eslint still asks for `^10.2.2`. |
| The CSP and headers are verified on the deployed build, not only locally. | Ready, pending the deploy: `npm run check:deployed -- app <test address>` (`docs/test-run.md`, step 5) and `-- soon https://elapsed.io` compare every response with the `_headers` that was deployed. Locally, the exact CSP and headers are tested on the production build in all three engines. **Owner action after deploying.** |
| The malicious-CSS corpus passes and safe mode works. | Done: the 44-entry corpus, the scoping and lock tests, and safe mode pass in Chromium, Firefox and WebKit (`e2e/custom-css.spec.ts`), so constructed stylesheets under the CSP and `@scope` work in every engine (plan, defence 3; decision 237). |
| The threat model is updated for the new features. | Done: part D. |
| Accessibility checks and performance budgets pass. | Done in CI: WCAG 2.2 A and AA rules, keyboard, screen-reader, touch, reflow and reduced-motion tests; size budgets (core JavaScript 30.5 of 50 KB, core total 58.0 of 150 KB, ring 3.0 KB and timeline 1.7 KB of 30 KB); 100 ms responses; long tasks; layout shift; the two-hour session. What needs a real device is in part F. |
| From Release 3: auth flows, rate limits, session expiry, export and deletion are reviewed, and no secrets are in the repository. | Not applicable until Release 3, apart from secrets, which are checked now (decision 233). |
| A rollback plan is written. | Done: `docs/rollback.md` (the app's versions, the offline kill switch, the soon page, the database, the domain at launch). |
| The owner signs off. | **Ready for the owner's sign-off** (part G lists the fixes since the review). |

## C. Open risks from earlier rounds

| Round, item | Status |
| --- | --- |
| 1.1-1 Muted text contrast | Closed: 4.5:1 against background and panel in every theme (decision 206). |
| 1.1-2 Start text at 4.50:1 in lilac and mint | Accepted: the contrast check fails any regression. |
| 1.1-3 Font rounding at width 92 | Accepted (decision 28). |
| 1.1-4 HSTS preload | On the launch checklist (part E). |
| 1.1-5 Trusted Types for the service worker | Closed in round 4: one named policy that accepts only `/sw.js`. |
| 1.1-6 Manifest and worker sources | Closed in round 4: `manifest-src 'self'`, `worker-src 'self'`. |
| 1.1-7 Dependency review needs the graph | Closed: the repository is public. |
| 1.1-8 minimatch override | Accepted: still needed (part B). |
| 1.1-9 TypeScript 7 | Follow-up: move when typescript-eslint supports it. |
| 1.1-10 Cross-browser | Closed: every end-to-end test runs in Chromium, Firefox and WebKit; Trusted Types where supported. |
| 1.1-11 The dev server has no CSP | Accepted: checks use the production build. |
| 1.1-12 Domain placeholder | Closed: elapsed.io; a test forbids the placeholders. |
| 1.1-13 No JavaScript measured | Closed: the size budget measures every build. |
| 1.2-1 Stale display after waking | Closed in round 3: sync on `visibilitychange`, `pageshow` and `focus`. |
| 1.2-2 Reopening with the clock behind | Closed in round 4 (heartbeat). |
| 1.2-3 Forward jumps credited | Closed for Release 1: check-ins bound lid-shut credit; server checks come in Release 3. |
| 1.2-4 Event list additions | Accepted (decision 48). |
| 1.2-5 Real browser clocks | Tested end to end in three engines; real sleep and wake are device checks (part F). |
| 1.2-6 Time zone data lag | Accepted: only the day a session counts toward. |
| 1.2-7 Config not frozen at runtime | Accepted: only first-party code runs. |
| 1.3-1 `?mode=` parameter | Closed in round 6: the display mode is a setting. |
| 1.3-2 Digits flash before ring or timeline | Accepted: the static page paints the digits idle screen, and a stored ring or timeline replaces it once its code loads (from the offline cache after the first visit). Watched on the slow phone (part F). |
| 1.3-3 "paused for" width | Closed: the revised paused frames match exactly. |
| 1.3-4 Ring and timeline on phones | Partly closed: the timeline track no longer scales (decision 211); phone layouts are Release 2. |
| 1.3-5 Reduced motion for ring and timeline | Closed: the ring steps, and the timeline moves once a minute without motion. |
| 1.3-6 Accessibility pass | Closed (decisions 216 to 220). |
| 1.3-7 Blur-away and morph in other engines | Closed: frame tests pass in all three engines (decision 226). |
| 1.3-8 Unsaved sessions | Closed in round 4. |
| 1.4-1 "Ended and been saved" | Closed in round 5 (tab storage). |
| 1.4-2 Not run on Cloudflare | Narrowed: the dry run validated only the configuration, and the first test deploy failed at startup (error 10021, decision 276). Both Workers now start in Cloudflare's own runtime and answer real requests in CI and before every deploy (`npm run check:workers`); what only Cloudflare's network shows (Access, the custom domain, the deployed headers) stays for the owner's header check after deploying. |
| 1.4-3 Settings and the privacy policy | Closed: settings in round 6; the privacy page is published. |
| 1.4-4 Cross-browser check-ins, offline and Safari storage | Closed in CI for check-ins and offline (two offline tests by hand in Safari, decision 224). Safari's removal of a site's storage after seven days without a visit is accepted and listed in `docs/known-issues.md`. |
| 1.4-5 Lie-fi | Accepted: the cached page is used once the browser gives up. |
| 1.4-6 A newer schema's data | Accepted: only schema 1 exists. |
| 1.4-7 Rare tab races | Accepted. |
| 1.4-8 Accessibility pass | Closed. |
| 1.5-1 A refused copy shows nothing | Closed: a small cross and "couldn’t copy" (decision 248). |
| 1.5-2 Countdown in background tabs | Accepted. |
| 1.5-3 Masks and count in other engines | Closed: results tests pass in all three; the Firefox ring bug is fixed (decision 225). |
| 1.5-4 Long-task check under load | Accepted: CI runs it reliably. |
| 1.5-5 Results in the paper theme | Closed: matched exactly. |
| 1.5-6 Accessibility pass | Closed: axe-core on the results in four themes. |
| 1.6-1 Questions: source link, animation speed, clear confirm | Closed: animation speed is ready for Release 2 (decision 215); clear device data asks first (decision 198); the source code link stays hidden until the owner says so (decision 250). |
| 1.6-2 Privacy page and terms | Closed for the soon page and linked from settings; they move into the app before launch (part E's launch checklist). |
| 1.6-3 Notifications in the background | Accepted as a platform limit; `docs/known-issues.md`; real devices in part F. |
| 1.6-4 Constructed sheets, fonts from bytes, `indexedDB.databases()`, sliders | Closed: settings tests pass in all three engines. |
| 1.6-5 Timer size beside the panel | Accepted. |
| 1.6-6 Rate limit per Worker instance | Accepted: the cap and 14-day deletion bound it. |
| 1.6-7 Font at first paint | Accepted. |
| 1.6-8 Accessibility pass | Closed. |
| 1.7-1 Questions: the reset-all row, import without confirm | Closed (decision 249). |
| 1.7-2 Custom CSS in other engines | Closed (decision 237). |
| 1.7-3 Tampered storage | Accepted: needs script access already; the CSP bounds it. |
| 1.7-4 Keyframe names | Accepted: the timer view only; safe mode undoes it. |
| 1.7-5 Images and layouts | Release 2. |
| 1.7-6 Accessibility of the editor and confirm step | Closed: axe-core on the advanced category; the confirm step moves focus. |

## D. Threat model for Release 1

| Asset or surface | Threat | Defence | Tested by |
| --- | --- | --- | --- |
| The timer page | Script injection | CSP `script-src 'self'`, Trusted Types (no policy but `/sw.js`), no markup from strings (lint) | `idle.spec.ts`, `plan-audit.test.ts` |
| Custom CSS | Data theft, spoofing, lockout, resource abuse (plan, Threats) | Cleaning with the browser's parser and the core allowlist, the CSP, `@layer user` and `@scope (.view)` with locked isolation, safe mode, the comma shortcut, the 50 KB cap | `custom-css.spec.ts` (44-entry corpus) in three engines |
| Stored data | Tampering or corruption | Every key read back as untrusted and validated; forged data discarded | `storage/*.test.ts`, `persistence.spec.ts` |
| Font files and the settings file | Malicious files | Signature and size checks, fonts kept on the device, the settings file read field by field with its CSS cleaned | `settings.spec.ts`, `custom-css.spec.ts`, unit tests |
| Counting endpoint | Inflated counts, oversized bodies | Same-origin checks, exact bodies only, 256 bytes, totals only | `packages/endpoint` tests |
| Crash endpoint | Flooding, personal data in reports | Opt-in, scrubbed on the device and again on the endpoint, 8 KB, 5 a minute per hashed address, 14 days | `crash.test.ts`, endpoint tests, `settings.spec.ts` |
| Service worker | A bad cached build | Network first, never caches `/api/`, remote kill switch | `offline.spec.ts`, `docs/rollback.md` |
| Privacy | Data beyond the inventory | No cookies, no third parties, the live-session check | `privacy.spec.ts`, `quality.spec.ts` |
| Supply chain | A compromised package or action | No runtime dependencies, pinned versions, signature checks, actions pinned to commits, no install scripts | CI |
| Secrets | A committed key | Pattern test over every file, ignored secret files | `repository-text.test.ts` |
| Deployed configuration | Headers lost or cookies added by the platform | The deployed-header check | `npm run check:deployed` (owner) |
| The test run | Strangers on the test address | Cloudflare Access by email; bypass only for public endpoints and static files | `docs/test-run.md`, step 4 checks |
| The soon page | Script injection, tracking | No script at all (`default-src 'none'`), no cookies | `soon.spec.ts` |

## E. The owner's decisions (2026-11-16)

Each open question went to the owner; the answers are recorded in `docs/decisions.md` and built.

1. **Hidden tab:** accepted, with one timer for both: while hidden, the only wake is the 30-second
   heartbeat, and the tab title follows in that same wake (decision 246; tested: only heartbeat wakes,
   at least 29 s apart, over a simulated two hours).
2. **WebKit timing:** accepted. Safari's painted time is measured by hand (`docs/device-checks.md`, the
   iPhone responsiveness step and the Mac Web Inspector step).
3. **Pause look:** the blur stays static, and the blurred state fades in and out over 0.2 s (decision
   247). The owner will check how it feels.
4. **Failed copy:** a small cross for 2 seconds, and screen readers hear "couldn’t copy" (decision 248).
5. **Reset all and import:** "reset all settings" stays a row like "clear device data", as built; an
   import that would replace different custom CSS asks first with the same confirm step (decision 249).
6. **Settings footer:** privacy, terms and feedback show, as the settings frames draw them; source code
   stays hidden until the owner says the repository is public (decision 250). Note: GitHub lists
   `elapsed-io/elapsed` as public already.
7. **Record colour:** deferred to Release 3, following the muted rule (decision 251).
8. **Pixel rule outside the reference environment:** accepted (decisions 226 and 241).
9. **Launch checklist:** below (decision 252).

### Before the public launch

- [ ] Move the privacy and terms pages into the app (served at `/privacy` and `/terms`), and point the
      settings footer's links at them.
- [ ] Run the header check against elapsed.io once the app is on it: `npm run check:deployed -- app https://elapsed.io`.
- [ ] Turn on GitHub secret scanning and push protection for the repository (the owner is turning them
      on now, where GitHub offers them).
- [ ] Submit elapsed.io to the HSTS preload list only once every subdomain serves HTTPS.
- [ ] Record the real-device checks (`docs/device-checks.md`) and fix what they find, or list it in
      `docs/known-issues.md` with the owner's decision.

## F. What needs a real device

Everything in `docs/device-checks.md`, recorded in its table. In short:

- **iPhone:** installing to the home screen with the placeholder icon; offline after closing the app;
  check-in and pause-limit notifications, with the app in the background and with the phone locked; the
  time and the rules after locking (wake from sleep, a missed check-in, the pause limit); VoiceOver, Reduce
  Motion and the largest text size; taps responding at once.
- **Safari on a Mac:** the two service-worker checks Playwright cannot run in WebKit; the default font
  transferred once; painted frames within 100 ms in Web Inspector; notifications.
- **A low-end Android phone:** first load on a slow connection, taps within 100 ms, no long tasks, idle CPU
  between minute updates, a smooth replay, settings without stalls, a background session, installing,
  notifications, and battery use over an hour.
- **Firefox and Edge** on a computer: a full session in each display mode and every settings category.

## G. Fixes after the review (before the test run)

| Fix | What changed | Tests |
| --- | --- | --- |
| Endpoint tests on older Node | Every query binds exactly as many values as it has placeholders (it always did); the failures on Node 24.3 came from its SQLite refusing numbered placeholders (`?1`), which now are plain `?`. The test database refuses numbered placeholders and wrong counts, and fails the test with SQLite's own message when the endpoint hid an error behind a 503 (decision 239). | `packages/endpoint/src/endpoint.test.ts`, on Node 24.3.0 and 26.13.1 |
| One Node version | 26.13.1, the current LTS, in `.nvmrc`, "engines" (enforced) and every CI job (decision 238). | `tooling/repository-text.test.ts` |
| Animations captured mid-way | Frozen exactly at the frame's moment once ready, and held paused, never caught by real time (decision 240): the countdown bar, the seconds blur-away, the timeline's glide. | `e2e/frames.spec.ts`, `e2e/results.spec.ts` |
| Reproducible pixels | The reference environment is Chromium in Playwright's image (`npm run test:e2e:docker`), which CI also uses; elsewhere, frames are compared after smoothing, with the control test (decision 241). | the whole suite, in CI through the script |
| The slow click | Not first-use code: under contention, slow clicks fell on every control and nothing loaded during them. The timing tests now run alone after each browser's suite, warm up, and are judged on the median (decision 242). | `e2e/timing.spec.ts` |
| Timeline | Glides continuously at 10 px a minute on its own layers, anchored once a minute; still while held; steps with reduced motion (decision 243). | `e2e/modes.spec.ts`, timeline frames |
| Back to the timer | Retry ("back to the timer") and Space on the results return to the idle timer (decision 244). | `e2e/results.spec.ts`, `session.spec.ts`, `persistence.spec.ts`, `quality.spec.ts` |
| Settings over the results | The corner sits above the results, so the settings icon opens the panel there (decision 245). | `e2e/results.spec.ts` |
| Part E's answers | Decisions 246 to 252, as listed in part E. | `engine.test.ts`, `performance.spec.ts`, `modes.spec.ts`, `results.spec.ts`, `custom-css.spec.ts`, `settings.spec.ts` |

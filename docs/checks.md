# Between-round checks

Run after every round, before the next one starts (owner instruction, 2026-11-15). If any check fails,
stop and fix it before continuing.

```bash
npm run check
```

```bash
npm run test:e2e
```

```bash
npm run test:e2e:docker
```

```bash
npm audit --audit-level=moderate
```

```bash
npm audit signatures
```

Then confirm the GitHub Actions run for the pushed commit passed: the checks, and the end-to-end tests
in Chromium, Firefox and WebKit, which CI runs through `tooling/e2e-docker.sh` (Playwright's image, the
reference for exact pixel checks; Node pinned to the version in `.nvmrc`). When a browser job fails, its screenshots are kept as the run's artifact.
Real devices are checked by hand (`docs/device-checks.md`) before a release ships.

| Area | What is checked | Where |
| --- | --- | --- |
| Performance | Core within 50 KB of JavaScript and 150 KB in total, each mode within 30 KB of code and 150 KB of art | `npm run check:size` |
| | No animation loops or polling intervals; timers only through the one scheduler | `tooling/plan-audit.test.ts` |
| | Animations and transitions only on transform, opacity and filter (CSS and script); no animated blur but the seconds blur-away | `tooling/plan-audit.test.ts` |
| | The engine wakes only for visible changes (exact wake counts) | `packages/core/src/engine/*.test.ts` |
| | Controls respond within 100 ms (median after a warm-up, run alone), and the first taps also on a processor four times slower; no main-thread task of 50 ms or more | `packages/web/e2e/timing.spec.ts` (the `-timing` projects) |
| | No unexpected layout shift | `packages/web/e2e/quality.spec.ts` |
| | A two-hour session: one pending timer, nothing drawn while hidden, only the 30-second heartbeat wakes (the title follows in it), memory and element count flat | `packages/web/e2e/performance.spec.ts`, `packages/core/src/engine/engine.test.ts` |
| Security | Dependency advisories and registry signatures | `npm audit`, `npm audit signatures` |
| | Exact CSP and headers; Trusted Types and inline styles blocked; no CSP violations; no third-party requests | `packages/web/e2e/idle.spec.ts` |
| | No markup from strings; storage only through adapters; nothing loaded from another origin | lint, `tooling/plan-audit.test.ts` |
| | Only the stored data `docs/data-inventory.md` lists, and nothing once a session ends; a live session using every feature sends and stores only what the inventory lists | `packages/web/e2e/quality.spec.ts`, `persistence.spec.ts`, `privacy.spec.ts` |
| | No keys, tokens or credentials in any file; local secret files ignored; one Node version everywhere; the reference image at the pinned Playwright version, by digest | `tooling/repository-text.test.ts` |
| | Endpoint SQL: plain placeholders, exactly as many values as placeholders; a hidden database error fails the test | `packages/endpoint/src/endpoint.test.ts` |
| | The deployed build's headers, status codes and cookies match the build (run by the owner after each deploy) | `npm run check:deployed`, `tooling/deployed-headers.test.ts` |
| | Stored data read back as untrusted input; forged or broken data is discarded | `packages/web/src/storage/*.test.ts`, `e2e/persistence.spec.ts` |
| | The counting endpoint refuses anything but a same-origin, size-capped, exact event; nothing from `/api/` is cached | `packages/endpoint/src/*.test.ts`, `e2e/offline.spec.ts` |
| | Crash reports: scrubbed on the device and again on the endpoint, at most 8 KB, 5 a minute per address (hashed, in memory), deleted after 14 days, sent only when switched on | `packages/core/src/crash.test.ts`, `packages/endpoint/src/*.test.ts`, `e2e/settings.spec.ts` |
| | Settings and stored font files read back field by field and by file signature; own font files size-capped, checked by contents, never uploaded | `packages/core/src/settings/*.test.ts`, `packages/web/src/settings/*.test.ts`, `e2e/settings.spec.ts` |
| | Custom CSS: the malicious-CSS corpus is fully neutralised when saved (no request, no CSP violation, nothing kept that loads, no script, the panel on top); the checker's rules and tokenizer; scoping to the timer view; safe mode; the checker loads only with the editor | `packages/core/src/custom-css.test.ts`, `packages/web/e2e/custom-css.spec.ts` |
| | The settings file: another app, kind or version refused; choices validated field by field; its CSS cleaned as if saved; fonts never in it | `packages/core/src/settings/file.test.ts`, `packages/web/e2e/custom-css.spec.ts` |
| | The repository never contains the private admin address or the old name placeholders | `tooling/repository-text.test.ts` |
| | The service worker registers under the CSP and Trusted Types; the kill switch removes it | `packages/web/e2e/offline.spec.ts` |
| Behaviour | Refresh, a closed tab, check-ins, missed check-ins, the pause limit, the session maximum, two tabs, offline | `packages/core/src/**/*.test.ts`, `packages/web/e2e/persistence.spec.ts`, `offline.spec.ts` |
| | The countdown, results, replays, retry, share, reload, reduced motion, phones, automatic endings in every tab | `packages/web/e2e/results.spec.ts`, `packages/web/src/results/*.test.ts` |
| Design | Every built screen against its canvas frame, pixel by pixel, including the paper theme and the six settings frames (outside Chromium, after setting aside sub-pixel glyph placement, with a control) | `packages/web/e2e/frames.spec.ts`, `idle.spec.ts`, `results.spec.ts`, `settings.spec.ts` |
| Accessibility | WCAG 2.2 A and AA rules (axe-core) on every screen, settings category and four themes, with a control; keyboard order, focus ring, focus kept in the panel; the time read on request; 44 px tap targets; reflow at 320 px and 200 % zoom; reduced motion | `packages/web/e2e/accessibility.spec.ts` |
| | Every preset passes the contrast check; built-in fonts have tabular figures (checked when the fonts are built) | `npm run check:contrast`, `packages/web/scripts/font/build_choices.py` |
| | Preset contrast; lowercase copy; copy only in the brand module; numbers only in the config module | `npm run check:contrast`, `tooling/plan-audit.test.ts`, brand tests |

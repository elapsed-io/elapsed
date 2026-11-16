# Overnight: Release 2, rounds 2.1 to 2.7

Working unattended on `claude/release-2` (owner, 2026-11-16 evening). The morning summary goes at the top
when the run stops; questions for the owner are collected below as they come up.

## Morning summary

Written as each round is pushed, so it is current whenever the run stops. At this point rounds 2.1 to 2.4 are
done and round 2.5 (height) is under way.

**What each round built**

- **Release 1 (items 1 and 2):** plan version 6 adopted; interface motion runs 120 to 220 ms on one fast
  ease-out, the start morph 160 ms with a slight spring (CSS `linear()`); the tabulating and results timings
  are faster; each mode's replay has its own length and curve, and sessions over 2 hours replay longer
  through one shared, unit-tested function. The countdown no longer leaves its finished animation behind
  (which made a test press "end now" too early). Pushed to the Release 1 branch and merged into Release 2.
- **Item 4:** `docs/display-mode-contract.md` documents the one contract every mode uses; the contract was
  extended twice, for every mode (replays draw into a surface with a backdrop; the running context carries
  the modes' options).
- **Round 2.2, analog stopwatch:** as the frame, the hands gliding on the compositor.
- **Round 2.3, ocean depth:** the running mode as its frames (the water from the light model, never above the
  surface, gliding); its results rebuilt to the new "build this one" frame: the card lit by the replay's
  depth, the chart zooming out, the depth counting up, up to six landmarks on the path with popping labels
  that fade and come back on hover, focus or a tap, things rising past, two sonar pings; the tile and the
  "ocean depth options" box.
- **Round 2.4, ocean life:** while paused, the frame's fish and bubbles drift in (CSS animations only), one
  zone's catalog loaded at a time; the "ocean life" option.

**Test results** (each round: `npm run check`, then the whole end-to-end suite in Chromium, Firefox and
WebKit through the reference image)

- Release 1 after the motion changes: 549 passed, 6 skipped (declared), 0 failed.
- Release 2 after round 2.3: 693 passed, 12 skipped, 0 failed. After round 2.4: 711 passed, 13 skipped, and two
  WebKit page loads that stalled once (see the progress log; both passed four times over when repeated).
- Unit tests: 528 on Release 1, 552 on Release 2.
- Along the way, intermittent failures were traced and fixed rather than retried: a test that re-created a
  cache it was checking (2.2), CSP reports read before the browser fired them, a helper fooled by a leftover
  countdown animation, transitions a busy WebKit starts a frame late, and Chromium's compositor drawing a
  held glide in its old place. Pixel allowances added tonight are each measured, recorded in a decision, and
  paired with a control that fails by far.

**Skipped and why**

- Rounds 2.5 to 2.7: not finished yet (above).
- Nothing was deployed, merged into Release 1 beyond your items 1 and 2 (and the test fixes they needed),
  released, or changed on Cloudflare or GitHub settings.

**Questions waiting for you** (details in "Questions for the owner" below)

1. The analog hours hand: glide (built, 42° at 1 h 24 min) or whole hours as drawn (30°)?
2. Ocean icons near the surface: the frames' #9EC3D6 is 2.39:1 over the surface water; keep, or lighten?
3. The placeholder art's licence (it is outside the GPL under its own licence file, with no licence granted
   yet).

## Progress log

- `docs/plan.md` replaced with the owner's plan (version 5), the admin address redacted as before.
- `claude/release-2` fast-forwarded to the Release 1 branch, which already held all of Release 2 (PR #3) and
  Release 1's two fixes (the ring tile, the Worker startup).
- Branches corrected at the owner's request: the Release 1 branch reset to `f19be9d` (its approved fixes,
  without Release 2) plus the test database id under `env.test` only (`4f9e9e5`; the production section keeps
  its placeholder), force-pushed with a lease; that commit merged into `claude/release-2`. Deleting the merged
  `claude/release-2-plan` and `claude/release-2.1` was refused by this session's GitHub connection; the owner
  deletes them.
- Round 2.1 follow-up: the seconds' slide never jumps when settings open (plan v5; decision 277).
- Round 2.2: the analog stopwatch (decisions 278, 279). Two intermittent test failures in the reference image
  were fixed in the tests, not the product: the 30-day removal test re-created, by opening it to read it, the
  cache the page had just removed (decision 280; 40 repeats pass where about one in ten failed), and a WebKit
  test read the CSP reports before the browser had fired them (decision 281). Checks: `npm run check` (541 unit
  tests) and the end-to-end suite in Chromium, Firefox and WebKit through the reference image (602 passed,
  10 skipped as declared).

- Owner's changes of the evening (plan version 6, changes-2): items 1 and 2 (fast motion; each mode's replay
  length and curve) built on the Release 1 branch (decisions 288, 289) with a fix to the countdown it
  exposed, checked (`npm run check`; the reference image in Chromium, Firefox and WebKit: two WebKit tests
  failed once under load and passed 24 of 24 repeated, see below), pushed, and merged into Release 2, whose
  merged state passed in all three browsers (617 passed) and was pushed. Item 4: the display-mode contract is
  documented in `docs/display-mode-contract.md` (decision 290).
- Round 2.3: ocean depth, and its results rebuilt to the new "results: ocean depth (build this one)" frame
  (items 5 to 9; decisions 291 to 297).

- Release 1 and Release 2 test hardening: the tests now wait out transitions a busy browser starts late, and
  the idle frame tests settle first (Release 1 pushed after a clean run in all three browsers: 549 passed;
  merged into Release 2).
- Round 2.4: ocean life while paused (decisions 298 to 300). Checks: `npm run check` (552 unit tests); the
  reference image in Chromium, Firefox and WebKit: 711 passed, 13 skipped as declared, 2 failed: two WebKit page
  loads that never fired their load event within 30 s (a digits replay test and a motion test, neither touching
  ocean depth), a stall not seen before in any run. Both specs then passed in WebKit four times over (156 of
  156), so it is recorded here rather than worked around.

## Questions for the owner

1. **The analog hours hand (round 2.2).** The analog frame draws the hours subdial's hand at the whole hour
   (30° at 1 h 24 min). The plan's rule that anything moving with time glides puts it at 42°, which is what
   is built (decision 278). Keep the glide, or should the hours hand point at whole hours as drawn?

2. **Ocean icons near the surface (round 2.3).** The ocean frames draw the corner icons in #9EC3D6. Over the
   water that is below the 3:1 non-text contrast for the first 5.3 m: 2.39:1 at the surface, which is also
   what shows before a session starts. The time (#DCE8EE, at least 3.58:1 as large text) and the button labels
   pass everywhere. Built as drawn; a test pins today's numbers. Keep the colour, or lighten the icons (for
   example to the time's #DCE8EE) near the surface?
3. **The licence of the placeholder art (round 2.3).** The ocean depth placeholder silhouettes now live in
   `packages/web/src/art/ocean/` with their own `LICENSE.md`, outside the GPL. It says they belong to you and
   that no licence is granted yet. Which licence should the art carry (for example all rights reserved, or a
   Creative Commons licence), and should the commissioned art use the same?

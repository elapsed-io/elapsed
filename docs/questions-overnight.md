# Overnight: Release 2, rounds 2.1 to 2.7

Working unattended on `claude/release-2` (owner, 2026-11-16 evening). The morning summary goes at the top
when the run stops; questions for the owner are collected below as they come up.

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

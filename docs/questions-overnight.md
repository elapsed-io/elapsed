# Overnight: Release 2, rounds 2.1 to 2.7

Working unattended on `claude/release-2` (owner, 2026-11-16 evening). The morning summary goes at the top
when the run stops; questions for the owner are collected below as they come up.

## Morning summary

Stopped after round 2.6: rounds 2.1 to 2.6 are done, checked in all three browsers and pushed. Round 2.7
(interstellar) is not started: its turning sky is drawn from an all-sky star catalog whose licence you asked me
to confirm, and it is not clear (question 9). The round cannot be finished without that answer, and the rules
say a round is finished whole or not started on top of an unfinished one.

**What each round built**

- **Release 1 (items 1 and 2):** plan version 6 adopted; interface motion runs 120 to 220 ms on one fast
  ease-out, the start morph 160 ms with a slight spring (CSS `linear()`); the tabulating and results timings
  are faster; each mode's replay has its own length and curve, and sessions over 2 hours replay longer
  through one shared, unit-tested function. The countdown no longer leaves its finished animation behind
  (which made a test press "end now" too early). Pushed to the Release 1 branch and merged into Release 2.
- **Item 4:** `docs/display-mode-contract.md` documents the one contract every mode uses; the contract was
  extended twice, for every mode (replays draw into a surface with a backdrop; the running context carries
  the modes' options).
- **Round 2.1, the mode platform** (pushed before tonight's changes): downloaded modes with their sizes and
  removal, the asset registry, low power, animation speed and the ring's glide; tonight's follow-up keeps
  time-based motion from jumping when settings or an overlay open.
- **Round 2.2, analog stopwatch:** as the frame, the hands gliding on the compositor.
- **Round 2.3, ocean depth:** the running mode as its frames (the water from the light model, never above the
  surface, gliding); its results rebuilt to the new "build this one" frame: the card lit by the replay's
  depth, the chart zooming out, the depth counting up, up to six landmarks on the path with popping labels
  that fade and come back on hover, focus or a tap, things rising past, two sonar pings; the tile and the
  "ocean depth options" box.
- **Round 2.4, ocean life:** while paused, the frame's fish and bubbles drift in (CSS animations only), one
  zone's catalog loaded at a time; the "ocean life" option.
- **Round 2.5, height:** the sky from its light model gliding a minute at a time, the frame's stars fading in
  from 18 km, stopping at 100 km; while paused, the altitude line, shooting stars and a rare meteor shower (CSS
  only, drawn once per pause); its results as the new "build this one" frame (the card lit by the sky, stars and
  Earth's horizon as the climb rises, things falling past, landmarks on the path); its tile. Ocean depth's
  results now share one profile chart with height, and the display-mode contract gained `replayLayout`.
- **Round 2.6, tree:** the tree as its frames draw it, side on and isometric, through a one-hour year
  (leaves growing, deepening, turning and falling, snow in winter, the isometric field's grass), its colours
  changed by opacity alone; its results growing the tree through the session's seasons from the one replay
  progress; its tile. The view option exists in settings but has no control yet (no frame draws it).

**Test results** (each round: `npm run check`, then the whole end-to-end suite in Chromium, Firefox and
WebKit through the reference image)

- Release 1 after the motion changes: 549 passed, 6 skipped (declared), 0 failed.
- Release 2 after round 2.3: 693 passed, 12 skipped, 0 failed. After round 2.4: 711 passed, 13 skipped, and two
  WebKit page loads that stalled once (see the progress log; both passed four times over when repeated). After
  round 2.5: 779 passed, 16 skipped, 0 failed. After round 2.6: 822 passed, 18 skipped, 0 failed.
- Unit tests: 528 on Release 1, 567 on Release 2.
- Along the way, intermittent failures were traced and fixed rather than retried: a test that re-created a
  cache it was checking (2.2), CSP reports read before the browser fired them, a helper fooled by a leftover
  countdown animation, transitions a busy WebKit starts a frame late, and Chromium's compositor drawing a
  held glide in its old place. Pixel allowances added tonight are each measured, recorded in a decision, and
  paired with a control that fails by far.

**Skipped and why**

- Round 2.7 (interstellar): not started, waiting on the star catalog's licence (question 9).
- The tree's view control: the setting and both views are built; the control waits for a frame (question 8).
- Nothing was deployed, merged into Release 1 beyond your items 1 and 2 (and the test fixes they needed),
  released, or changed on Cloudflare or GitHub settings.

**Questions waiting for you** (details in "Questions for the owner" below)

1. The analog hours hand: glide (built, 42° at 1 h 24 min) or whole hours as drawn (30°)?
2. Ocean icons near the surface: the frames' #9EC3D6 is 2.39:1 over the surface water; keep, or lighten?
3. The placeholder art's licence (it is outside the GPL under its own licence file, with no licence granted
   yet).
4. Height's paused frame draws a darker sky, brighter stars, another star field and another time than the
   light model gives at its altitude: built per the plan; right?
5. Height near the ground: icons below 3:1 for the first 1,937 m, paused labels below 4.5:1 for the first
   8,654 m, as drawn; keep, or lighten?
6. Height's landmarks stop at 25 km (the frame's eight): add higher ones?
7. Should height get its own options box with "results landmarks" (today the one switch covers both)?
8. The tree's view option has no frame: how should its control look?
9. The star catalog for interstellar's turning sky: which one, under which licence?
10. An intermittent WebKit page-load stall in the reference image under full load (progress log): watch it in
    CI.

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

- Round 2.5: height, and the shared profile chart (decisions 301 to 310). Two findings in the reference
  image: (1) Chromium there draws the timer's small text over the sky with subpixel
  anti-aliasing where the frame's page gets greyscale (decision 310: the sky is checked exactly apart from the
  text); (2) an intermittent WebKit page load that never fires its load event, now seen three times in about 2,200 WebKit
  page loads, only when all three browsers run together (WebKit alone: 254 of 254 passed). Not worked around:
  if it keeps appearing it needs a trace from a failing run (the WebKit-only run with traces did not reproduce
  it).

- Round 2.6: tree (decisions 311 to 318). Checks: `npm run check` (567 unit tests); the reference image in
  Chromium, Firefox and WebKit: 822 passed, 18 skipped as declared, 0 failed. Once, under local load (not in the
  reference image), the kill-switch test found a cache the service worker was still filling; it passed three
  times over on its own and in the reference run.
- Stopped before round 2.7 (question 9).

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
4. **Height's paused frame against the light model (round 2.5, decision 304).** The "height, paused" frame
   draws its sky up to 8 levels darker than the plan's light model at its 31,240 m, its stars at full strength
   (the model gives 58 % there), another random field of faint stars than the running frame's, and its blurred
   time as 01:24 (31,240 m is 03:43). Built per the plan and the running frame, with one star field. Is that
   right, or should the paused sky be darker and its stars brighter?
5. **Height's colours near the ground (round 2.5, decision 309).** Over the bright low sky, the frames' icon
   colour is below 3:1 for the first 1,937 m (2.44:1 at the ground, about the first 14 minutes), and the paused
   label colour ("paused for" and the altitude line, #B9C6DE) below 4.5:1 for the first 8,654 m (about the
   first hour). Built as drawn; keep, or lighten them near the ground?
6. **Height's landmarks above 25 km (round 2.5).** The frame's catalog has eight landmarks, the highest the
   ozone layer at 25 km, so a climb past 30 km shows none in its upper bands. Should there be more (for
   example record balloon flights, the Kármán line), and which?
7. **Results landmarks for height (round 2.5, decision 306).** The one "results landmarks" option sits in the
   ocean depth options box and now also covers height's results. Should height have its own options box with
   that switch ("up to two per 10 km on the results"), as the plan's mode options suggest?
8. **The tree's view option (round 2.6, decision 314).** The plan offers "tree view (side or isometric)" as a
   mode option, side by default, but the Release 2 display frame draws no options box for the tree. The
   setting exists (and the isometric view is built and tested); the control is not. How should it look: a
   "tree options" box under the tiles like ocean depth's, with a side / isometric choice?
9. **The star catalog for interstellar's turning sky (round 2.7).** The changes ask for the whole sky drawn from
   an all-sky catalog (stars to magnitude 5), naming the Yale Bright Star Catalog and asking me to confirm its
   licence. It is not clear: NASA's HEASARC lists its BSC5P table as a US government work
   (<https://catalog.data.gov/dataset/bright-star-catalog>), but the catalogue itself is
   "1991 (c) Hoffleit E.D., Warren Jr. W.H.", and Debian's packaging of it records that modified versions may not
   be redistributed (<https://metadata.ftp-master.debian.org/changelogs/non-free/y/yale/stable_copyright>); a
   projected, magnitude-limited sky strip is a modified version. Which would you like: the Bright Star Catalog
   (after asking its keepers), or another catalog with a clear licence (for example the HYG database under
   CC BY-SA, whose share-alike would apply to that one art file)? Round 2.7 waits for this.

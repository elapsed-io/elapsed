# Overnight: Release 2, rounds 2.1 to 2.11, and release readiness

Working unattended on `claude/release-2` (owner, 2026-11-16 evening). The morning summary goes at the top
when the run stops; questions for the owner are collected below as they come up.

## 2026-11-24: plan version 12, the recipe archive, and release readiness (stopped for your review)

`docs/plan.md` is version 12 and `docs/recipes/` is your archive of 2026-11-24 (decision 399). The site keeps
building from its own copies of the recipes until the two are reconciled, because the archive's standard
recipes predate the frames (decision 400, question 35); `npm run check` passes, and the reference run in
Chromium, Firefox and WebKit: 1,028 passed, 100 skipped, 0 failed. **`docs/release-readiness.md`**
lists, for each standard mode and shared screen, what is done, what is left against the frames and the plan,
and what blocks the release, and orders the rest; `docs/plan-release-2.md` now follows that order (rounds 2.12
to 2.19, decision 401). Nothing was built beyond the move. Questions 32 and 34 are answered by plan version 12;
35 to 39 are new.

## Round 2.11 summary: One design system (stopped for your review)

Built on `claude/release-2` from your round 2.11 message (plan version 11 in `docs/plan.md`; the round written into
`docs/plan-release-2.md` as 2.11, the layout editor renumbered 2.12 and marked held, then 2.13 picture-in-picture
and 2.14 hardening). Decisions 386 to 398; safety overview `docs/safety/round-2.11.md`.

### 1. What was built

- **One layout** for the modes that show the time on its own (digits, ocean depth, height, interstellar): the
  time's size, the 26 px gap and the buttons from the shared tokens alone, identical idle and running, measured by a
  test at three window sizes (decision 388). The figure modes keep their frames for now (question 32).
- **One layer order** in tokens, used by every mode and screen: art, then the time and buttons, then pause and
  check-in, then notices, then the corner icons, the settings panel above all; no mode stylesheet may set a z-index
  (the build fails on one); a frost under the held display so art behind a dialog is blurred, never crisp; a test
  opens check-in, pause and settings in every mode and finds nothing of the mode above them (390, 391).
- **One set of tokens:** every value a mode held of its own moved to the config modules (the list below); the build
  fails on a new hard-coded colour, size or duration in a mode (392).
- **Bug 1, the detached line:** the route, Earth and the traveller are worked out from the same value at every
  moment; a test checks both ends within 1 px through the first minutes running and across the replay (393).
- **Bug 2, stars over check-in:** fixed by the layer order and the frost (390, 391).
- **Bug 3, the results map:** rebuilt as the revised frame, the journey filling the whole card behind the headline,
  statistics and icons, a faint HYG star field behind it, kept off the route and the bodies by halos; it matches the
  frame within a pixel with the stars hidden (394).
- **Bug 4, the points' fade:** each landmark appears over about 2 s while running and a sixth of the replay on the
  results (395).
- **Bug 5, ocean depth and height:** the theme's background and colours with their contrast switch off, and their
  depth or altitude caption shown and updating throughout; a test in a dark and a light theme (396). The black
  screen itself did not reproduce here (question 33).
- **Bug 6, leave fullscreen:** defaults to never; stored settings still at the old default ("on end") read as never,
  any other choice is kept (397).
- **Your answers:** the HYG sky everywhere, still and turning, with no crossfade and the hand-entered catalog gone
  (389); the credits page, linked from the settings footer (398); "past saturn" in the corrected paused frame and
  Jupiter's bands accepted (386, 387); the layout editor held.

### 2. The places made universal

Layout:
- `core/src/modes/ocean-config.ts`, `height-config.ts`: their own time size (104 px) and gap (22 px) removed;
  `web/src/styles/tokens.ts`: ocean depth's and height's `--mode-time-size` and `--mode-gap` removed.
- Every built-in recipe (`docs/recipes/recipes/*.json`: digits, ring, timeline, ocean depth, height, the tree,
  interstellar): the time layer's own `size` removed; the tokens size the time (`modes/recipe/recipe-mode.ts` sets
  a size only for a recipe that asks for one).

Layers:
- `core/src/config.ts`: `design.layers`, generated as `--layer-*` tokens (`styles/tokens.ts`).
- `styles/main.css`: each screen one stacking context; the art, display, dialog, notice and chrome layers; the
  corner icons on the chrome layer, the pill on the notice layer.
- `modes/pieces/stops/stops.css`, `modes/pieces/light/light.css`: their own `z-index: -1` and stacking contexts
  removed (on the art layer now).
- `modes/shared/time.css`, `modes/shared/time-display.ts`: the time, the frost, the veil and the pause and check-in
  overlays placed by the layer tokens.
- `modes/recipe/recipe-mode.ts`: a mode without an environment puts its backdrop pieces in one art-layer wrapper.
- `results/results.css`: the replay's backdrop on the art layer, the card's content on the display layer.

Values (from a mode's own code to the config modules):
- The glides' 250 ms drift tolerance, in seven pieces and the camera (`tree`, `ring`, `dial`, `track`, `light`,
  `starfield`, `camera`): `CONFIG.motion.glideDriftMs`.
- Ocean life's rows, scales, speeds, stays, fade, cycle and bubbles (`pieces/particles/particles.ts`):
  `OCEAN_LIFE_CONFIG`.
- The comets' stay, head, length, distance and colour fallbacks (`pieces/particles/comets.ts`):
  `SPACE_COMETS_CONFIG.defaults`.
- The camera's 20 px edge margin, usable share and minimum (`recipe/camera.ts`, `views/space.ts`), the light's
  keyframe steps (`pieces/light/light.ts`), a dial's fallback cycle, ticks, subdial radius, hand width and length
  (`pieces/dial/dial.ts`), a path's width and head (`pieces/map/path.ts`, `views/space.ts`), a turning sky's
  6 minutes (`pieces/starfield/sky.ts`), the results' landmark caps and opening crossfade (`views/profile.ts`), the
  fallback black and the tree's shade ends (`light.ts`, `contrast.ts`, `recipe-mode.ts`, `profile.ts`,
  `pieces/tree/colours.ts`): `PIECES_CONFIG`, a new module the pieces share.
- The contrast rule's 4.5 and 3 (`recipe/contrast.ts`): `CONFIG.theme.minContrast`.
- The results map's geometry and the distance line's colour (`views/space.ts`, `views/space.css`):
  `SPACE_CONFIG.results` and its tokens.
- The frost's shape: `CONFIG.motion.frostSolidShare` (`--frost-solid`).
- Kept as they are, with the reason in decision 392: the masks' opaque black (an alpha mask), 1 px hairlines and
  visually hidden boxes, and the clock's own units (a minute in milliseconds, minutes in an hour).

### 3. Test results

- `npm run check`: typecheck, lint, 770 unit tests (1 to do), contrast (all 10 presets), build, and the size
  check: core JavaScript 40.2 KB of the 50 KB budget (39.8 before: the layer tokens, the frost and the shared
  values); interstellar 23.1 KB of code and 17.3 KB of art (17.8 before: one sky instead of two); every download
  within its ceiling.
- The end-to-end suite through the reference image in Chromium, Firefox and WebKit: **1,028 passed, 100 skipped,
  0 failed** (15.2 minutes), 57 tests more than round 2.10, the performance tests among them. The skipped are as
  before: 84 water and sky tests set aside while ocean depth and height are in testing, 16 declared (Chromium-only
  measurements, controls that hold only in the reference image).
- Before the clean run: the first reference run failed one test in Firefox, the new route test, whose measure read
  the route's matrix with `getScreenCTM`, which in Firefox leaves out a transform set from a custom property (the
  results' replay); it now reads the computed transform, the same in every browser, and the whole suite was rerun
  clean. In the local runs before it: the frost changed neighbouring pixels by 1 to 2 levels even unseen, so it is
  drawn only while held and only in modes with art behind the time; the settings frames gained the credits link and
  "never" chosen for leave fullscreen (both your rules, applied to the references as the hidden source-code link
  is); the end-to-end helper seeded settings as schema 1, which the new migration correctly read as never.
- After the clean run, the frost's check was tightened to assert it drawn exactly where a mode has art behind the
  time (and not drawn elsewhere); its spec, `e2e/design-system.spec.ts`, was rerun in the reference image's three
  browsers: 36 passed.

### 4. Skipped and why

- The figure modes' layout (ring, timeline, analog, the tree) is not changed to the shared time and gap: their
  frames place the time inside or under the figure (question 32).
- The layout editor round is held, as you asked.
- The water's and the sky's tests, and the ocean and height timer frames, stay set aside while those environments
  are not drawn (`ENVIRONMENT_IN_TESTING`).
- Nothing was deployed, merged into Release 1, released, or changed on Cloudflare or GitHub settings.

### 5. Questions waiting for you

32 to 34 (new): the figure modes and the shared layout; the black screen, which did not reproduce; the credits
page's look. 28 to 31 from round 2.10 and 13 to 22 from earlier rounds still stand (your answers to 13 to 22 are to
follow). 23 to 27 are answered.

## Earlier summary: round 2.10, Lighter and faster

Built on `claude/release-2` from your round 2.10 message (plan version 10 in `docs/plan.md`; the round written into
`docs/plan-release-2.md` and the later rounds renumbered: 2.11 the layout editor, 2.12 picture-in-picture, 2.13
hardening). The frontend looks and behaves as before apart from the four fixes. Decisions 368 to 383; safety
overview `docs/safety/round-2.10.md`; size reports before and after in `docs/size/`.

### 1. Answers

**Does the recipe system still express every mode with nothing mode-specific outside the piece library and the
recipes?** Every built-in mode (digits, ring, timeline, analog) and every test mode (ocean depth, height, the tree,
interstellar) is its recipe drawn with the shared piece library, through one mode implementation and one loading
pipeline; no mode has code of its own that the others route around. What still sits outside the recipes, and why:

1. **Each mode's descriptor** (`modes/built-in/<mode>.ts`, a few lines): where its slots' built-in art and data
   load from (ocean life by zone, height's and interstellar's landmark lists, the bodies), its colours over its
   environment for the contrast switch, and, while in testing, "no environment". They are data, kept beside the
   recipe so each catalog stays its own lazy download; an asset manifest keyed by slot could replace them.
2. **Tunings the frames fixed below the recipe's grain**, in per-mode config modules the pieces read: ocean life's
   rows and drift, the shooting stars' shapes, the comets', the orbits' and names' fades, the dial's geometry, the
   tree's colours. A recipe chooses and tunes these pieces but cannot reach every number; putting them in version 1
   would grow the schema field by field while it is still open.
3. **Results views shaped by one mode:** the profile chart knows ocean depth from height (their card layouts, lit
   art and copy), the camera scene is interstellar's, the scene replay is the tree's. The recipe picks the view by
   type; the view carries its mode's specifics.
4. **The tree piece** draws one procedural tree (as documented in round 2.7); `sprite` would give anyone's own art.
5. **Stylesheets, tokens and copy** by `data-mode` (palettes, sizes, names), and the settings tiles' small drawings.
6. **Build-time skies** (`build/sky.ts`) know interstellar's two star slots; a recipe from elsewhere cannot bring a
   catalog to project, only a ready-drawn field.

**Case 1, an IWC dial as the background with recipe-made hands and working complications:** not today. The pieces
that draw images over the screen (`sprite`, `reveal`, `image-path`) are in the schema but not built, environments
are colours (theme, light, stops) not images, and the image import fills no slot before the layout editor
(round 2.11). The dial piece draws hands as bars (length, width, tail, colour), not shaped ones, and its hands sit
in the dial's own box, not on a point of a picture. Running seconds, minutes and hours subdials work (cycles of
focused time); date, day, month and moon left with the perpetual calendar (decision 368). Needed: an image
environment or layer, hands placed in the image's coordinates, shaped hands, slots filled from the import, and the
calendar cycles back as dial options (question 30).

**Case 2, a cinematic backdrop with the F1 Rolex clock, arms removed with AI, recipe hands like analog:** not
today, for the same first three reasons: no image backdrop, no placing hands on a point of a cover-fitted picture so
they stay on the clock at every screen shape, and no user image in a slot. The analog-style hands themselves are
the dial piece's and would work. Removing the arms happens outside the site; the import would take the result.

**Size report** (gzip level 9; `docs/size/round-2.10-before.md` and `-after.md`, every module, chunk and download):

| | Before | After |
| --- | ---: | ---: |
| Core JavaScript (budget 50 KB, unchanged) | 47.78 KB | 39.79 KB |
| Core in all (budget 150 KB) | 76.85 KB | 68.85 KB |
| Largest core modules | config 5.42, app 3.83, brand 3.08, engine 2.60, session validation 2.09, recipe mode 2.03, settings schema 1.86, camera 1.42, time display 1.19, art registry 1.05 | app 4.13, engine 2.59, config 2.58, recipe mode 1.79, session validation 1.59, settings schema 1.44, brand 1.20, time display 1.02, settings 1.00, track piece 0.94 |
| Ring, timeline | downloads of 4.73 and 4.33 KB | in the core, no download |
| Analog | 7.83 KB | 4.66 KB |
| Ocean depth | 19.42 + 1.22 art | 26.65 + 1.22 art |
| Height | 18.95 + 3.35 art | 26.58 + 3.35 art |
| Tree | 5.75 + 10.11 art | 7.69 + 10.11 art |
| Interstellar | 17.67 + 17.46 art | 22.94 + 17.83 art |
| Perpetual calendar | 8.01 | removed |

Each figure is everything the mode fetches (recipe, pieces, environment, results view, art) less what the core
holds. Before, the core held every mode's numbers (the config module, 5.42 KB) and copy (the brand module, 3.08
KB), the camera and the art registry, so the modes' figures left those out; now each travels only with the modes
that use it, which is why the test modes' figures rose while the core fell by 8 KB. Each piece on its own: dial
4.19, tree 6.00 (+10.11 art), particles 6.38, starfield 3.88, circles 2.69, shape 2.43, path 2.71, landmarks 4.89;
views: strip 1.47, rings 2.25, profile 15.66, scene 7.07, camera scene 11.30; environments 1.42 and 0.35; the
camera 1.95; parts: settings 18.35, results 3.64, custom CSS editor 3.22, test modes 0.46, downloaded modes 0.92,
image store 0.93, service worker 2.40 (KB). Each has a ceiling CI enforces (decision 380).

### 2. What was built

- **Modes:** ocean depth, height and the tree are test modes with interstellar (`?test=modes`; `?test=interstellar`
  still works); chosen while the switch is off, digits shows and the choice is kept. The perpetual calendar is gone
  completely, recorded as having proved the recipe system (368, 369).
- **Debloat:** the core holds the timer, digits, ring and timeline; every piece, view, environment and the camera
  is its own download, fetched only by a mode that uses it; every mode's numbers and copy in modules of their own;
  the settings panel, results, CSS editor, test-modes store, downloaded-modes list and image store outside the
  core (370 to 372). Dead code and four unused exports removed; no dependency unused; still no framework (381).
- **Build time:** interstellar's star catalogs are projected by the build into four SVG images (the still view,
  its faint tile, the results card's sky, the whole sky's strip), which the device only places and slides (373).
  Static layers are drawn once and only moved; the outer orbit rings are no longer drawn while wholly off screen,
  which was costing every frame 200 to 300 ms of rasterising (374).
- **Fix 1 (lag, and end during it):** one cancellable loading pipeline; the next mode mounts out of sight in a
  background task and swaps in on one frame once whole; start, pause and end cancel it and apply at once; the
  session never waits on a mode (375, 376).
- **Fix 2 (quick switching):** a switched-away mode goes completely; at most one leaving environment; the tree's
  animations made in slices; the orbit fix (374, 377).
- **Fix 3 (white to blue):** ocean depth and height keep the theme's background at all times while in testing (378).
- **Fix 4 (delay leaving ocean depth):** switches start on the frame of the choice, crossfades last at most 120 ms,
  digits, ring and timeline need no download (379).
- **Internals:** the session machine knows a mode only as an id (an audit test); one mount and teardown contract
  with `ready()` (377, `docs/display-mode-contract.md`); performance tests for switching, long sessions and the
  hidden tab (382); a per-download budget check in CI (380).

### 3. Test results

- `npm run check`: typecheck, lint, 768 unit tests (1 to do), contrast (all 10 presets), build, and the size
  check: core JavaScript 39.8 KB of the 50 KB budget and of its own 42 KB ceiling; every download within its
  ceiling.
- The end-to-end suite through the reference image in Chromium, Firefox and WebKit: **971 passed, 100 skipped, 0
  failed** (14.7 minutes). Of the skipped, 84 are the water and sky tests set aside while ocean depth and height
  are in testing (28 in each browser); the other 16 are declared as before (Chromium-only measurements, controls
  that hold only in the reference image).
- Before the clean run: the first reference run failed the four interstellar running frames on text anti-aliasing
  alone (the map's names; decision 384) and the appearance frame on a reference page caught mid-paint (1 to 4
  levels at tile corners, 3 runs in 8; the site's screenshot never changed; decision 385). Both were fixed in the
  tests and the whole suite rerun clean.
- Bugs found on the way, fixed: the interstellar map redrew its outer orbits' dashes off screen every frame (200
  to 300 ms of rasterising in the test browser, the cause of fix 2's lag there); the tree made a few hundred
  animations in one task (120 to 150 ms); the generic art rule could override a mode's colours once pieces loaded
  on their own (decision 383); the end-to-end helper could press keys before the site took input when a mode had
  to download (decision 382).

### 4. Skipped and why

- The water's and the sky's tests, and the ocean and height timer frames, are set aside with their reason
  (`ENVIRONMENT_IN_TESTING`): those environments are not drawn while the two are in testing; they return with them.
- The layout editor is not in this round (it is round 2.11; question 27 still stands).
- Nothing was deployed, merged into Release 1, released, or changed on Cloudflare or GitHub settings.

### 5. Questions waiting for you

28 to 31 (new): the pieces ocean depth and height still draw over the theme; what a cancelled load leaves behind;
what the two watch cases need and when; the tree's year computed on the device. 27 (the layout editor, now round
2.11) and 13 to 26 from earlier rounds still stand.

## Earlier summary: rounds 2.8 and 2.9

Latest: changes 5 (2026-11-17). Rounds 2.8 (focus view, notices and fullscreen; the redesigned analog; ambient
idle screens; replays that never stall) and 2.9 (interstellar as a recipe, behind the test-modes switch) are
built, checked in all three browsers and pushed. The run stopped before round 2.10 (the layout editor, background
images and each mode's replaceable art): what Release 2's users would see there is not settled by the frames or
the plan (question 27).

**Round 2.9, interstellar (changes 5, item 3)**

- **Test modes:** opening the site once with `?test=interstellar` offers a "test modes" switch in advanced
  settings (the Release 2 advanced frame), off by default; on, interstellar's and the perpetual calendar's tiles
  show with the note; off while one is chosen falls back to digits. Kept on the device only; nothing else in the
  address is read.
- **The map, as the frames draw it:** the Sun fixed near the bottom left, the traveller at light speed (0.12024 AU
  a focused minute from Earth's orbit) about 85 % along the path, the camera pulling back as it goes; orbit rings
  fading below a few pixels; each landmark drawn as itself once reached (Earth, Mars, Jupiter, Saturn, Uranus,
  Neptune, Pluto, the Kuiper belt edge, the termination shock, the heliopause), fading as its orbit shrinks, Earth
  folding into the Sun's glow, names only 70 px clear of the next. It glides continuously (steps with low power),
  and blurs as one while paused with the sky sharp.
- **The sky:** the canvas's own catalog (Orion, Taurus with the Pleiades and Hyades, Gemini, Sirius, Procyon) as
  the frames draw it; while paused the whole sky turns once in 6 minutes from the HYG catalog to magnitude 5
  (CC BY-SA, derived reproducibly, licence in its own folder), crossfading from the still view.
- **Comets** while paused and on the results, about one every 5 s, at most two, tails away from the Sun.
- **Results:** the journey replayed on space from edge to edge, the camera pulling back, the distance line counting,
  the headline counting by focused time so nothing stalls; drawn as the "results: interstellar" frame as it lands.
- **Recipe:** built directly as `docs/recipes/recipes/interstellar.json`; version 1 gains one optional field (a
  starfield's still `view`), and the pieces' meanings the frames fixed are written down in `mode-recipes.md`.
- **Where the frames disagreed or could not be matched exactly:** the paused frame's line says "past jupiter"
  where its map has passed Saturn (built: "past saturn", question 25); Jupiter's bands and the results route differ
  from the frames by a few anti-aliased pixels (decisions 358, 365).

**Round 2.8, from your changes 5**

- **Question 12 answered and recorded:** recipe schema version 1 stays open until Release 2's public release, then
  freezes; the policy is at the top of the schema file and in decision 338.
- **Focus view:** while a session runs untouched for 3 s (a setting: 3 s, 10 s, never), pause and end drop and
  fade, the corner icons fade, the pointer hides, and the time grows 1.32 times and settles 25 px lower; any touch
  brings it all back as fast. Keys keep working; paused and check-in screens never hide. It waits on the engine's
  one timer, never its own.
- **Notices:** the pill, the dismiss × (kept on the device), "change" (turns the setting on, opens settings on it,
  outlined for 2 s), and the fullscreen tip on the idle screen; none of it on iPhones, which have no page
  fullscreen.
- **Settings:** the focus view group in display (hide controls, fullscreen when a session starts, leave
  fullscreen), matching the Release 2 display frame, which is now compared whole.
- **Analog, redrawn** as its new frame: case, ridged crown that dips on end, the outer track and its turned
  numbers, batons that make way for the seconds dial, the 52 px hours hand, the seconds dial with its red 60.
  Five optional recipe fields carry it.
- **Ambient idle screens** (they already drew their starting scene; now tested) and a 2-second crossfade
  whenever the environment changes.
- **Replays never stall:** the tree's replay stood still through pauses; it now advances by focused time. A test
  reads every replay frame by frame.
- **Found on the way:** the core's JavaScript had passed its 50 KB budget with the perpetual calendar (50.6 KB, a
  warning I missed). Built-in recipes are now checked when the site is built (a refused one stops the build), so
  the recipe checker no longer loads with the page: 44.6 KB (decision 350).

**Test results**

- Round 2.9: `npm run check` (768 unit tests; core JavaScript 47.8 KB of 50 KB; interstellar 17.7 KB of code and
  17.5 KB of art); the reference image in Chromium, Firefox and WebKit: 990 passed, 18 skipped as declared, 0
  failed. The first reference run failed the seven interstellar frame comparisons in Chromium on text
  anti-aliasing (decision 367) and one WebKit page that never finished loading; both passed on rerun before the
  clean run.
- Round 2.8: `npm run check` (736 unit tests; core JavaScript 44.6 KB of 50 KB); the reference image in Chromium,
  Firefox and WebKit: 936 passed, 18 skipped as declared, 0 failed (after three races the earlier reference runs
  showed were closed in the tests, decision 349).
- Earlier this release: after round 2.7, 825 passed, 18 skipped; after changes 4, 836 passed, 16 skipped; 0
  failed each time. What rounds 2.1 to 2.7 built is in the progress log below (and the earlier summaries in this
  file's history).

**Skipped and why**

- In the Release 2 display frame but a later round: picture-in-picture (2.11).
- Not built until you say: a credit line for the HYG star data on the site (question 24); the Oort cloud and
  Proxima Centauri wait for accounts (Release 4).
- Nothing was deployed, merged into Release 1, released, or changed on Cloudflare or GitHub settings.

**Questions waiting for you:** 27 first (round 2.10 waits on it); 13 to 26 below, each built one way meanwhile. From round 2.8: the crown's dip
hidden by the countdown on E, the dial red on the eight other themes, focus view in figure modes, the tap that
reveals hidden controls, fullscreen after a resume, the seconds hand when seconds never show, the outline's 2 s,
the focus frames' 13 px, "change" dismissing the tip, and the depth line behind the display settings. From round
2.9: the paused sky's crossfade to the HYG strip, where the HYG credit shows, "past jupiter" in the paused frame,
and the Oort cloud and Proxima Centauri (no action needed).

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
- Changes 3 (2026-11-16): plan version 7 adopted (the admin address redacted as before), the recipes unzipped
  into docs/recipes, the breakdown renumbered (2.7 recipes, 2.8 interstellar, 2.9 layout editor and images,
  2.10 picture-in-picture, wake lock and the check-ins switch, 2.11 hardening).
- Round 2.7: recipes (decisions 319 to 331). Every mode is now its recipe drawn by the piece library; the
  loader refuses a failing recipe and shows digits. Corrections to the recipes, where the frames win, are in
  decision 320. Checks: `npm run check` (712 unit tests, one to do in round 2.9; core JavaScript 49.0 KB of 50 KB); the
  reference image in Chromium, Firefox and WebKit: 825 passed, 18 skipped as declared, 0 failed.
- Changes 4 (2026-11-16): plan version 8; the owner's answers built (the hours hand's glide confirmed, CC0 for the
  placeholder art, ocean life's random arrivals, the contrast crossfade by stacked copies; decisions 332 to 334);
  and the perpetual calendar test mode, a test of the recipe system after a perpetual-calendar watch, which added
  four optional fields to the schema (decisions 335 to 337; question 12). Checks: `npm run check` (724 unit
  tests; core JavaScript 49.4 KB of 50 KB); the reference image in Chromium, Firefox and WebKit: 836 passed,
  16 skipped as declared, 0 failed.

- Changes 5 (2026-11-17): plan version 9 adopted (the admin address redacted as before); question 12 answered
  (decision 338); round 2.8 inserted before interstellar and the later rounds renumbered.
- Round 2.8: focus view, notices and fullscreen, the redesigned analog, ambient idle screens, replays that never
  stall (decisions 338 to 350). Found on the way: the core's JavaScript had passed its 50 KB budget with the
  perpetual calendar (50.6 KB, a warning I missed); built-in recipes are now checked when the site is built, which
  brings it to 44.6 KB (decision 350). A selector list that a CSS insertion had split (the hidden notice showing
  on every screen) was caught by the frame tests before any commit.

- Round 2.9: interstellar as a recipe behind the test-modes switch (decisions 351 to 366): the HYG catalog to
  magnitude 5 derived reproducibly under CC BY-SA with its licence in its own folder; the canvas's own still sky
  recovered from the frames; the camera's map, glides and blur; the bodies as art; comets; the journey replay;
  the test-modes switch and the Release 2 advanced frame.
- Round 2.11: one design system (decisions 386 to 398): one layout for the time modes, one layer order in tokens
  with a frost under held dialogs, every mode's own values moved to the config modules with audit rules against
  new ones; interstellar's route attached at every moment, its results map filling the card, its landmarks
  fading in, one HYG sky everywhere; ocean depth's and height's captions throughout while in testing; "leave
  fullscreen" defaulting to never (settings schema 3); the credits page.

## Questions for the owner

Answered in changes 3 (2026-11-16): 2 (by the contrast switch), 4, 5, 6, 7, 8 and 9; their answers are built in
round 2.7 (decisions 327 to 330) and 2.8. Answered in changes 4: 1 (the hours hand glides, as built), 3 (CC0 for
the placeholder art and slot templates), 10 (crossfade by stacked copies) and 11 (random arrivals now); built in
decisions 332 to 334. Answered in changes 5 (2026-11-17): 12 (version 1 stays open until Release 2's public
release; decision 338). Open: 13 to 22, from round 2.8, and 23 to 26, from round 2.9, each built one way meanwhile
and easy to change; and 27, on which round 2.10 waits.

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
10. **The contrast switch's crossfade (round 2.7, decision 327).** You asked for the time, icons and labels to
    switch from white to deep navy where the sky or the water is bright, "crossfading as it darkens". The switch
    is built: navy until 4,046 m in height and 4.3 m in ocean depth, where the frames' palette starts to meet
    the contrast rule better (weighing the time, the icons and the labels together). It switches at once, at
    the display's next redraw (once a minute while seconds are hidden), because a crossfade animates colour,
    which the plan's motion rule does not allow. Is the instant switch right, or should it crossfade (a one-off
    colour fade of about 0.2 s, an exception to the motion rule)?
11. **Ocean life's arrivals (round 2.7, decision 323).** The recipe gives ocean life random arrivals from each
    zone's catalog (every 3 to 9 s, at most 4 at once, each staying 8 to 20 s), as the plan describes; the
    "ocean depth, paused" frame draws a fixed placeholder arrangement (three schools at three distances and
    seven bubbles), which is what the site draws. Should the random arrivals replace the frame's arrangement now,
    or when the commissioned art arrives?
12. **The recipe schema after its first new mode (decision 336).** The perpetual calendar test mode needed
    calendar cycles, subdial faces and calendar parts (date, weekday, month, leap year, moon), names for a small
    dial's marks, and up to 8 subdials. I added them as optional fields, so every recipe written before stays
    valid, and kept the schema's name and version (`mode-recipe-1`). Keep them as version 1 additions, or call the
    schema version 2?
13. **The analog crown's dip on E (round 2.8, decision 344).** The crown dips the moment end is pressed, but the
    ending countdown takes the screen at once, so with E the dip happens out of sight (with the end button, part
    of it shows while the button is held down). Should the countdown wait for the 180 ms dip in analog, or leave
    it as built?
14. **The dial red on the other themes (decision 345).** The plan's reds meet 4.5:1 on the seconds dial in
    graphite (#E5574B, 4.71) and paper (#B8332A, 4.84); on the other eight presets they fall to 3.4 to 4.4. Built:
    there the red steps toward the theme's text colour until it meets 4.5:1, as the muted colour does (deep sea
    #E37E77, forest #E58273, oxblood #E76C61, plum #E76C65, lilac #A7302C, sky #AE322B, sand #AE3228, mint
    #B4332A). Keep that, or use the two reds everywhere?
15. **Focus view in modes drawn round their time (decision 341).** In ring, analog and tree the whole figure is
    the time, so the whole figure grows 1.32 times (the analog dial nearly fills a 720 × 450 window). Is that
    right, or should only the digits grow, or those modes not grow at all?
16. **A tap on hidden controls (decision 339).** While they are hidden, a first tap only brings them back, so a
    stray tap cannot pause or end by accident. Or should a tap where a hidden button was also press it?
17. **Fullscreen after a resume (decision 343).** With "leave fullscreen: on pause or end", a pause leaves
    fullscreen and resuming stays in the window ("fullscreen when a session starts" is taken literally). Should
    resuming go back to fullscreen?
18. **The analog seconds hand (decision 344).** It rests at its 60 when the seconds setting is "never" (and steps
    with low power, so it rests there too); with "blur away" it glides throughout. Right?
19. **How brief the outline is (decision 342).** After "change", the setting's row is outlined for 2 seconds
    (fading in and out). The plan says "briefly"; is 2 s right?
20. **The focus frames' 13 px (decision 341).** Both focus frames place the time 13 px lower than the running
    frame (an empty wrapper around the corner icons takes a place in the column); built as the plan says, so the
    grown time is centred. Confirm.
21. **"change" and the tip (decision 342).** Using "change" also dismisses the tip, so it does not come back if
    the setting is later turned off again. Right?
22. **The depth line behind the display settings (decision 347).** The Release 2 display frame shows "84 m ·
    sunlight zone" under the running ocean behind the panel; the ocean frames show that line only while paused,
    which is what is built.
23. **The paused sky's turn (decision 353).** The running sky is the canvas's own 32-star catalog (as the plan says
    and the frames draw it); the turning sky is the HYG strip, with many more stars and an equirectangular drawing
    that departs from the still view by up to about 10 px toward the edges. Built: as a pause starts, the strip
    starts turning from the still view's centre and the two crossfade over 2 s. Alternatives: turn the canvas
    catalog alone (no HYG at all), or show HYG's stars on the running screen too (then the frames' sky changes).
    **Answered (owner, round 2.11):** no crossfade; the HYG sky everywhere, still and turning, and the hand-entered
    catalog removed. Built (decision 389).

24. **Where the HYG credit shows (decision 353).** The derived star data carries its credit and licence inside the
    file and in its folder's `LICENSE.md`; the site itself shows no credit yet. CC BY-SA asks for reasonable
    attribution where the work is used: a line in the about or legal page ("star positions from the HYG database,
    CC BY-SA 4.0"), or under interstellar's tile? Not built until you say where.
    **Answered (owner, round 2.11):** a small credits page linked from the settings footer, listing every
    third-party work and its licence. Built (decision 398).

25. **"past jupiter" in the paused frame (decision 351).** The paused frame's line reads "10.1 au travelled · past
    jupiter" while its own map, at 11.1 AU from the Sun, has passed Saturn (and labels it); the results frame works
    its line out ("past" the last landmark reached). Built as the results frame: "past saturn" there. Confirm.
    **Answered (owner, round 2.11):** "past saturn" is right; the paused frame is corrected (decision 386).

26. **The Oort cloud and Proxima Centauri.** The plan keeps them for accounts' accumulated distance (Release 4);
    a guest's 16-hour session reaches about 116 AU, just short of the heliopause at 120. Nothing is drawn for
    them yet. (No action needed unless you want a hint of what lies beyond.)
    **Answered (owner, round 2.11):** noted.

27. **Round 2.11 (the layout editor, numbered 2.10 until you inserted "Lighter and faster") needs frames or answers
    before it starts.** The canvas has one frame for
    it, "layout editor: imported background, rotated timer, buttons moved" (in "later releases": the free-form
    editor's toolbar, its dashed selection with corner handles, the rotate handle and its angle tag), which round
    2.11 builds but keeps switched off until Release 3. Nothing settles what Release 2's users actually see:
    (a) the preset positions everyone uses until the unlock: which presets each layer has (the time, the buttons,
    the corner icons), and how they are chosen (in settings, or in the editor with snapping); (b) how customize
    mode is entered: a settings row (which category), the long press on phones and what shows while pressing;
    (c) hiding and reordering layers: a layer list, or per-layer controls in the toolbar; (d) background images:
    where the import lives (the editor's "background" button, the display settings, or both), how a picked image
    is placed and cropped, and how it is removed; (e) each mode's replaceable art: where its slots are listed, the
    template download, and what a refused file says. Which of these should I build from the plan's words alone,
    and which wait for frames?
    **Answered (owner, round 2.11):** held; the owner adds frames for Release 2's customize mode to the canvas first.
    The round is 2.12 and marked held in `docs/plan-release-2.md`.

28. **Ocean depth's and height's pieces over the theme while they are in testing (round 2.10, decision 378).** They
    now keep the theme's background at all times, with no environment colours, as you asked. Their pieces still
    draw over it in their own colours: ocean life while paused (navy and blue fish and bubbles), the depth and
    altitude lines while paused, height's stars from 18 km and its shooting stars, and the landmarks on the
    results. On a light theme the white stars and the navy fish are faint or lost. Built: kept as they were. Should
    the pieces go too while the two are in testing, or take the theme's colours?
29. **What "cancels" leaves behind (decision 376).** Start, pause and end cancel a mode still loading; the control
    applies at once and the screen keeps the mode it had. Built: the chosen mode then loads again, in a background
    task right after a pause or start, and when the timer shows again after an end, so what you picked still
    arrives. The other reading would leave the old mode showing until you pick again. Confirm.
30. **The two watch cases from your section 1 (round 2.10 summary).** Neither can be made with recipes today. Both
    need a background image drawn by the piece library (an image environment, cover-fitted, or an image layer),
    hands placed in that image's own coordinates so they stay on the printed dial at every screen shape, and the
    user's own image in a slot (the image import reaches slots only with the layout editor, round 2.11). The IWC
    case also needs shaped hands (the dial piece draws bars) and its complications: running seconds, minutes and
    hours work today, but the date, day, month and moon left with the perpetual calendar (in git history, decision
    368). Should these join round 2.11, or a round of their own, and should the calendar complications come back as
    dial options?
31. **The tree's year stays computed on the device (decision 374).** You asked for heavy preparation at build time;
    the tree's few hundred season animations are sampled from its model when it mounts, now in slices of 40 a task
    so none holds the main thread past 50 ms. Precomputed by the build they would be a large file to save a few
    milliseconds a slice. Built: kept on the device. Confirm, or move them to the build.
32. **The figure modes and the shared layout (round 2.11, decision 388).** You asked for the time, the 26 px gap
    and the buttons in exactly the same place and size in every mode. In digits, ocean depth, height and
    interstellar they now are (one set of tokens, a test measures them). Ring, timeline, analog and the tree draw
    the time inside or under their figure at their frames' sizes (52, 56, 52 and 30 px, with their own gaps, the
    buttons below the figure), so one place for the time would change those frames. Built: their layouts kept
    from their frames; their buttons are the shared buttons, the same size in every mode. Should the figure modes
    also take the shared time and gap (and the figures fit around them), or keep their frames?
    **Answered (plan version 12, 2026-11-24):** every mode's main block sits in the same centered slot with its
    buttons 26 px below it, with a 260 px dial for ring and analog and a 48 px time inside ring and timeline.
    Round 2.13 builds it.

33. **Ocean depth's and height's "black screen" (round 2.11, bug 5; decision 396).** I could not reproduce it: in
    Chromium, Firefox and WebKit, stored or chosen in settings, both showed the theme's background and a running
    time. What I found and changed: they had no sign of their measure while running (ocean depth no caption at all,
    height's only while paused), and their contrast switch was still on (it never fired in my runs, but it would
    turn the time the water's or sky's dark colour on the theme). Now the caption shows throughout and the switch
    is off, with a test in a dark and a light theme. If you still see it, which browser and device, and was it
    right after choosing the mode, after a reload, or on returning to the tab?
34. **The credits page's look (decision 398).** It has no frame: built plain, in the default theme's colours and
    the site's typeface, one column, each work with what it is used for, by whom, its licence (linked) and the
    changes made, and a link back to the timer; it lists the twelve font choices too, as they are third-party
    works the site serves. Keep it so, or should it follow a frame (or the theme the person chose)?
    **Answered (plan version 12):** it follows the person's chosen theme and the site's typeface, laid out like
    the privacy and terms pages. Round 2.14 builds it.
35. **The recipe archive against the frames (round 2.13; decision 400).** The archive of 2026-11-24 was written
    from an earlier copy of the recipes. For the standard modes it undoes the analog redesign (no batons, hand
    tail or the redesign's subdial fields) and gives ring and timeline a 52 and 56 px time, where the frames and
    plan version 12 say 48; for the proofs of concept it carries ocean depth's calm water and height's falcon,
    which the site does not draw yet, and keeps interstellar's results angle at −17° where the revised results
    frame draws −15°. Proposed: the frames and the plan win for the standard modes, the archive's
    additions come in with the rounds that draw them, and the reconciled recipes go back into the archive so
    `recipe-check.py` writes them. Confirm, or say which wins where.
36. **Seconds "always" for people who never changed it (round 2.14).** The default moves from "blur away" to
    "always show". As with "leave fullscreen" (decision 397), a stored record still at the old default could
    read as the new one, while any other choice is kept. Proposed: the same rule. Or keep stored records as
    they are?
37. **The seconds tip's timing (round 2.14).** It is drawn on the idle screen, above the time, with "change"
    and dismiss; the plan says it shows once and only one notice shows at a time. The fullscreen tip also shows
    on the idle screen until dismissed. Proposed: the seconds tip first, on the first idle screen; the
    fullscreen tip on a later visit once the seconds tip is gone. "change" sets seconds to "blur away" and opens
    settings on it, highlighted. Or another order or moment (for instance after the first session)?
38. **What the standard modes' release contains, and whether it is the public launch.** Your in-scope list
    names the standard modes and the shared screens. The plan's Release 2 also lists the layout editor (held),
    picture-in-picture, the screen wake lock and the check-ins switch, and the Release 2 settings frames draw
    the last three. Proposed: round 2.15 builds those three before the release review if you keep them in;
    the layout editor and the proofs of concept come after the release. If this release is also the public
    launch, Release 1's launch list applies (privacy and terms served by the app, the header check against
    elapsed.io, secret scanning, the HSTS preload). Which do you want?
39. **The Release 2 display frame's "leave fullscreen".** It still shows "on end" chosen, while the plan and
    your round 2.11 answer make never the default; the tests apply your rule to the frame. Redraw the frame
    with never chosen, or leave it?

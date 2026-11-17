# Overnight: Release 2, rounds 2.1 to 2.9

Working unattended on `claude/release-2` (owner, 2026-11-16 evening). The morning summary goes at the top
when the run stops; questions for the owner are collected below as they come up.

## Morning summary

Latest: changes 5 (2026-11-17). Rounds 2.8 (focus view, notices and fullscreen; the redesigned analog; ambient
idle screens; replays that never stall) and 2.9 (interstellar as a recipe, behind the test-modes switch) are
built, checked in all three browsers and pushed. Next is round 2.10, the layout editor and each mode's replaceable
art.

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

**Questions waiting for you:** 13 to 26 below, each built one way meanwhile. From round 2.8: the crown's dip
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

## Questions for the owner

Answered in changes 3 (2026-11-16): 2 (by the contrast switch), 4, 5, 6, 7, 8 and 9; their answers are built in
round 2.7 (decisions 327 to 330) and 2.8. Answered in changes 4: 1 (the hours hand glides, as built), 3 (CC0 for
the placeholder art and slot templates), 10 (crossfade by stacked copies) and 11 (random arrivals now); built in
decisions 332 to 334. Answered in changes 5 (2026-11-17): 12 (version 1 stays open until Release 2's public
release; decision 338). Open: 13 to 22, from round 2.8, and 23 to 26, from round 2.9; each is built one way
meanwhile and is easy to change.

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
24. **Where the HYG credit shows (decision 353).** The derived star data carries its credit and licence inside the
    file and in its folder's `LICENSE.md`; the site itself shows no credit yet. CC BY-SA asks for reasonable
    attribution where the work is used: a line in the about or legal page ("star positions from the HYG database,
    CC BY-SA 4.0"), or under interstellar's tile? Not built until you say where.
25. **"past jupiter" in the paused frame (decision 351).** The paused frame's line reads "10.1 au travelled · past
    jupiter" while its own map, at 11.1 AU from the Sun, has passed Saturn (and labels it); the results frame works
    its line out ("past" the last landmark reached). Built as the results frame: "past saturn" there. Confirm.
26. **The Oort cloud and Proxima Centauri.** The plan keeps them for accounts' accumulated distance (Release 4);
    a guest's 16-hour session reaches about 116 AU, just short of the heliopause at 120. Nothing is drawn for
    them yet. (No action needed unless you want a hint of what lies beyond.)

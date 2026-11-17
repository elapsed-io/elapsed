# Release 2: Display modes and layout, in rounds

Approved by the owner on 2026-11-16 with the changes and answers below (decisions 256 to 266). Source:
`docs/plan.md` (Release roadmap > Release 2, Product summary, Architecture invariants, Loading and
performance, Settings catalog, Design system > Frame index and Display modes, Custom CSS safety,
Privacy) and the design canvas, including its four Release 2 settings frames. The plan stays the source
of truth: where this breakdown and the plan disagree, the plan wins and the breakdown is corrected.

Release 2 is built on its own branch, `claude/release-2`, from the fixed Release 1; its pull requests
target that branch, never Release 1's. During Release 1's private test run, fixes for what testers find
go to the Release 1 branch first and take priority; Release 2 picks them up by merging Release 1 in.

## Scope

From the plan, and nothing more:

- **Modes:** analog stopwatch, ocean depth, height and tree, each lazy-loaded with its results replay;
  interstellar distance behind a test flag.
- **Ambient detail:** ocean depth and height backgrounds from their light models, rates from the config
  module, results with random landmarks (at most two per depth or height band), stars near space;
  interstellar's logarithmic solar-system map and real star catalog, light-speed travel per session for
  guests; ocean life from a depth-zone catalog in the asset registry, brought in on pause at several
  distances (placeholder art); the tree's side and isometric views, chosen in settings.
- **Layout editor:** move, rotate, stretch, resize, hide and reorder every layer; import a background
  image, one per display mode; layouts saved per display mode and screen size; reset to default. The
  free-form editor is built in full but switched on only when the unlock arrives in Release 3; until
  then everyone places layers in preset positions, and the test-modes switch turns free-form editing on
  for testing.
- **Device and session features:** a floating picture-in-picture timer (a display setting, off by
  default, only where the browser offers a window for a page), a screen wake lock while the site is the
  active tab (on by default), the switch to turn check-ins off (with its warning), the low power and
  animation speed settings, downloaded-mode management, and automatic removal of modes unused for 30
  days.
- **Motion:** anything that moves with time glides continuously through a linear CSS animation, and
  steps once a minute only with reduced motion or low power: the timeline (Release 1), the ring's head
  (moved here from Release 1's test run, decision 255) and the analog hand.
- **Privacy:** no new data leaves the device; imported images and fonts stay on it, never uploaded or
  synced.
- **Art:** the tree as drawn in the canvas, and the canvas's placeholder fish for ocean life, both through
  the asset registry; final art is commissioned later and drops in without code changes. Art files carry
  their own licence file, separate from the GPL code.

## Order

The platform comes first, because every new mode depends on being downloaded, cached and removed. The
analog stopwatch comes next: it has no art and reuses the ring replay, so it proves the platform with the
fewest moving parts. Ocean depth comes before height, which reuses its light-model background and its
profile-chart replay; ocean life follows ocean depth. The tree and interstellar are independent and the
most art-heavy. The layout editor comes after every mode exists, so it is built against all of their
bounds. The small device features come last before hardening, since nothing else depends on them.

| Round | Builds | Frames |
| --- | --- | --- |
| 2.1 | Mode platform, low power, animation speed, the ring's glide | Release 2 settings: display (downloaded modes) and appearance; ring frames |
| 2.2 | Analog stopwatch and its replay | Analog stopwatch; Results: analog and ring; its mode tile |
| 2.3 | Ocean depth and the profile-chart replay | Ocean depth: running, 0 to 20 m; Results: ocean depth; its tile and "results landmarks" |
| 2.4 | Ocean life | Ocean depth: paused; "ocean life" |
| 2.5 | Height | Height; Results: height; its tile |
| 2.6 | Tree | Tree: side and isometric; Results: tree; its tile |
| 2.7 | Recipes: every mode as a recipe drawn by one piece library | every mode frame again, unchanged; the options boxes |
| 2.8 | Focus view, notices and fullscreen; the redesigned analog; ambient idle screens; replays that never stall | Running, recently touched; running, untouched; the motion, on a loop; the notice; "change" opens settings on it; Release 2 settings: display (focus view, the mode behind the panel); analog stopwatch (redesigned) |
| 2.9 | Interstellar, as a recipe, behind the test-modes switch | Interstellar: running, paused and results; its tile; Release 2 settings: advanced (test modes) |
| 2.10 | Layout editor, background images, and each mode's replaceable art | Layout editor |
| 2.11 | Picture-in-picture, wake lock, the check-ins switch | Release 2 settings: timer (check-ins, keep screen awake) and display (picture-in-picture) |
| 2.12 | Hardening and the release review | every Release 2 frame |

Every round ends as Release 1's did: `npm run check`, the end-to-end suite in Chromium, Firefox and WebKit
(through the reference image), the round's safety overview in `docs/safety/round-2.<n>.md` with every item
answered, decisions recorded, a pull request into `claude/release-2`, and a stop for the owner's review.
Every new screen matches its frame in the design canvas; where it cannot, the round stops and asks.

### The Release 2 settings frames

The canvas draws four Release 2 settings frames. Each control is built from them in the round that adds
it, and each frame is checked pixel for pixel once all of its controls exist:

| Frame | Controls | Round |
| --- | --- | --- |
| timer | check-ins switch with its warning; keep screen awake ("only while elapsed is the active tab") | 2.11 |
| display | mode tiles in four columns with a preview icon for each new mode (analog, ocean depth, height, tree, interstellar); ocean depth options (ocean life, results landmarks); picture-in-picture; downloaded modes with size and remove | tiles in each mode's round; downloaded modes 2.1; results landmarks 2.3; ocean life 2.4; each mode's own options box 2.7; picture-in-picture 2.11 |
| appearance | animation speed (slower, normal, faster: "every animation, including the results replay"); low power ("stops ambient animation and shows only the time. on when your system asks for reduced motion.") | 2.1 |
| advanced | test modes ("early modes that may change or disappear. shown after opening elapsed with ?test=interstellar.") | 2.9 |

The tile grid has three columns while there are three modes (the Release 1 frame) and four from round 2.2,
when the fourth mode arrives (the Release 2 frame).

## Rounds

### 2.1 Mode platform, low power, animation speed, the ring's glide

**Builds:**

- The asset registry at runtime: art referenced by key, with placeholder defaults, inline SVG whose
  colours are CSS custom properties; catalogs load only with their mode.
- Mode packages declare their art and its size; the size check enforces each mode's 30 KB of code and
  150 KB of art.
- Downloaded modes: a mode is fetched only when picked, cached for offline use, and listed in settings
  ("downloaded modes", as the Release 2 display frame draws it) with its size and a remove button. A mode
  unused for 30 days is removed automatically: its last use is kept with the cached files, and the check
  runs when the page loads, never on a timer. Digits is part of the core and always offline; every other
  mode, ring and timeline included, is a downloaded mode (plan, Loading and performance: "On choice").
- Low power (appearance, off by default; also on under the system's reduced-motion preference): freezes
  ambient animation and shows only the time; time-based motion (the timeline, the ring, the analog hand)
  steps once a minute. The app may suggest it where the browser reports a low, discharging battery.
- Animation speed (appearance: slower, normal, faster): sets the one multiplier, `--motion-scale`, that
  already scales every interface duration and the results replays (decision 215).
- The ring's head glides: the rotor turns through a linear CSS rotation on its own layer, anchored by
  script once a minute (as the timeline glides, decision 242), and steps once a minute with reduced motion
  or low power. The tail turns with the head; over the first 9 minutes it also grows in behind it, which
  no transform can draw (its length is a gradient) and no timer may (one scheduler, no wakes in a hidden
  tab), so its length grows once a minute, as the frames draw it (decision 267). The ring frames are
  re-checked with the glide frozen at each frame's moment.
- The settings schema, migrations (schema 2), and the Release 2 appearance frame and the display frame's
  downloaded-modes list for these controls.

**Tests:** unit tests for the registry, the cache's last-use records and the 30-day rule (fake clock);
end-to-end: a mode downloads only when picked, works offline afterwards, is listed with its size, is
removed by hand and after 30 days, and its removal leaves the stored layout and settings alone; animation
speed scales the morph and the replay; low power stops every ambient animation and makes the ring and
timeline step; reduced motion turns low power on; the ring glides between minutes and its frames match
when frozen; settings migrations from schema 1.

**Safety overview:** data (a last-use time per downloaded mode, on the device), inputs (none new beyond
settings), storage keys and cache names, the service worker's new routes, abuse cases (a flood of mode
downloads, a cache filling the device's quota), tests.

### 2.2 Analog stopwatch

**Builds:** the analog stopwatch through the display-mode contract (one revolution per hour, labels every
5 minutes, an hours subdial, the hand in the accent colour). The hand glides continuously through a linear
CSS rotation anchored once a minute, like the ring's head, and steps once a minute only with reduced motion
or low power. Its replay is the ring replay's one ring per hour, with the hand. Paused and check-in
states as for every mode. Its tile, with the preview icon the Release 2 display frame draws, and the
grid's fourth column.

**Tests:** the analog frame and the analog results frame, pixel for pixel in the reference environment
with the glide frozen at the frame's moment; the hand glides between minutes and steps with reduced
motion and low power; the replay's rings revealed exactly behind the hand; size budget.

**Safety overview:** none new beyond its package; abuse cases: none.

### 2.3 Ocean depth

**Builds:** 15 m per focused minute, stopping at 10,935 m; the background from the plan's light model as
a gradient around the current depth, text in its colour; colours and rates from the config module; the
profile-chart replay with zone bands and at most two random landmarks per 1,000 m band; its tile and the
"ocean depth options" group with "results landmarks" ("up to two per 1,000 m on the results"), as the
Release 2 display frame draws them.

**Tests:** the light model's colours at chosen depths (unit tests against the plan's formula); the ocean
frames at 0 to 20 m and running; the results frame; landmarks never more than two per band and only from
the catalog; stopping at the deepest point; contrast of the text over the background at every depth.

**Safety overview:** the landmark catalog (static data in the package); no new data; contrast.

### 2.4 Ocean life

**Builds:** a small catalog per depth zone in the asset registry, starting with the canvas's placeholder
fish ("ocean depth, paused" frame), one zone loaded at a time; on pause, schools and individuals accurate
to the depth come in at several distances and leave when the timer resumes; the "ocean life" option ("sea
life drifts in while you're paused"), as the Release 2 display frame draws it. The art lives in its own
folder with its own licence file, apart from the GPL code, so the commissioned art replaces it file for
file.

**Tests:** only the current zone's catalog loads; creatures match the zone; they arrive on pause and leave
on resume; nothing animates per frame (the plan audit); the paused ocean frame; low power and reduced
motion.

**Safety overview:** art licences recorded for every asset, in the art's own licence file; catalog sizes
against the art budget.

### 2.5 Height

**Builds:** 140 m per focused minute, stopping at 100 km; the sky's light model as a gradient across
±1,500 m; stars fading in between 18 and 42 km; the profile-chart replay (shared with ocean depth) with
landmarks per 10 km band; its tile.

**Tests:** the sky's colours (unit tests), the height frame, the results frame, the stopping point, star
visibility by altitude, text contrast over the sky.

**Safety overview:** none new beyond its package.

### 2.6 Tree

**Builds:** one year per focused hour, 15 minutes per season, leaves and snow as the plan describes, each
cluster offset by up to a quarter season; side and isometric views (a mode option); the replay growing the
tree to full size at 60 focused minutes through its seasons; the tree built as the canvas draws it, through
the registry, its art in its own folder with its own licence file; its tile.

**Tests:** season and leaf colours at chosen minutes (unit tests); the side and isometric frames; the
results frame; motion only through slow CSS transitions; low power.

**Safety overview:** art licences; art budget.

### 2.7 Recipes

Owner, changes 3 (2026-11-16): every display mode, built-in included, becomes a recipe, a JSON file choosing
and tuning pieces from a fixed library that the site's code draws (docs/recipes/mode-recipes.md). Recipes
contain no code, formulas, markup or addresses; this is what lets users copy a mode and change it safely,
and later share modes.

**Builds:**

1. The schema in the repository (`docs/recipes/mode-recipe-1.schema.json`) and a runtime loader that
   validates every recipe on load and refuses one that fails, falling back to digits.
2. The piece library in `core` and `web`, each piece implementing the display-mode contract and drawing
   only with the plan's motion rules (CSS animations, transforms and opacity, one replay progress value,
   nothing per frame), with reduced motion and low power applied to every piece automatically and the
   contrast rule enforced at run time.
3. Digits, ring, timeline, analog, ocean depth, height and tree converted to recipes, replacing their
   mode-specific code; each still matches its frames exactly. Where a recipe in docs/recipes/recipes
   differs from what is built, the plan and frames win: the recipe is corrected and the correction recorded.
4. Slots through the asset registry: every image or catalog a mode uses is a named slot with a built-in
   default.
5. From the owner's answers: where the sky or the water is bright, the time, icons and labels switch from
   white to deep navy, whichever meets the contrast rule, crossfading as it darkens; height's landmarks
   continue to the Kármán line; every mode has its own options box (height its own landmarks switch, the
   tree its view as a segmented control).

**Tests:** the ported checker (every built-in recipe valid, every reference and slot resolved, the 49
features); its negative safety cases (script in a name, unknown placeholders, `url()` colours, outside slot
defaults, event-handler fields, unknown piece types, formulas, too many layers, particle floods, path
traversal, oversized images, over-long replays) all rejected; a failing recipe falls back to digits; every
built-in recipe within its mode's budgets; every mode's frames still exact.

**Safety overview:** recipes as an input: what the schema refuses, the runtime limits, and what happens with
a failing recipe.

**Records:** built-in recipes keep their fixed rates and comparable records; anything user-made is
"mode-only", its depth, height or distance records labelled with that mode and never counted for
competitions.

### 2.8 Focus view, notices and fullscreen

Owner, changes 5 (2026-11-17), inserted before interstellar. Frames: "running, recently touched", "running,
untouched", "the motion, on a loop", the notice, "change opens settings on it", the Release 2 display settings
frame and the redesigned analog stopwatch.

**Builds:**

1. **Focus view.** While a session runs and nobody has touched the page for 3 seconds, pause and end drop 10 px
   while fading out over 180 ms, the corner icons fade with them, the pointer hides, and the time grows to 1.32
   times its size and settles 25 px lower over 220 ms, so it stays centered. Any mouse move, click, tap or key
   reverses it exactly and just as fast; the controls stay until the next 3 quiet seconds. A key that is also a
   shortcut still does its job. Paused and check-in screens never hide their controls. Only transforms and
   opacity animate.
2. **Notices.** One reusable pill, 20 px tall with 11 px text, shown just above the time without moving it, with
   a dismiss ×; a dismissed notice stays dismissed. A notice that points to a setting uses one universal link,
   "change", which turns that setting on at once and opens settings on it, briefly outlined in the accent color.
   The first notice is the fullscreen tip on the idle screen: "fullscreen hides your other tabs".
3. **Settings,** a "focus view" group in display: hide controls while focusing (after 3 s, after 10 s, never;
   default after 3 s); fullscreen when a session starts (default off); leave fullscreen (never, on pause or end,
   on end; default on end). Esc always leaves fullscreen. On iPhones, which have no page fullscreen, the notice
   and both fullscreen settings are hidden.
4. **Ambient idle screens** (a tester's report): ocean depth, height and interstellar show their starting scene
   and colors on the idle screen, so starting changes nothing abruptly, and any change of environment crossfades
   over about 2 seconds.
5. **The settings panel** shows whatever display mode is chosen behind it (the Release 2 display frame shows ocean
   depth there).
6. **Analog, redesigned** (a retrofit of round 2.2, exactly as its frame): a polished case with a ridged crown
   that dips whenever end is pressed (by button or E); an outer track of sixty ticks with 5 to 60 every five,
   each turned to follow the edge; slim batons at every five minutes except 30, those at 25 and 35 stopping short
   of the seconds dial; the minute hand and a shorter, slightly thicker hours hand (52 px, 4.4 px wide), both in
   the accent colour; a seconds subdial of about 0.3 of the dial's radius halfway between the centre and the
   bottom edge, with sixty ticks and 10 to 60, its 60 in a red that meets 4.5:1 (#E5574B on dark themes, #B8332A
   on light), no inner rings; every hand gliding.
7. **Results replays never stall** (every results screen): replays that draw distance (interstellar) advance by
   focused time only; replays that draw time (the focus strip, profile charts, rings) sweep evenly through the
   whole session, drawing pauses as blanks. A test checks that the replay's drawn extent never decreases and
   never stalls for more than one frame.

**Records:** decisions 338 to 350 in `docs/decisions.md` (recipe schema version 1 stays open until Release 2's
public release, decision 338; built-in recipes checked when the site is built, decision 350); the safety overview
in `docs/safety/round-2.8.md`.

### 2.9 Interstellar, as a recipe, behind the test-modes switch

**Builds:** interstellar directly as a recipe (docs/recipes/recipes/interstellar.json) on the piece library:
light-speed travel per session from Earth's orbit; the true-scale camera (the Sun near the bottom-left, the
traveller heading −28° on the timer and −17° on results, pixels per AU = usable path ÷ max(distance, 1.6)),
rings for the planets' orbits and, dashed, the Kuiper belt edge and the heliopause, fading below about 6 px;
landmark dots on the travel line; while paused, the map and time blurred with the star field sharp, the
distance line, random comets with tails pointing away from the Sun, and the sky turning once in about 6
minutes from a strip drawn once from the HYG database (stars to magnitude 5, under CC BY-SA, credited, its
derived data in its own folder with its licence file); the journey replay pulling the camera back; its tile.
No Oort cloud or Proxima Centauri until Release 4. One build for everyone: opening the site once with
(The perpetual calendar, a test mode made in changes 4 as a test of the recipe system, joins interstellar behind
this switch; until it exists, `?test=calendar` shows its tile.) `?test=interstellar` shows a "test modes" switch in advanced settings (the Release 2 advanced frame), off by
default; switching it on adds interstellar to the mode tiles ("interstellar appears only while test modes
are on."). The switch, once shown, stays shown on that device; turning it off while interstellar is chosen
falls back to digits.

**Tests:** distance after a given focused time; the camera's scale and the rings' fading (unit tests); every
dot on the line within 1 px; the comets' tails away from the Sun; the running, paused and results frames;
the advanced frame; the switch hidden until the address asks for it, off by default, and interstellar hidden
unless it is on.

**Safety overview:** the star catalog's source and licence (HYG, CC BY-SA); what the address parameter can do
(show one switch, nothing else; any other `test` value is ignored).

### 2.10 Layout editor, background images, and each mode's replaceable art

**Builds:** the customize mode, entered from settings or with a long press on phones; every layer
(background, display mode, buttons, icons) moved, rotated, stretched, resized, hidden and reordered as
data; layouts saved per display mode and per screen size (desktop and phone, the phone default designed
for the phone), versioned, with reset to default; "time size" and the editor change the same value; each
mode reports its rendered bounds (for Release 4's no-widget zones). The free-form editor is built in full
and tested, but switched on only when the unlock arrives in Release 3; until then everyone places layers in
preset positions, and the test-modes switch (round 2.9) turns free-form editing on for testing. Background
images, one per display mode, imported from the device: JPEG, PNG, WebP or AVIF, detected from their
contents (never the file name), at most 20 MB and 50 megapixels, re-encoded at the screen's size (which
strips location and camera metadata), SVG refused, kept in the `MediaStore` on the device, never uploaded or
synced (and left out of the settings file); safe mode turns layouts and backgrounds off. The user-facing part
of slots: each mode's options box lists its replaceable images, each with "replace", "reset to default" and
"download template", through the same local image import; the tree's "your art" choice uses its four-frame
season strip slot. No recipe editor yet (a later release).

**Tests:** layout data round-trips, migrations and reset; preset positions for everyone, free-form only
behind the test-modes switch; the editor's moves by pointer, touch and keyboard; layouts and backgrounds
per mode and screen size; the layout editor frame; crafted images (wrong extension, over 20 MB, over 50
megapixels, SVG, metadata-laden, truncated) are refused or cleaned (the image corpus the plan's defence 12
asks for); nothing about an image leaves the device; safe mode; custom CSS still scoped; accessibility of
the editor.

**Safety overview:** data (layouts and images on the device, image metadata removed), inputs (image
files), storage keys, abuse cases (decompression bombs, malformed images, layouts that hide every control
with safe mode as the way back), tests.

### 2.11 Picture-in-picture, wake lock, the check-ins switch

**Builds:**

- Picture-in-picture: a display setting, off by default, as the Release 2 display frame draws it ("adds a
  button to the timer that opens a small floating timer. shown only in browsers that offer it."). When on,
  a picture-in-picture button joins the timer's top-right icons, left of settings: Tabler's
  picture-in-picture icon, at the same size and colour as the other corner icons. It opens the floating
  timer, with the same time and buttons. The setting and the button appear only where the browser offers
  a window for a page (the Document Picture-in-Picture API), and are hidden elsewhere.
- Keep screen awake (timer, on by default: "only while elapsed is the active tab"): a screen wake lock
  while the page is visible, released when hidden and requested again when seen. The Permissions-Policy is
  confirmed not to block it: the header lists only `camera`, `microphone` and `geolocation`, so
  `screen-wake-lock` keeps its default of the site's own pages; a test fails if the header ever disables it.
- The check-ins switch (timer, on by default) with the plan's warning ("sessions without check-ins count
  towards your history, but won't count towards competitions"); nothing is marked on the session yet (the
  plan adds that marking in Release 6).
- The Release 2 timer frame, and the display frame now that every control in it exists.

**Tests:** the picture-in-picture setting and button exist only where the browser offers the window; the
window shows the same time and buttons and closes cleanly; the wake lock is requested only while visible,
released when hidden, and allowed by the deployed Permissions-Policy; with check-ins off no check-in falls
due and the pause limit still applies; the timer and display frames; settings migrations.

**Safety overview:** permissions used (none new in the Permissions-Policy; `screen-wake-lock` is allowed by
default for the site's own pages), data (the switches are settings on the device), abuse cases.

### 2.12 Hardening and the release review

**Builds:** the accessibility pass for every new mode and the editor (WCAG 2.2 AA, axe-core, keyboard and
screen readers, 44 px targets, reduced motion and low power), the performance pass (budgets, a long
session in each ambient mode, the slow-phone checklist), the cross-browser pass, the device checks
extended for the new features, and the release review (`docs/safety/release-2.md`), then the owner's
sign-off.

## The owner's answers

1. **Free-form layout before payments exist:** the free-form editor is built in full in round 2.10 but
   switched on only when the unlock arrives in Release 3; until then everyone gets preset positions. It is
   testable behind the test-modes switch.
2. **The interstellar test flag:** opening the site once with `?test=interstellar` shows a "test modes"
   switch in advanced settings, off by default, which adds interstellar to the mode tiles. One build for
   everyone.
3. **Picture-in-picture:** a display setting, off by default, as drawn. When on, it adds a button to the
   timer's top-right icons (Tabler's picture-in-picture icon, the same size and colour as the other corner
   icons, left of settings) that opens the floating timer. The setting and the button appear only where
   the browser offers a window for a page, and are hidden elsewhere. Built in round 2.11.
4. **Background images:** JPEG, PNG, WebP or AVIF, detected from their contents, at most 20 MB and 50
   megapixels, re-encoded at screen size; SVG refused. They stay on the device, never uploaded or synced.
   One per display mode.
5. **Art:** the tree is built as drawn in the canvas; ocean life uses the canvas's placeholder fish through
   the asset registry; final art is commissioned later. Art files are kept under their own licence file,
   separate from the GPL code.

Also from the owner's review: the analog hand glides continuously (round 2.2), and the Permissions-Policy
is confirmed not to block the wake lock (round 2.11).

## Open points

- **The ring tile's preview icon.** The Release 2 display frame draws the ring tile as a plain arc; the
  Release 1 display frame, which is built, draws the ring's fading tail. Round 2.2 keeps the built icon
  unless the owner says otherwise.
- **Options boxes** (answered, changes 3): every mode with options has its own box under the tiles, as the
  ocean depth options box is drawn: height's with its own landmarks switch, the tree's with its view as a
  segmented control (round 2.7, decision 328).
- **The contrast switch's crossfade** and **ocean life's arrival numbers** (round 2.7, decisions 327 and 323):
  questions for the owner in `docs/questions-overnight.md`.

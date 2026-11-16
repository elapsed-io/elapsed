# Release 2: Display modes and layout, in rounds

Proposed for the owner's approval; nothing is built until it is approved. Source: `docs/plan.md`
(Release roadmap > Release 2, Product summary, Architecture invariants, Loading and performance,
Settings catalog, Design system > Frame index and Display modes, Custom CSS safety, Privacy). The
plan stays the source of truth: where this breakdown and the plan disagree, the plan wins and the
breakdown is corrected.

Release 2 is built on its own branch from the fixed Release 1. During Release 1's private test run,
fixes for what testers find go to the Release 1 branch first and take priority; Release 2 picks them
up by merging Release 1 in.

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
  image; layouts saved per display mode and screen size; reset to default. Free-form editing is part of
  the unlock (see the questions below).
- **Device and session features:** a floating picture-in-picture timer, a screen wake lock while the
  site is the active tab (on by default), the switch to turn check-ins off (with its warning), the low
  power and animation speed settings, downloaded-mode management, and automatic removal of modes unused
  for 30 days.
- **Privacy:** no new data leaves the device; imported images and fonts stay on it.

## Order

The platform comes first, because every new mode depends on being downloaded, cached and removed. The
analog stopwatch comes next: it has no art and reuses the ring replay, so it proves the platform with the
fewest moving parts. Ocean depth comes before height, which reuses its light-model background and its
profile-chart replay; ocean life follows ocean depth. The tree and interstellar are independent and the
most art-heavy. The layout editor comes after every mode exists, so it is built against all of their
bounds. The small device features come last before hardening, since nothing else depends on them.

| Round | Builds | Frames |
| --- | --- | --- |
| 2.1 | Mode platform, low power, animation speed | — |
| 2.2 | Analog stopwatch and its replay | Analog stopwatch; Results: analog and ring |
| 2.3 | Ocean depth and the profile-chart replay | Ocean depth: running, 0 to 20 m; Results: ocean depth |
| 2.4 | Ocean life | Ocean depth: paused |
| 2.5 | Height | Height; Results: height |
| 2.6 | Tree | Tree: side and isometric; Results: tree |
| 2.7 | Interstellar, behind its test flag | Interstellar: running and results |
| 2.8 | Layout editor and background images | Layout editor |
| 2.9 | Picture-in-picture, wake lock, the check-ins switch | Settings panel (Release 2 controls) |
| 2.10 | Hardening and the release review | every Release 2 frame |

Every round ends as Release 1's did: `npm run check`, the end-to-end suite in Chromium, Firefox and WebKit
(through the reference image), the round's safety overview in `docs/safety/round-2.<n>.md` with every item
answered, decisions recorded, and a stop for the owner's review. Every new screen matches its frame in the
design canvas; where it cannot, the round stops and asks.

## Rounds

### 2.1 Mode platform, low power, animation speed

**Builds:**

- The asset registry at runtime: art referenced by key, with placeholder defaults, inline SVG whose
  colours are CSS custom properties; catalogs load only with their mode.
- Mode packages declare their art and its size; the size check enforces each mode's 30 KB of code and
  150 KB of art.
- Downloaded modes: a mode is fetched only when picked, cached for offline use, and listed in settings
  with its size and a remove button. A mode unused for 30 days is removed automatically: its last use is
  kept with the cached files, and the check runs when the page loads, never on a timer.
- Low power (settings, off by default; also on under the system's reduced-motion preference): freezes
  ambient animation and shows only the time. The app may suggest it where the browser reports a low,
  discharging battery.
- Animation speed (slower, normal, faster): sets the one multiplier, `--motion-scale`, that already scales
  every interface duration and the results replays (decision 215).
- The settings schema, migrations (schema 2) and settings frames for these controls.

**Tests:** unit tests for the registry, the cache's last-use records and the 30-day rule (fake clock);
end-to-end: a mode downloads only when picked, works offline afterwards, is listed with its size, is
removed by hand and after 30 days, and its removal leaves the stored layout and settings alone; animation
speed scales the morph and the replay; low power stops every ambient animation; reduced motion turns low
power on; settings migrations from schema 1.

**Safety overview:** data (a last-use time per downloaded mode, on the device), inputs (none new beyond
settings), storage keys and cache names, the service worker's new routes, abuse cases (a flood of mode
downloads, a cache filling the device's quota), tests.

### 2.2 Analog stopwatch

**Builds:** the analog stopwatch through the display-mode contract (one revolution per hour, labels every
5 minutes, an hours subdial, the hand in the accent colour), moving by CSS transforms set once a minute;
its replay is the ring replay's one ring per hour, with the hand. Paused and check-in states, reduced
motion and low power as for every mode.

**Tests:** the analog frame and the analog results frame, pixel for pixel in the reference environment;
the hand's angle over time; the replay's rings revealed exactly behind the hand; size budget.

**Safety overview:** none new beyond its package; abuse cases: none.

### 2.3 Ocean depth

**Builds:** 15 m per focused minute, stopping at 10,935 m; the background from the plan's light model as
a gradient around the current depth, text in its colour; colours and rates from the config module; the
profile-chart replay with zone bands and at most two random landmarks per 1,000 m band ("results
landmarks" option); mode options in settings.

**Tests:** the light model's colours at chosen depths (unit tests against the plan's formula); the ocean
frames at 0 to 20 m and running; the results frame; landmarks never more than two per band and only from
the catalog; stopping at the deepest point; contrast of the text over the background at every depth.

**Safety overview:** the landmark catalog (static data in the package); no new data; contrast.

### 2.4 Ocean life

**Builds:** a small catalog per depth zone in the asset registry (placeholder art until final designs),
one zone loaded at a time; on pause, schools and individuals accurate to the depth come in at several
distances and leave when the timer resumes; the "ocean life" mode option.

**Tests:** only the current zone's catalog loads; creatures match the zone; they arrive on pause and leave
on resume; nothing animates per frame (the plan audit); the paused ocean frame; low power and reduced
motion.

**Safety overview:** art licences recorded for every asset; catalog sizes against the art budget.

### 2.5 Height

**Builds:** 140 m per focused minute, stopping at 100 km; the sky's light model as a gradient across
±1,500 m; stars fading in between 18 and 42 km; the profile-chart replay (shared with ocean depth) with
landmarks per 10 km band.

**Tests:** the sky's colours (unit tests), the height frame, the results frame, the stopping point, star
visibility by altitude, text contrast over the sky.

**Safety overview:** none new beyond its package.

### 2.6 Tree

**Builds:** one year per focused hour, 15 minutes per season, leaves and snow as the plan describes, each
cluster offset by up to a quarter season; side and isometric views (a mode option); the replay growing the
tree to full size at 60 focused minutes through its seasons; art through the registry.

**Tests:** season and leaf colours at chosen minutes (unit tests); the side and isometric frames; the
results frame; motion only through slow CSS transitions; low power.

**Safety overview:** art licences; art budget.

### 2.7 Interstellar (test flag)

**Builds:** light-speed travel per session; the logarithmic map (radius 26 + 30·log10(AU/0.3) px at
reference) with the planets' rings, the Kuiper belt edge, the heliopause, the Oort cloud band and Proxima
Centauri; the still star field from the canvas catalog with the plan's projection and star sizes; the
radial-map replay with callouts; available only behind its test flag.

**Tests:** distance after a given focused time; the map's radii (unit tests against the formula); the
star projection; the running and results frames; hidden unless the flag is on.

**Safety overview:** the star catalog's source and licence; the test flag cannot be turned on by a page
other than the site's own.

### 2.8 Layout editor and background images

**Builds:** the customize mode, entered from settings or with a long press on phones; every layer
(background, display mode, buttons, icons) moved, rotated, stretched, resized, hidden and reordered as
data; layouts saved per display mode and per screen size (desktop and phone, the phone default designed
for the phone), versioned, with reset to default; "time size" and the editor change the same value; each
mode reports its rendered bounds (for Release 4's no-widget zones); background images imported from the
device: common raster formats detected from their contents, re-encoded at the screen's size (which strips
location and camera metadata), capped in size and dimensions, SVG refused, kept in the `MediaStore` on the
device, never uploaded; safe mode turns layouts off.

**Tests:** layout data round-trips, migrations and reset; the editor's moves by pointer, touch and
keyboard; layouts per mode and screen size; the layout editor frame; crafted images (wrong extension,
oversized, SVG, metadata-laden) are refused or cleaned (the image corpus the plan's defence 12 asks for);
safe mode; custom CSS still scoped; accessibility of the editor.

**Safety overview:** data (layouts and images on the device, image metadata removed), inputs (image
files), storage keys, abuse cases (decompression bombs, malformed images, layouts that hide every control
with safe mode as the way back), tests.

### 2.9 Picture-in-picture, wake lock, the check-ins switch

**Builds:** a picture-in-picture timer window where the browser offers one; the screen wake lock while
the site is the active tab, on by default, released when hidden; the check-ins switch with the plan's
warning ("sessions without check-ins count towards your history, but won't count towards competitions");
nothing is marked on the session yet (the plan adds that marking in Release 6); the settings frames for
these controls.

**Tests:** the picture-in-picture window shows the same time and buttons and closes cleanly; the wake lock
is requested only while visible and released when hidden; with check-ins off no check-in falls due and
the pause limit still applies; settings migrations.

**Safety overview:** permissions used (none new in the Permissions-Policy unless the owner approves one),
data (the switch is a setting on the device), abuse cases.

### 2.10 Hardening and the release review

**Builds:** the accessibility pass for every new mode and the editor (WCAG 2.2 AA, axe-core, keyboard and
screen readers, 44 px targets, reduced motion and low power), the performance pass (budgets, a long
session in each ambient mode, the slow-phone checklist), the cross-browser pass, the device checks
extended for the new features, and the release review (`docs/safety/release-2.md`), then the owner's
sign-off.

## Questions for the owner

1. **Free-form layout without a way to pay.** The plan makes free-form editing part of the paid unlock,
   but payments arrive in Release 3. Should Release 2 (a) let everyone use free-form editing until the
   unlock exists, (b) show it locked behind the "unlock · $5 once" badge with no way to buy yet, or
   (c) ship preset positions only and add free-form editing with the unlock in Release 3?
2. **The interstellar test flag.** How is it turned on: a setting marked "test", an address parameter
   (like `?safe`), or a build-time flag that public builds leave off?
3. **Picture-in-picture beyond Chromium.** Only Chromium browsers offer a picture-in-picture window for a
   page; Safari and Firefox offer it for video only, which would mean drawing the timer into a video every
   frame, against the plan's "no per-frame drawing". Should picture-in-picture appear only where the
   browser offers a page window, and be hidden elsewhere?
4. **Background image limits.** Proposed: JPEG, PNG, WebP and AVIF, detected from their contents, at most
   20 MB in and re-encoded to the screen's size; SVG refused. Different limits?
5. **Placeholder art.** Ocean life and the tree start with placeholder art, as the plan says. Is the
   design canvas's art the placeholder to build, and where should final art come from when it is ready?

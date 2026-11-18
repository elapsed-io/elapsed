# Safety overview: Release 2, round 2.10 (Lighter and faster)

Date: 2026-11-17. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.10; owner, round 2.10.

## 1. What changed

- **Modes:** ocean depth, height and the tree are test modes beside interstellar, offered by `?test=modes` (or
  `?test=interstellar`) through the existing switch; a test mode chosen while it is off shows digits with the
  choice kept (decision 369). The perpetual calendar test mode is removed completely (368).
- **The core** holds only what the timer, digits, ring and timeline need (370); each piece type, results view,
  environment and the camera is its own download (371); the settings panel, results, the custom CSS editor, the
  test-modes store, the downloaded-modes list and the image store are outside the core (372). Core JavaScript
  47.8 KB before, 39.8 KB after.
- **Build-time preparation:** interstellar's skies are drawn by the build as SVG images and only placed and moved
  on the device (373, 374).
- **Mode loading** is one cancellable pipeline with a common mount and teardown contract (375 to 377); ocean depth
  and height keep the theme's background while in testing (378); switches start on the frame of the choice with a
  crossfade of at most 120 ms (379).
- **CI:** every download has its own size ceiling, failing the check when passed (380). Dead code removed (381).

## 2. Data

Nothing new is stored or sent. `test-modes` is written as before (decision 363), now also after `?test=modes`;
the `mode` setting no longer takes `calendar` (a stored one reads as digits). The page marks itself ready with an
attribute on its root element (`data-ready`), which holds nothing. `docs/data-inventory.md` is updated.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| The address's `test` parameter | As in round 2.9: read once; only `modes` and `interstellar` offer the switch (off), anything else is ignored, and the parameter is never stored or sent. |
| The build's sky images | Made by the build from files in the repository (the recipe, the canvas catalog, the HYG data); each is SVG of `circle` elements with numeric attributes and a comment, served from the site's own origin as an image (an `<img>` or a CSS background), so nothing in it can run: SVG in an image context runs no script and loads nothing. The device checks each image's description (a URL string and finite numbers) before placing it. |
| A mode's code and art | Fetched from the site's own origin only, as before; a cancelled load is dropped and takes down whatever of it was mounted. |

## 4. Dependencies

None added, runtime or development; none unused (decision 381). The HYG star data's licence (CC BY-SA 4.0) now
reaches the site as a derived image, which carries the credit and the licence in a comment at its top
(`packages/web/src/art/stars/LICENSE.md` updated); the data file is a build input only.

## 5. Security surface

- **No new endpoint, header, permission or network request.** The sky images are hashed assets of interstellar's
  chunk, under `img-src 'self'` (the CSP is unchanged), cached with the mode for offline use.
- **DOM only, as before:** the mode stage builds its root with `createElement`; staged roots are `inert` and
  hidden from screen readers until they show; no markup is parsed, so Trusted Types still allow nothing.
- **Inline styles** set from script remain numbers and the site's own strings (`style.setProperty`), now including
  the sky images' own hashed URLs in a CSS `url()` for the faint stars' tile: a build-made path, never recipe or
  user text.
- **Timers:** none added (the plan audit still finds one `setTimeout`, the clock's). The stage and the tree's
  slices yield through the browser's task scheduler (`scheduler.postTask`, `scheduler.yield`) or a message to
  itself, never a timer and never a loop.

## 6. Abuse cases

- **Quick switching** (a person, or a script driving the settings) can at most start and cancel loads: each newer
  choice cancels the one before, at most one mode is staged and at most one environment is fading, and a test
  checks twenty quick switches never hold the main thread past 50 ms and leave the heap at its baseline.
- **A session ended, paused or started mid-load** applies at once; the session never waits on a mode (tests for
  each).
- **A crafted or damaged download** (a failed fetch, an image that does not decode) leaves the current mode on
  screen; an image that fails is shown blank and never holds a mode back.
- **Size creep** fails CI in the round it happens (decision 380).

## 7. Tests

- **Results:** see the round summary in `docs/questions-overnight.md` for `npm run check` and the reference run in
  Chromium, Firefox and WebKit.
- **New unit tests:** the build's sky drawing (projection, placement, the strip's wrap across its edges, the poles
  inside it); the build list of what each mode fetches against the library, and each descriptor's recipe and
  environment against it; the service worker's map sending each mode's pieces with it; the download ceilings
  covering every download; the plan audit's session independence and single mount path.
- **New end-to-end tests** (`e2e/mode-switch.spec.ts`, `e2e/performance.spec.ts`): ending a session while
  interstellar loads (the display never changes mid-end; the chosen mode shows once back); pausing while a mode
  loads; switches among digits, ring and timeline landing in the task of the choice with no download; ocean depth
  and height keeping the theme's background through idle, running and paused with no environment; every mode's
  mount and teardown leaving the page as digits alone left it; twenty quick switches (no task over 50 ms, heap
  back to baseline); seven hours running in each mode (page and animations flat); a hidden tab in each downloaded
  mode (nothing drawn, only the heartbeat). Updated: the offline tests use analog and the tree (ring and timeline
  no longer download), the ambient tests use interstellar's space with the 120 ms crossfade.
- **Set aside with their reason** (`ENVIRONMENT_IN_TESTING`): the water's and the sky's tests and the ocean and
  height timer frames, which need the environments ocean depth and height do not draw while in testing.

## 8. Open risks and follow-ups

1. **Questions for the owner** (`docs/questions-overnight.md`, 27 to 31): the layout editor round (now 2.11); the
   pieces ocean depth and height still draw over the theme; what a cancelled load leaves; what the watch cases
   need; the tree's year on the device.
2. **The recipe system's reach** (the round summary's section 1): a user recipe cannot yet bring a catalog to
   project, a background image, shaped hands or calendar complications.
3. **Test-browser rendering:** the long-task tests run on the reference image's software rasteriser, where the
   orbit fix mattered most (decision 374); a phone with a GPU rasterises faster, so they are a strict bound.

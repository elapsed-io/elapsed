# Safety overview: Release 2, round 2.9 (Interstellar, as a recipe, behind the test-modes switch)

Date: 2026-11-17. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.9; owner, changes 5 (item 3).

## 1. What changed

- **Interstellar**, a test mode built directly as its recipe: light-speed travel from Earth's orbit on a
  true-scale map with a camera that pulls back, the orbits fading as they shrink, each landmark drawn as itself
  once reached, a still sky from the canvas's own catalog that turns while paused (the HYG catalog), comets while
  paused and on the results, the distance line, and the journey replayed on the results (decisions 351 to 362).
- **The test-modes switch** in advanced settings, offered once the site has been opened with `?test=interstellar`,
  off by default; on, it shows both test modes' tiles (decision 363). It replaces round 2.7's `?test=calendar`.
- **New pieces:** the camera's map (one drawing for camera-space layers), `circles`, `shape`, `path`, `landmarks`,
  the projected sky, comets, and a colour-stops environment; a `map` results layout and a focus-driven headline
  count in the display-mode contract (360, 361).
- **Recipe version 1** gains the starfield's optional `view` slot (decision 338's rule).

## 2. Data

One new local storage record, `test-modes`, `{"schema":1,"offered":true,"on":false}`: whether the switch is
offered and on, and nothing else. It is written only after the site has been opened with `?test=interstellar`,
never synced or put in a settings file, and removed by clear device data. The `mode` setting may now also hold
`interstellar`. Nothing new is sent. A session in interstellar records nothing beyond what every session records
(its display mode is already part of it). `docs/data-inventory.md` is updated.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| The address's `test` parameter | Read once at load with `URLSearchParams`; only the exact value `interstellar` offers the switch, any other value is ignored, and the parameter itself is never stored or sent. It can do one thing: show one switch, off. |
| `test-modes` record (read back from local storage, so untrusted) | Exactly the keys `schema`, `offered` and `on`, schema 1, `offered` true and `on` a boolean; anything else reads as never offered and off. A stored test mode with the switch off falls back to digits at startup. |
| The star catalogs | Built in, never fetched from elsewhere: the HYG data ships in the mode's own chunk (`art/stars/hyg-mag5.json`), the canvas catalog in `art/space`. Each is checked when read (four finite numbers a star, or the still sky's shape); anything else draws no stars. |
| Landmark list entries | Built in; checked when read (a number, an id, a name, an optional art slot id); names reach the page through text nodes. |
| Body art | Through the asset registry, which accepts only plain shapes with geometry attributes (no clip paths, ids, URLs or styles); colours are tones mapped in the mode's stylesheet. |
| Recipe fields `view` and `distance` | The schema and the loader: `view` must name a star-catalog slot of the recipe; `distance` is a range within bounds. |

## 4. Dependencies

None added, runtime or development. The star data is not code: the HYG database v4.1 (David Nash, astronexus),
**CC BY-SA 4.0**, stars to magnitude 5 (1,637), derived by `tooling/derive-hyg-stars.py` (which reproduces the file
byte for byte from the source CSV, SHA-256 d9f69fd8…ebd) and kept with the licence's full text and an attribution
note in `packages/web/src/art/stars/` (`LICENSE`, `LICENSE.md`); the derived data is shared under the same licence,
and the credit and licence travel inside the file (`source`, `licence`). The site shows no credits page yet
(question 24). The canvas catalog, the faint stars and the bodies are the design canvas's placeholder art, CC0 like
the other modes' (`art/space/LICENSE`).

## 5. Security surface

- **No new endpoint, header, permission or network request.** The HYG chunk loads from the site's own origin, only
  when the sky first turns, through the same precache and service worker map as every mode chunk.
- **DOM only:** every element is built with `createElement`/`createElementNS`; names come from the brand module
  through text nodes; no markup is parsed, so the CSP's Trusted Types still allow nothing.
- **Inline styles** set from script are numbers and the site's own colour strings (`style.setProperty`), never
  recipe text; recipe colours pass the schema's colour rule before any reaches a style.
- **Timers:** none added. The map, the sky, the comets and the replay move by CSS and Web Animations; script sets
  them when the minute turns, the pause starts, or the results appear.

## 6. Abuse cases

- **A crafted address** (`?test=…`) can at most offer the switch, which is off; nothing it carries reaches the page
  or storage.
- **A damaged or hostile `test-modes` record** can at most offer the switch or show the two test modes' tiles.
- **A long session** draws further out (beyond the heliopause the map only keeps zooming out); 16 hours of focus is
  115 AU, so the numbers stay small. Accounts' distances (Release 4) are not stored yet.
- **Performance:** the turning strip draws about 1,600 circles once per pause on its own layer and slides it with
  one animation; with low power or reduced motion it is never drawn. The map's glides are about 40 animations set
  once a minute.

## 7. Tests

- **Results:** `npm run check` (768 unit tests; core JavaScript 47.8 KB of 50 KB; interstellar 17.7 KB of code and
  17.5 KB of art); the end-to-end suite through the reference image in Chromium, Firefox and WebKit: 990 passed,
  18 skipped as declared, 0 failed.
- **Unit:** light speed (0.12024 AU a focused minute from 1 AU); the camera's scale and usable path; the rings',
  bodies' and Earth's fades; the 70 px name rule; the map at ten moments against the frames' own arithmetic, on
  the timer and on the results; the comets (tails away from the Sun, about one every 5 s, at most two, each within
  its limits); the recipe's checks (light speed, the camera, the orbits, comets, the turning sky, the caption,
  the test flag, the journey replay); the manifests' art; the plan audit.
- **End to end:** the "interstellar, running" frame at five moments (1 h 24 min, 3 min, 30 min, 5 h 30 min,
  15 h), with a control; the "interstellar, paused" frame; the "results: interstellar" frame as its replay lands,
  with a control; every body within 1 px of the travel line; the comets' tails and limits, and their leaving on
  resume; the sky turning once in 6 minutes from the still view, and staying still with low power; the map's
  minute glides and its steps under low power; the test-modes switch (hidden until asked for, off by default,
  interstellar's tile only while on, the fallback to digits) and the Release 2 advanced frame.

## 8. Open risks and follow-ups

1. **Questions for the owner** (`docs/questions-overnight.md`, 23 to 26): the paused sky's crossfade to the HYG
   strip; where the HYG credit shows on the site; the paused frame's "past jupiter"; the Oort cloud and Proxima
   Centauri, which wait for accounts.
2. **The core's budget margin** is 2.2 KB (decision 366).
3. **Jupiter's bands and the results route** differ from the frames by a few anti-aliased pixels (decisions 358,
   365), and in the reference image the site's text is anti-aliased differently from the frames' (367); the frame
   tests state the measured noise and compare each frame again with its text transparent.

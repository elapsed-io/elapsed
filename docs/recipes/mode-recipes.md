# Display-mode recipes, version 1

Every display mode is a **recipe**: a JSON file that chooses and tunes pieces from a fixed library. elapsed's own code draws every piece; a recipe contains no code, formulas, URLs or markup. The built-in modes are recipes too, so anything a built-in mode does, a user can copy and change.

Files:
- `mode-recipe-1.schema.json`: the JSON Schema every recipe must pass.
- `recipes/*.json`: the eight built-in modes as recipes.
- `recipe-check.py`: validates the recipes, checks every reference, and checks 49 features from docs/plan.md against them. Port it to the repository's tests.

## Shape of a recipe

| Field | What it holds |
| --- | --- |
| `measure` | What focused time becomes: unit, amount per minute, start, maximum, decimals, and whether records are `comparable` (built-in rates) or `mode-only` |
| `cycles` | Repeating clocks, such as a 60-minute hour, a 720-minute half day, or a 60-minute year with named phases (seasons) |
| `zones` | Named bands of the measure, used by captions, catalogs, landmarks and passing things |
| `environment` | The background: the theme, colour stops along the measure, or the `light-falloff` preset (base colour, per-channel falloff, distance scale, gradient spread, results dimming) |
| `contrast` | Light and dark text colours; with `auto`, text switches to whichever meets the contrast rule against the background |
| `camera` | `fixed`, or `follow-zoom` (anchor, angle, usable fraction, minimum value) for layers placed in camera space |
| `layers` | Up to 24 pieces from the library, drawn in order |
| `states` | For paused and check-in: what blurs, the caption, which ambient layers appear |
| `results` | Replay length and easing, the view (focus strip, rings per hour, profile chart or the scene replayed), how the card is lit, what shows, and finale effects |
| `options` | Up to 6 per-mode settings (switches and segmented controls) that toggle layers or choose variants |
| `slots` | Named art and data the mode uses, each with a built-in default. Users fill slots with their own images through the local import; a recipe never names an outside file |

## The piece library

| Piece | Purpose | Built-in users |
| --- | --- | --- |
| `time` | The clock, with the seconds setting | all |
| `text` | A caption from a template | any |
| `ring` | Track, fading tail that can grow in, round head | ring |
| `dial` | Ticks, labels, hand, up to 8 subdials: small dials, further hands from the centre, a calendar's parts (date, weekday, month, leap year) and the moon | analog, perpetual calendar (a test mode) |
| `track` | Scrolling time scale with faded ends and the personal-record marker | timeline |
| `sprite` | An image strip; the frame follows a cycle, a zone or the measure, with crossfades | tree (your own art) |
| `tree` | The procedural tree, side or isometric, with growth, leaf colours per season, cluster offsets, snow and ground | tree |
| `passing` | Images that move past as the measure crosses their range | ocean and height results |
| `particles` | Streaks, comets, dots, flakes or images: rate, count, lifetime, sizes, colours, angles, distances, depth layers, orientation (including away from the camera's anchor), arrival and leaving, bursts | ocean life, shooting stars, meteor showers, comets, snow |
| `starfield` | A star catalog slot, projection, star sizes by magnitude, opacity, panning | height, interstellar |
| `circles` | Circles at values, labelled, dashed or solid, fading when small | interstellar orbits |
| `path` | A route from a value to the current value, with a head | interstellar |
| `landmarks` | A landmark-list slot, anchored to the chart or the path, capped per band and in total, labels that pop, fade after the replay and return on hover | ocean, height, interstellar |
| `shape` | A circle, ellipse or rectangle with radial fills and glow | the Sun, height's horizon |
| `reveal` | An image uncovered as a binding grows | (new modes: a candle, a filling jar) |
| `image-path` | A marker travelling along points over an image | (new modes: a road trip on a map) |

**Bindings** let any number follow the measure, a cycle or the replay's progress through 2 to 16 stops, linear or smooth. There are no formulas; the light model and the camera are presets with a few knobs.

## Additions from the first new mode (2026-11-16)

The perpetual calendar test mode (`recipes/calendar.json`), made after a perpetual-calendar watch as a test of the
recipe system, needed four things version 1 lacked. They are optional, so every recipe written before stays valid:

- **Calendar cycles.** A cycle with `"calendar": "gregorian"` counts days of its `minutes` each on a Gregorian
  perpetual calendar from Monday 1 January 2024 (a leap year): months of their own lengths, the four-year leap
  cycle (2100 a common year), and the real moon of the date shown.
- **Subdial faces and parts.** A subdial's `face` is `dial` (a small dial with its marks and hand, the default) or
  `hand` (its hand alone, from wherever it sits: an hours hand or a sweeping seconds hand from the centre). On a
  calendar cycle its `part` says what it shows: `date`, `weekday`, `month`, `leap-year` (each stepping at the turn
  of its day, as a perpetual calendar jumps at midnight) or `moon` (a disc with two moons turning behind a window).
- **Names and titles.** `names` gives a small dial's marks their words, one a place (an empty name leaves a mark
  unnamed); `title` puts a word under it (the analog dial's "hours").
- **More subdials:** up to 8 (from 3).

## Safety

The schema enforces all of the following, and the runtime checks them again on load:
- Data only. Unknown fields and unknown piece types are rejected, so there is nowhere to put code, event handlers or markup.
- Colours are hex values or theme tokens; no `url()`. Templates allow only `{value}`, `{unit}`, `{zone}`, `{time}`, `{pause}`, `{landmark}` and `{distance}`. Labels refuse `<`, `>` and braces.
- Slot defaults are `builtin:` assets only. User images enter through the existing image import (detected by content, re-encoded, size-capped, kept on the device); recipes never name a file or address.
- Limits on everything that costs time or memory: 24 layers, 12 particles at once, 24 passing items, 24 circles, 6 options, 32 slots, 16 stops per binding, image slots up to 4,096 px, replays of 0.5 to 4 s.
- Reduced motion and low power apply to every recipe automatically, and the contrast rule is enforced at run time, whatever a recipe asks for.
- Records stay fair: built-in recipes use fixed, `comparable` rates. A copied or user-made mode is `mode-only`: its distance or depth records stay labelled with that mode and never count for competitions. Focused time is the same everywhere.

The checker's negative tests (script in a name, unknown placeholders, `url()` colours, outside slot defaults, event-handler fields, unknown piece types, formulas, too many layers, particle floods, path traversal in slot ids, oversized images, over-long replays) must all be rejected; keep them as tests.

## Coverage

All eight built-in modes are expressed as recipes, and all 49 features the plan gives them pass the check, including the ring's growing tail, the timeline's record marker, the analog subdial, ocean life by zone at three distances, the lit results that start from the session's colour, both finales, shooting stars with meteor showers, the tree's seasons and both views, and interstellar's camera, orbits, comets and turning sky. The tree's procedural drawing is the one piece specific to a mode; the `sprite` piece gives the same mode a path for anyone's own season strip.

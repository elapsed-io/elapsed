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
| `dial` | Ticks, labels, hand, batons, up to 8 subdials: small dials and further hands from the centre | analog |
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

**Loading (round 2.10).** Each piece type is its own small download, fetched only when a chosen mode's recipe uses
it (`packages/web/src/modes/recipe/library.ts`); results views, environments and the camera load the same way, by the
recipe's view, environment and camera types. The core holds only what digits, ring and timeline draw with (the
`time`, `ring` and `track` pieces). A mode is then its recipe, its slots' sources and its colours; mode loading is
one cancellable pipeline (the site's mode stage), and every mode mounts and comes down through the same contract
(`docs/display-mode-contract.md`).

**Prepared when the site is built (round 2.10).** A `starfield` with a `projection` in a built-in recipe is drawn by
the build, not the device: the whole catalog in `slot` as a strip a full turn wide, and the results card's star
field from the same catalog, each an SVG image with the recipe's projection and star sizes
(`packages/web/build/sky.ts`). The device only places these images and slides the strip. One sky everywhere (round
2.11): the strip stands still while running and slides while `pan.when` turns it, with no second catalog. A recipe from anywhere else cannot yet bring a catalog to project: its starfield needs a ready-drawn
field (an image slot), as height's is.

## Additions from the first new mode (2026-11-16), and its removal (round 2.10)

The perpetual calendar test mode, made after a perpetual-calendar watch as a test of the recipe system, was built
from a recipe and the `dial` piece alone, with nothing of its own outside them: it proved the system (decision 368)
and was then removed completely, with what only it used. What it added that other dials use stays:

- **Subdial faces.** A subdial's `face` is `dial` (a small dial with its marks and hand, the default) or `hand` (its
  hand alone, from wherever it sits: an hours hand or a sweeping seconds hand from the centre).
- **More subdials:** up to 8 (from 3).

Gone with it: calendar cycles (`"calendar": "gregorian"`), a subdial's calendar `part` (date, weekday, month, leap
year, moon), and its `names` and `title`. A recipe that names one is refused as any unknown field is.

## Additions for the redesigned analog stopwatch (2026-11-17)

The analog stopwatch redrawn as its new frame needed five more optional fields, so every recipe written before
stays valid:

- **`theme.red`**, a colour token: a red for marks on a dial that meets 4.5:1 on the small dial's face in every
  theme (the seconds dial's 60).
- **A hand's `tail`**: how far it reaches back past the point it turns about.
- **A dial's `batons`**: slim baton indices, the first at 12. One that would touch a small dial stops short of it,
  or is left out when even its outer end would; an outer number that would crowd one is left out too.
- **A small dial's `ticks` and `topColor`**: its ticks, longer at each of its numbers, and the colour of the number
  at 12. A small dial's `labels` draw its numbers, the first at 12, in seconds, minutes or hours by its cycle's
  length (a minute's dial counts 10 to 60).

## Additions for interstellar (2026-11-17)

Interstellar (`recipes/interstellar.json`, a test mode) is built from the recipe as its frames draw it, which
settled what some fields mean and added one optional field, so every recipe written before stays valid:

- **Camera space** is one map: a `follow-zoom` camera's layers (`space: "camera"`) draw on one drawing in the
  recipe's order, held behind one blur while paused. The anchor is a share of the screen in the frame's
  reference pixels; the usable path runs `usable` of the way along the heading to 20 px short of the right edge.
- **`circles`** fade as their radius shrinks through `fadeBelowPx` (gone at half of it, full at one and a half
  times), at most the layer's `opacity`; **`landmarks`** on the path are gone at `fadeBelowPx` and full 14 px
  further, each landmark-list entry naming its body's art slot (`art`), an entry at or before the measure's
  start drawn last without a name; a **`path`** draws at its layer's `opacity`, its head over everything.
- **`particles` with `shape: "comet"`**: tails away from the camera's anchor, travelling `distance` pixels.
- **Captions** fill `{distance}` with the distance travelled from the measure's start, to its `decimals`, and
  `{zone}` with the zone's name.

## Versions

Recipe version 1 stays open until Release 2's public release, then freezes (owner, 2026-11-17; decision 338).
After that, optional additions with sensible defaults keep version 1; anything that would break an existing recipe
(renaming or removing a field, changing a value's meaning, renaming a slot) goes to version 2, with an automatic
migration on load and a test for it. Slot ids are permanent once released. The schema in this folder is the source
of truth, and says so at its top.

## Safety

The schema enforces all of the following, and the loader checks them again: the site's own recipes when the site is built (a refused one stops the build), and any other recipe when it loads:
- Data only. Unknown fields and unknown piece types are rejected, so there is nowhere to put code, event handlers or markup.
- Colours are hex values or theme tokens; no `url()`. Templates allow only `{value}`, `{unit}`, `{zone}`, `{time}`, `{pause}`, `{landmark}` and `{distance}`. Labels refuse `<`, `>` and braces.
- Slot defaults are `builtin:` assets only. User images enter through the existing image import (detected by content, re-encoded, size-capped, kept on the device); recipes never name a file or address.
- Limits on everything that costs time or memory: 24 layers, 12 particles at once, 24 passing items, 24 circles, 6 options, 32 slots, 16 stops per binding, image slots up to 4,096 px, replays of 0.5 to 4 s.
- Reduced motion and low power apply to every recipe automatically, and the contrast rule is enforced at run time, whatever a recipe asks for.
- Records stay fair: built-in recipes use fixed, `comparable` rates. A copied or user-made mode is `mode-only`: its distance or depth records stay labelled with that mode and never count for competitions. Focused time is the same everywhere.

The checker's negative tests (script in a name, unknown placeholders, `url()` colours, outside slot defaults, event-handler fields, unknown piece types, formulas, too many layers, particle floods, path traversal in slot ids, oversized images, over-long replays) must all be rejected; keep them as tests.

## Coverage

All eight built-in modes (four of them test modes from round 2.10: ocean depth, height, the tree and interstellar) are expressed as recipes, and all 49 features the plan gives them pass the check, including the ring's growing tail, the timeline's record marker, the analog subdial, ocean life by zone at three distances, the lit results that start from the session's colour, both finales, shooting stars with meteor showers, the tree's seasons and both views, and interstellar's camera, orbits, comets and turning sky. The tree's procedural drawing is the one piece specific to a mode; the `sprite` piece gives the same mode a path for anyone's own season strip.

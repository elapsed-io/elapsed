# Display-mode recipes, version 1

Every display mode is a **recipe**: a JSON file that chooses and tunes pieces from a fixed library. elapsed's own code draws every piece; a recipe contains no code, formulas, URLs or markup. The built-in modes are recipes too, so anything a built-in mode does, a user can copy and change.

Files:
- `mode-recipe-1.schema.json`: the JSON Schema every recipe must pass.
- `recipes/*.json`: the eight built-in modes as recipes.
- `recipe-check.py`: validates the recipes, checks every reference, and checks the features docs/plan.md gives each mode against them (64 since round 2.13). Ported to the repository's tests (`packages/core/src/recipes/archive.test.ts`).

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
| `dial` | Ticks, labels, batons, a hand with a tail, up to 8 subdials (small dials, or further hands from the centre) | analog |
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

All eight built-in modes are expressed as recipes, and all the features the plan gives them pass the check (64 since round 2.13), including the ring's growing tail, the timeline's record marker, the analog subdial, ocean life by zone at three distances, the lit results that start from the session's colour, both finales, shooting stars with meteor showers, the tree's seasons and both views, and interstellar's camera, orbits, comets and turning sky. The tree's procedural drawing is the one piece specific to a mode; the `sprite` piece gives the same mode a path for anyone's own season strip.

## Added for cinematic modes (height's falcon, and anything at depth or interstellar's level)

These are still schema version 1, which stays open until Release 2's public release. Every addition is optional, so all existing recipes still load unchanged.

| Addition | What it does |
| --- | --- |
| `elapsed` bindings | Any number can follow the seconds since the session started, for start sequences |
| `space: "sky"` | A layer infinitely far away (the sun, stars): it moves only when the camera tilts, never with the camera's travel |
| `scenery` piece | A landscape layer (conifers, hills or an image slot) at a relative `distance`; it moves by the camera's movement divided by that distance, and can repeat sideways (`tileX`) |
| `subject` piece | A character that flies: art (a built-in preset or an image slot), size and screen position; `entry` (where it comes from, delay, speed); `motion` (forward speed that fades into a thermal, climbing at the measure's rate); `flight` (wingbeat rate, downstroke share, upstroke fold, a flap and glide pattern, glide angle, irregular glide corrections, a steady position); `stages` that change it at a measure value (colour, crossfade, halo, flash, tail streamers) |
| `glare` piece | A lens glare from a source layer, in circles (a bloom and up to 8 ghosts), triggered by the camera's tilt |
| `camera: rig` | Follows a subject with a critically damped ease (no lurch, no overshoot), at `pxPerUnit` pixels per measure unit where the subject flies, with an optional upward `tilt` (pixels, start, duration, how far it deepens the sky) |
| `freeze` on paused and check-in | The whole scene stops where it is; only the time blurs |

The height recipe uses all of them and passes 18 feature checks. The safety tests now also reject a streamer flood, a 1000 Hz wingbeat, a flood of glare ghosts, a 5000 px tilt, unknown flight fields and too many stages.

## Added for ocean depth's idle screen

All optional, still version 1.

| Addition | What it does |
| --- | --- |
| `idle` in `when` | A layer can belong to the idle screen only; it is removed when a session starts |
| `dim` on `light-falloff` | Dims the light model everywhere it is used, so idle and running share one base colour that keeps text readable |
| `scale` on `shape` | A shape can grow and shrink on a binding; with a cycle binding whose stops start and end at the same value, it loops |
| `beam` particles | Light shafts from an `origin` (may sit off screen, like the sun), in `lanes` across a `spread` of directions, with random `widths`; each lives a random life (`fade`: in, hold, out, rest) at a `peak` brightness with a gentle `shimmer` and a depth `falloff`; `noOverlap` gives each beam a free lane only |

Load checks: with `noOverlap`, the lanes must be spaced wider than the widest beam (otherwise the recipe is refused), and the runtime contrast check takes a single beam as the worst case behind text. A beam's peak is at most 25% white.

## The standard modes follow their frames (round 2.13)

For digits, ring, timeline and analog the design canvas's frames are the source of truth (plan version 13): where a
recipe here differed from a frame, the frame won and the corrected recipe was written back into `recipe-check.py`,
which wrote this archive again and passes. Ring and analog draw the shared 260 px dial (the ring's radius 126 with an
8 px track; the analog stopwatch's case radius 130, redesigned with batons, the hours hand from the centre and a
seconds dial with its red 60); the timeline is the compact one, a 360 px track; and the time inside ring and timeline
takes the design system's shared 48 px, so these recipes give the time no size of their own (digits' 104 px is the
shared size too). The schema gained what those recipes need: `theme.red`, a hand's `tail`, `batons`, and subdials
with `face`, `ticks` and `topColor`, up to eight. The checker counts 64 features; the site runs its validation,
reference and budget checks, its features and its safety cases on this archive as permanent tests
(`packages/core/src/recipes/archive.test.ts`), and the site ships these four recipes unchanged.

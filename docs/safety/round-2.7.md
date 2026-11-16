# Safety overview: Release 2, round 2.7 (Recipes)

Date: 2026-11-16 (overnight). Template: plan, Safety overviews > Round overview. Breakdown:
`docs/plan-release-2.md`, round 2.7; owner, changes 3.

## 1. What changed

- **Every display mode is a recipe** (docs/recipes): a JSON file choosing and tuning pieces from a fixed library
  that the site's own code draws. Digits, ring, timeline, analog, ocean depth, height and tree are their recipes
  now, drawn by one recipe mode and the piece library; their mode-specific code is gone (decisions 319 to 326).
- **A loader** in the core checks every recipe when it loads, built in or not, and refuses one that fails: the
  mode then shows digits (319).
- **Slots**: every image and catalog a mode uses is a named slot whose built-in default is an asset-registry key
  (324).
- **From the owner's answers:** the contrast switch over bright water and sky (327), every mode's own options box
  with height's own landmarks switch and the tree's view as a segmented control (328), height's landmarks to the
  Kármán line (330), and the corrected "height, paused" frame (329).

## 2. Data

One new stored choice, `heightLandmarks` (on or off) in `settings`, kept only on the device like every setting;
a device that had switched the shared landmarks switch off keeps height's off. Nothing new is sent. Recipes are
shipped with the site; no recipe comes from anywhere else yet (a user's own recipes are a later release).
`docs/data-inventory.md` is updated.

## 3. Inputs

Recipes are an input: the built-in ones today, users' own and shared ones later. Every recipe passes the same
checks when it loads:

| What | How it is refused |
| --- | --- |
| Anything but data | The recipe is copied through JSON first: no prototypes, getters or functions survive. Text longer than 64 KiB, or not JSON, is refused before it is read. |
| Code, markup, event handlers | Unknown fields are refused everywhere (`additionalProperties: false`), so there is no field to put them in; unknown piece types are refused. Names and labels refuse `<`, `>` and braces; captions and landmark labels allow only `{value}`, `{unit}`, `{zone}`, `{time}`, `{pause}`, `{landmark}` and `{distance}`, filled as text (`textContent`). |
| Formulas | Every number is a number: a binding is a number or 2 to 16 stops of numbers, linear or smooth. Results bindings become CSS `calc()` of numbers only (decision 326). |
| Colours | Hex values or the eleven theme tokens; no `url()`, `expression()` or names, also inside colour stops and fills, which the loader checks itself (the schema only counts them). Colours reach CSS as custom-property values. |
| Addresses | Slot defaults are `builtin:` paths of lowercase folders and one file name with at most one extension: no scheme, no `..`, no leading slash. Slot ids cannot hold `..` either. A built-in key draws through the asset registry or not at all. |
| References | Every layer, cycle, phase, zone, slot and option a recipe names must exist; variants must name an offered choice. |
| Cost | At most 24 layers, 12 particles at once across every particle layer, 24 passing things, 24 circles, 6 options, 32 slots, 16 stops a binding; particles no faster than every 0.25 s, living at most 60 s, bursts of at most 16 at least 10 s apart; images and image strips at most 4,096 px; replays of 0.5 to 4 s. |
| Fairness | A recipe that is not built in is loaded `mode-only`: its records never count against built-in rates. |
| What a failing recipe does | It is refused whole and the mode shows digits; the refusal lists every problem. |
| Stored setting `heightLandmarks` | On or off, else the old shared switch's value, else on. |

## 4. Dependencies

None added, runtime or development. The schema validator is the site's own (`core/src/recipes/validate.ts`): it
knows exactly the keywords the schema uses and refuses a schema with any other, so a schema change cannot
loosen validation unseen.

## 5. Security surface

Unchanged: no new endpoint, permission, storage key or header. Recipes reach the page only as numbers, enum
values, checked colours and text; every piece builds its elements with the DOM, never from markup. The schema
and the built-in recipes are part of the build (the core's 49.0 KB of 50 KB of JavaScript includes the
validator and the schema).

## 6. Abuse cases

A hostile recipe (for later, when users can load and share them): the safety cases in
`core/src/recipes/recipes.test.ts` cover script in a name, markup in labels and zone names, unknown and coded
placeholders, `url()` and `expression()` colours (also inside stops and fills), outside, `data:`, absolute and
traversing slot defaults, traversing slot ids, event-handler and markup fields, unknown and script pieces,
formulas as bindings, stops and rates, too many layers, options and stops, particle floods in one layer and
across layers, too-fast particles, oversized bursts, images and strips, over-long and too-short replays, broken
references, a prototype key, and unknown versions: each is refused.

## 7. Tests

- **Unit (712):** the checker ported from `recipe-check.py` (every built-in recipe passes the schema, refers only
  to layers and slots it has, keeps comparable records only as a built-in; the 49 features, 48 checked now and
  the tree's "your art" to do in round 2.9); the safety cases above; the validator (unknown keywords, oneOf,
  lengths in characters); the measure, zones, cycles, bindings and light model equal to the built modes'
  (ocean depth and height colours to the hex); the replay timings from the recipes; the option values,
  variants and switches; captions; bindings as CSS; the profile view placing the frames' passing things; each
  manifest's art equal to its recipe's slots; the plan audit and the size check (core 49.0 KB of 50 KB; ring
  4.7, timeline 4.3, analog 5.8, ocean depth 16.0, height 15.4, tree 5.8 KB of 30 KB; art within 150 KB).
- **End to end:** every mode's frames as before, now drawn from recipes; the contrast switch on height and ocean
  depth; height's own options box and the tree's segmented control; the corrected height paused frame; the
  downloaded mode's cache holding only its own code and the piece library's shared modules.
- **Firefox and WebKit:** through the reference image.

## 8. Open risks and follow-ups

1. **The contrast switch's crossfade** (decision 327) and **ocean life's arrival numbers** (323) are questions for
   the owner.
2. **Core budget:** 49.0 KB of 50 KB; the next core addition should look at moving the schema into a chunk that
   loads with the first non-digits recipe.
3. **Piece tokens** for the built-in modes are still scoped to their mode (`[data-mode="ocean"]`); a copied mode
   (a later release) needs them scoped to the piece.
4. **Art licence and the analog hours hand:** still the owner's questions.

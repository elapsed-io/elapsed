# Safety overview: Release 2, round 2.13 (The standard sizes and the recipe archive)

Date: 2026-11-24. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.13; plan version 13 (Design system; answer 35).

## 1. What changed

- **The shared sizes** (decision 408): the 260 px dial in ring and analog, the 48 px time inside ring and timeline,
  the compact 360 px timeline 14 px below its time, every figure mode's block in the same slot 26 px above the
  buttons.
- **The analog stopwatch on the shared dial**, from its frame's coordinates, and its redrawn settings tile
  (decision 409).
- **The recipe archive reconciled** (decisions 410, 411): `recipe-check.py` corrected so the standard recipes are
  the frames', run, and its output written back into `docs/recipes/`; the site ships the same four recipes; the
  checker's validation, references, budgets, features and safety cases are permanent tests.

## 2. Data

Nothing new is collected, stored or sent. No setting, storage key or network request changes.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| Built-in recipes | As before, checked when the site is built against the site's schema and the loader's semantic checks; the four standard ones changed only in sizes. They now also pass the archive's schema (tested). |
| The archive's schema in the site's validator | One new keyword, `minProperties`, implemented like `maxProperties` and covered by the archive's safety cases (a flight step with no field is refused). The validator still throws on any keyword it does not know, so a schema cannot loosen it unseen. |
| Recipes from elsewhere (later releases) | Unchanged: the site's own schema, which allows only what its pieces draw, is what loads a recipe; the archive's wider schema is used only by the tests. |

## 4. Dependencies

None added. `recipe-check.py` uses the `jsonschema` package already on the owner's machine and in this environment
(not a site dependency; it never runs in the build or the site). It was run in a fresh scratch folder with
`python3 -I`, as the archive came from outside the repository.

## 5. Security surface

No change: no new endpoint, header, permission, script, storage or request. The mode drawings are built with
`createElementNS` from numbers in the config modules and the recipes, as before.

## 6. Abuse cases

- **A recipe that tries the archive's extra fields** (calm water, the falcon's flight) is refused by the site's
  schema until a piece draws them; the archive's safety cases (twenty) are refused by the archive's schema.
- **Window sizes:** the shared sizes scale with the time as before (the gap's floor stays 26 px), so nothing
  overlaps at phone widths (the reflow tests pass).

## 7. Tests

- **Results:** see the round summary in `docs/questions-overnight.md`.
- **New unit tests:** `packages/core/src/recipes/archive.test.ts` (121: each archive recipe's schema, references
  and budgets, the 64 features, the twenty safety cases, the standard recipes equal to the shipped ones, every
  shipped recipe within the archive's schema); the shared sizes in the generated tokens.
- **New end-to-end tests:** in `e2e/design-system.spec.ts`, the slot in ring, timeline and analog (centred, the
  buttons 26 px below, idle, running and paused) and the three sizes. Updated: the ring, timeline and analog frames
  from the current canvas (with seconds, as the frames draw them), the timeline's glide positions on the 360 px
  track, the analog tile against the Release 2 display frame (its rule removed). The gliding ring frames, and the analog frame
  outside the reference Chromium, are compared whole within a glyph-edge allowance and exactly with every glyph
  transparent (decision 412).

## 8. Open risks and follow-ups

1. **The frames show seconds** ("always", the default from round 2.14); until then the frame tests set it.
2. **The test modes' recipes** differ from the archive's until rounds 2.18 and 2.19 build the calm water and the
   falcon; the archive's ocean depth and height are checked as the owner wrote them.

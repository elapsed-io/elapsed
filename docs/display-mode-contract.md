# The display-mode contract

Every display mode, built in now or made by the community later, is built on this one contract (plan,
Architecture invariant 4; Release 1, round 3). Digits is built through it, not as a special case. No mode
reaches outside it: if a mode needs something the contract lacks, the contract is extended for every mode
and the change is recorded in `docs/decisions.md`.

The code is the reference: `packages/web/src/modes/contract.ts` (what a mode receives and provides),
`packages/web/src/modes/manifests.ts` (what the site knows before loading a mode), and
`packages/web/src/art/registry.ts` (art). This page explains them.

## Every mode is a recipe

Since round 2.7 every mode, digits included, is a recipe (`docs/recipes/mode-recipes.md`): a JSON file choosing
and tuning pieces from a fixed library that the site's own code draws (`packages/web/src/modes/pieces`). The
recipe mode (`modes/recipe/recipe-mode.ts`) builds the display from a recipe and its pieces and implements this
contract the same way for every mode; a built-in mode is its recipe and the pieces it uses
(`modes/built-in/*.ts`). The core checks every recipe when it loads (`core/src/recipes/load.ts`) and refuses
one that fails; the mode then shows digits (decision 319). What a recipe may hold, and what it is refused, is in
`docs/safety/round-2.7.md`.

## What the site knows before loading a mode: its manifest

| Field | Meaning |
| --- | --- |
| `id` | Lowercase name, stored in settings and in a session's mode spans. |
| `name` | Its name in settings (from the brand module). |
| `tier` | `core`: shipped with the first visit (digits only). `on-choice`: downloaded the first time it is shown, kept for offline use, removed after 30 days unused (plan, Loading and performance). |
| `budget` | Compressed size budgets the CI size check enforces: `codeBytes` (30 KB, failing at 60 KB) and `artBytes` (150 KB, failing at 300 KB). |
| `source` | The module that holds the mode; the size check and the offline cache find its files by this. |
| `art` | The asset-registry keys it draws: its recipe's slot defaults, and the tree piece's own drawing (see Art). |
| `options` | Which setting holds each of its recipe's options, by option id. |

## What a mode receives

- **`mount(root, context)`**: an empty element to draw into, inside the timer screen, between the corner
  icons and the controls, and a `DisplayContext` the site owns:
  - `seconds`: how much of the seconds shows (`blur-away`, `always`, `never`);
  - `reducedMotion`: the system asks for reduced motion;
  - `lowPower`: low power is on (by hand, or because of reduced motion): ambient animation stops and only
    the time shows; anything that moves with time steps once a minute instead of gliding.
  - `options`: the mode's own options as they are now, by its recipe's option ids (ocean depth: `ocean-life`,
    `landmarks`; height: `landmarks`; tree: `tree-view`), each mode's from its own options box;
  - `chrome(share, dark)`: the contrast switch. Over a bright environment the mode says how far the time, the
    icons and the labels have switched to its dark colour (0 or 1), and which colour; the site's stylesheets
    apply it to the mode's root and the corner icons, never the buttons (decision 327).
  When a value changes the site calls `render` again (or `relayout` when the font changed).
- **`render(view)`**: the timer's state (core, `engine/view.ts`), called only when the visible value
  changes: `status` (idle, running, paused, ended), `focusedMs` and `shownMs` (what the time shows, at
  `precisionMs`), `pausedForMs` while paused, `checkInDueAt` while a check-in waits, the session's `mode`,
  and its `endReason`. A mode never runs its own timer or loop.
- **`onEvent(event)`**, optional: `milestone.hour` so far (Release 3 adds record events).
- **`replay(surface, session, options)`**: on the results screen, a surface to draw into (`graphic`, the
  replay's own place on the card; `backdrop`, an empty layer behind the whole card; `lengthMs`, how long the
  replay runs; `scale`, the animation speed's multiplier), the finished session (its segments and mode
  spans), and the mode's options as they are when the results appear (the mode drawing the replay may never
  have been mounted: it is the mode shown longest).
- **`relayout()`**, optional: the font changed; measure again.
- **`unmount()`**: the mode is leaving; cancel its animations and empty its root.

## What a mode provides

| | What | How |
| --- | --- | --- |
| Running | The time and the mode's graphic. | DOM built in `mount`, updated in `render`. Anything that moves with time glides through one linear CSS animation set once a minute (paused or waiting for a check-in it holds; low power or reduced motion steps once a minute). Opening settings or any overlay never restarts, skips or jumps it. |
| Paused | The held display: the site blurs the whole display 10 px at 40 % and shows "paused for" over it. A mode may add pause effects (ocean life, shooting stars, comets) as pure CSS animations randomized once when the pause starts; nothing at all with reduced motion or low power. | The shared `TimeDisplay` (`modes/shared/time-display.ts`) draws the time and its held state. |
| Results replay | The replay graphic, drawn from one progress value, and anything behind the card. | `replay()` draws the final state; everything that moves is derived in CSS from `--replay-progress` (0 to 1), which the results screen animates. Anything else it animates (a crossfade, pings) it creates untimed, from the replay's start, and the results screen starts it with the replay or finishes it at once. The results element carries `data-replay="<id>"`, where the replay's stylesheet may set the card's text colours (`--color-foreground`, `--color-muted`). |
| Replay timing | Its own replay length and curve at normal speed. | `replayTiming` (`{ durationMs, easing }`, from the mode's config section). The results screen starts it at 0.5 s, adds the shared long-session extra (core, `replay.ts`) and scales it by the animation speed. |
| Replay layout | How the results card is laid out around the replay. | `replayLayout`: `strip` (a strip over the stats: digits, timeline), `ring` (rings beside the stats: ring, analog), `chart` (a profile chart over the stats: ocean depth, height) or `figure` (a drawing over the stats: tree). Decisions 302 and 316. |
| Options | Settings of its own (results landmarks, ocean life, the tree's view: `DisplayContext.options.treeView`). | Declared in the settings schema under display; shown in a box under the mode tiles while the mode is chosen; passed to `replay()` and in the context. |
| Art | Its creatures, landmarks and scenery. | Through the asset registry: keys declared in the manifest, drawn as placeholders until the mode's catalog registers them. |
| Size | Within its budget. | The size check fails the build past the budget. |

## Art

Art is data, never markup (plan, Architecture invariant 13). A catalog lists entries by key (`zone/name`,
lowercase with hyphens), each a viewBox and shapes of eight SVG kinds (`g`, `path`, `circle`, `ellipse`,
`rect`, `line`, `polyline`, `polygon`) with geometry attributes only (no colour, style, link, script or custom
property; `opacity` is allowed). Each shape names a tone; the mode's stylesheet maps every tone to a custom
property, so custom CSS can restyle the art. A catalog loads only with its mode and counts against the mode's
art budget. Art files live in their own folder with their own licence file, apart from the GPL code, so
commissioned art replaces placeholders file for file.

## CSS variables

What the site gives every mode, on `:root` (generated from the config module, so custom CSS can change them):

- Colours: `--color-background`, `--color-foreground`, `--color-accent`, `--color-muted`, `--color-faint`,
  `--color-track`, `--color-end`, `--color-pause`.
- Type: `--font-family`, `--font-weight-time`, `--font-stretch`, `--time-scale` (the time size setting).
- Motion: `--motion-scale` (the animation speed), `--motion-morph`, `--motion-fade`, `--motion-control`,
  `--ease-standard`, `--ease-spring`; on the results screen, `--replay-progress`.
- The held state: `--held-blur`, `--held-opacity`.

What a mode sets for itself, scoped to `.screen[data-mode="<id>"]` in its own generated token sheet
(`virtual:tokens/<id>.css`):

- `--mode-time-size`: the time's size at the reference frame (720 × 450), which the site scales.
- `--mode-gap`: the gap between the time and the controls.
- Its own sizes and colours, named after the mode (`--ring-*`, `--timeline-*`, `--analog-*`, `--ocean-*`,
  `--height-*`, `--meteor-*`, `--tree-*`; the tree's colours also on `[data-replay="tree"]`).

What a replay sets for itself, scoped to `[data-replay="<id>"]` (the results element, whichever mode is
showing): for the shared profile chart (ocean depth, height; decision 301), `--profile-*`, `--landmark-*`,
`--lit-*` and `--passing-*`, and the mode's own finale (`--ping-*`; `--horizon-*`, `--climb-*`).

A mode's stylesheet lives in the `mode` cascade layer, below custom CSS. It animates only `transform`,
`opacity` and `filter`; its sizes and colours come from tokens, never literals (the plan audit checks both).

## Community modes

Community display modes (plan, Releases: marketplace) use this same contract, preferably declaratively (data,
SVG art and CSS rather than free code), and run sandboxed like widgets.

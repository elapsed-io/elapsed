# Safety overview: Release 2, round 2.5 (Height)

Date: 2026-11-16 (overnight). Template: plan, Safety overviews > Round overview. Breakdown:
`docs/plan-release-2.md`, round 2.5; the owner's changes of the evening, items 5 to 9 and 14 to 16.

## 1. What changed

- **Height**, as the "height, full climb" frame: 140 m a focused minute, stopping at 100 km; the sky from the
  plan's light model, gliding a minute at a time on its own layer; the frame's stars fading in from 18 to 42 km
  (decision 303).
- **While paused**: the altitude line, and once stars are visible, shooting stars and a rare meteor shower, each
  drawn at random once per pause and moved by CSS alone; nothing with low power or reduced motion (305).
- **Its results**, as the "results: height (build this one)" frame: the climb profile, the card lit by the sky,
  stars and Earth's horizon as the climb rises, things falling past, up to six landmarks on the path (306).
- **The shared profile chart**: ocean depth's results replay rebuilt as one chart both modes draw (301); the
  display-mode contract gains `replayLayout` for every mode (302).
- **Its tile**, from the Release 2 display frame (307).

## 2. Data

Nothing new stored or sent. `height` is a new value of the existing `mode` setting. Height's results honour the
existing "results landmarks" setting. Choosing height downloads its script, stylesheet and star field from the
site itself (into its own mode cache, as every downloaded mode); its results art loads with its results.
`docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Stored setting `mode` = `height` | One of the schema's choices, else digits (the existing check). |
| A restored session in height | As every session: the stored record is validated whenever read; the altitude is computed from its focused time and capped at 100 km. |
| Height's art catalogs (the star fields, the things that pass) | Static data, checked by the asset registry when registered (eight SVG kinds, geometry attributes only). |

## 4. Dependencies

None added, runtime or development.

## 5. Security surface

Unchanged: no new endpoint, permission, storage key or header. The landmark catalog and the art are static data
in the package; every value reaches the page through the DOM and the CSSOM, never as markup or style
attributes. The meteors' random values are numbers and colours from the config module's own list.

## 6. Abuse cases

None new. A session restored far past 100 km still draws the sky at 100 km; a long one draws at most a 75 km
light strip on its results card (the window's strip stops where every colour is black).

## 7. Tests

- **Unit (559):** the climb rate and the stop at 100 km; the sky's and the lit card's colours exactly as the
  frames compute them; the layers of the atmosphere; the stars' fade; landmarks from the catalog, at most two
  per 10 km band, spread to at most six; text contrast over the sky (the time at least 3:1 everywhere; where
  the icons and paused labels pass pinned, decision 309); the shared landmark picking still gives ocean depth's
  results; the size check (height's code 12.5 KB of 30 KB, art 3.4 KB of 150 KB).
- **End to end (`e2e/height.spec.ts`):** the sky before a session, its glide each minute, the stars fading in,
  holding while paused, stepping with low power and reduced motion, stopping at 100 km; the palette, the icons
  dimmer while paused; the altitude line, the shooting stars and the shower (counts, sizes, colours, periods,
  one point within 3 s, CSS animations only, drawn once, gone on resume), none below 18 km, none with low
  power or reduced motion; the running frame at three heights and the paused frame (decision 304), with a
  control 1,000 m off; the results frame with and without landmarks; landmark rules and every dot on the path
  within 1 px at rest and zoomed; the card's stars and horizon following the replay and resting where the
  climb ended. Ocean depth's results tests pass unchanged on the shared chart; the settings display frame
  with the height tile.
- **Firefox and WebKit:** through the reference image.

## 8. Open risks and follow-ups

1. **Questions for the owner:** the paused frame against the light model (304), colours near the ground (309),
   landmarks above 25 km, and whether height gets its own options box (306).
2. **Art licences:** recorded in `packages/web/src/art/height/LICENSE.md` for every file; which licence the
   owner grants is still the owner's question.

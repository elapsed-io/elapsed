# Safety overview: Release 2, round 2.6 (Tree)

Date: 2026-11-16 (overnight). Template: plan, Safety overviews > Round overview. Breakdown:
`docs/plan-release-2.md`, round 2.6.

## 1. What changed

- **Tree**, as its frames draw it, side on and isometric: a year every focused hour, 15 minutes a season;
  leaves growing in spring, deepening in summer, turning and falling in autumn (each cluster offset by up to a
  quarter season), gone before winter, which brings snow to the branches and the ground; the isometric tree on
  its grassy field (decisions 311 to 313).
- **The tree's view** as a mode option in the settings schema (side by default); its control waits for a frame
  (314).
- **Its results**: the tree growing to full size at 60 focused minutes through the session's seasons, driven
  by the results' one progress value (315), in a new `figure` layout of the contract (316).
- **Its tile**, from the Release 2 display frame.

## 2. Data

One new stored choice, `treeView` (`side` or `isometric`) in `settings`, kept only on the device like every
setting; `tree` is a new value of `mode`. Nothing new is sent. Choosing the tree downloads its script,
stylesheet and the chosen view's drawing from the site itself. `docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Stored setting `treeView` | One of `side` and `isometric`, else side (the schema's field-by-field check). |
| Stored setting `mode` = `tree` | One of the schema's choices, else digits. |
| The tree's art catalogs | Static data, checked by the asset registry when registered (eight SVG kinds, geometry attributes only). |

## 4. Dependencies

None added, runtime or development.

## 5. Security surface

Unchanged: no new endpoint, permission, storage key or header. The drawing is static data drawn with the DOM,
never parsed as markup; its animations are opacity and transform only, and the results' formulas are CSS
custom properties set through the CSSOM.

## 6. Abuse cases

None new. A very long session only moves the tree's year round again (the year is a loop); the results tree
stops growing at full size.

## 7. Tests

- **Unit (567):** the season phase, each cluster's colour and presence exactly as the frames compute them, the
  stacked shares adding up to the frames' mix and to one, the weather and the grass, the results tree's growth;
  the schema offers the tree and its view; the plan audit (only opacity and transform animate, the replay driven
  by its one progress); the size check (the tree's code 6.0 KB of 30 KB, art 10.1 KB of 150 KB).
- **End to end (`e2e/tree.spec.ts`):** the year runs with the session (an hour long, endless, opacity and
  transform only), holds while paused, loops past an hour, and stands at each minute's start with low power or
  reduced motion; the isometric view as an option, loading only its own art; the side frame at four moments of
  the year and the isometric frame at three, with a control a season off; the results frame; the results tree
  at the start, halfway and the end of its replay; the settings display frame with the tree tile.
- **Firefox and WebKit:** through the reference image.

## 8. Open risks and follow-ups

1. **The tree's view control** waits for the owner (question 8).
2. **Art licence:** recorded in `packages/web/src/art/tree/LICENSE.md`; which licence the owner grants is still
   the owner's question.
3. **Cost of the year:** about 420 animations, changing the drawing once a second; to watch on low-end phones
   in the test run (low power stops them).

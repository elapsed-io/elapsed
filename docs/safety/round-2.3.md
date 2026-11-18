# Safety overview: Release 2, round 2.3 (Ocean depth)

Date: 2026-11-16 (overnight). Template: plan, Safety overviews > Round overview. Breakdown:
`docs/plan-release-2.md`, round 2.3, with the owner's changes of the evening (plan version 6, items 4 to 9).

## 1. What changed

- **Ocean depth**, a downloaded mode, drawn as the ocean frames: 15 m a focused minute to 10,935 m, the water
  from the plan's light model (a stop every metre) from 6 m above the depth to 6 m below and never above the
  surface, gliding on the compositor and stepping once a minute under low power or reduced motion; the time,
  icons and buttons in the frames' colours over it (decisions 292, 295).
- **Its results**, as the new "results: ocean depth (build this one)" frame: a card lit by the depth the replay
  has reached, the chart zooming out as the dive deepens, the depth counting up, up to six landmarks with dots
  on the path and labels that pop in, fade and return on hover, focus or a tap, things rising past, and two
  sonar pings at the end (decisions 293, 297).
- **The display-mode contract**: replays draw into a surface (their graphic and a backdrop behind the card),
  documented with the rest of the contract in `docs/display-mode-contract.md` (decisions 290, 291).
- **Settings:** the ocean depth tile, and the "ocean depth options" box with "results landmarks" (decision 296).
- **Placeholder art** in its own folder with its own licence file, outside the GPL (decision 297).
- **Tests:** two intermittent races in round 2.2's suite fixed in the tests (decisions 280, 281); held glides
  frozen as static style in Chromium (decision 294).

## 2. Data

One new stored choice, `resultsLandmarks` (true or false) in `settings`, kept only on the device like every
setting. Nothing new is sent. Showing ocean depth downloads its script and stylesheet once into
`timer-offline-mode-ocean`; its results replay and art load when results first show. The landmarks are picked
with `Math.random` each time the results are drawn and never stored. `docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Stored setting `resultsLandmarks` | A boolean, else its default (on); the schema's field-by-field migration. |
| Stored setting `mode: "ocean"` | One of the schema's choices, else digits (unchanged rule; tested with `sundial`, a path and non-strings). |
| The art catalog | Static data, checked by the asset registry when registered (eight SVG kinds, geometry attributes only, no colour, link, script or custom property). |

## 4. Dependencies

None added, runtime or development.

## 5. Security surface

Unchanged: no new endpoint, permission, storage key or header. The landmark catalog is static data in the
config and brand modules; the art catalog is static data drawn through the asset registry with the DOM, never
parsed as markup. Positions, colours and the replay's expressions are set through the CSSOM, never as style
attributes, under the existing CSP. The tile's gradient has an id made unique in the page.

## 6. Abuse cases

None new: the mode and its replay read only the session's own times. The chart takes keyboard focus and a
tap only to show its own labels.

## 7. Tests

- **Unit (552):** the light model against the plan's formula; the dimmed card light (black past about
  340 m); contrast of the ocean text over the water at every depth, the icons from 6 m down, and the button
  labels on their fills; landmarks one or two per band from the catalog, at most six and spread along the
  path; the schema offers ocean depth and results landmarks; the plan audit; the size check counts art
  catalogs and replays.
- **End to end (Chromium reference):** the running frame at 90 m and the "0 to 20 m" frame at 5, 10 and 20 m,
  within the measured levels, with a control 15 m off; the results frame exactly, without landmarks and with
  the ones the site picked once their labels faded; at most six landmarks, two per band, from the catalog,
  only where the dive went; every dot on the path within 1 px, at rest and while the chart zooms; labels
  fading after the replay and returning on hover, focus and a tap, a hovered dot showing only its own, and
  listed for screen readers; the card opening in the end colour and crossing to the surface's, the pings
  timed to the replay's end; the replay held midway (the zone so far, the count on the final baseline, the
  zoom); reduced motion; the water before a session, gliding 15 m a minute, stretching from the surface,
  holding while paused, stepping with low power and reduced motion, and still at 10,935 m; the ocean colours;
  the ocean tile and the options box against the Release 2 display frame; the options box only for ocean
  depth, its switch stored, found by search.
- **Firefox and WebKit:** through the reference image.

## 8. Open risks and follow-ups

1. **For the owner:** the corner icons' frame colour is below 3:1 over the water in the first 5.3 m
   (2.39:1 at the surface); from 6 m down it passes, as do the time and the button labels everywhere.
2. **For the owner:** which licence the placeholder (and later the commissioned) art carries.
3. **Near the surface** the water differs from the frames' two-stop gradient by up to 10 levels at 5 m
   (decision 295); invisible side by side, but measured.
4. **The sonar pings** are scaled rings on the compositor, so a ring's line is thinner while it is small
   (decision 293); the frame keeps it at 1.5 px throughout.

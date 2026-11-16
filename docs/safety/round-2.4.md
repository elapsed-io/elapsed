# Safety overview: Release 2, round 2.4 (Ocean life)

Date: 2026-11-16 (overnight). Template: plan, Safety overviews > Round overview. Breakdown:
`docs/plan-release-2.md`, round 2.4.

## 1. What changed

- **Ocean life**, as the "ocean depth, paused" frame draws it: while a session is paused, bubbles rise and
  three schools of the canvas's placeholder fish swim across at three distances, fading in over 6 s, and
  leave when the timer resumes. CSS animations alone, set once per pause (decision 298).
- **One catalog per depth zone**, each its own chunk loaded only when a pause there shows it.
- **The "ocean life" option** in the "ocean depth options" box, on by default, as the Release 2 display frame
  draws it.
- **The display-mode contract** carries the modes' options in the running context (decision 299).

## 2. Data

One new stored choice, `oceanLife` (true or false) in `settings`, kept only on the device like every
setting. Nothing new is sent. A pause in ocean depth downloads one zone's life art (under 1 KB) once, from
the site itself. `docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Stored setting `oceanLife` | A boolean, else its default (on); the schema's field-by-field migration. |
| The life catalogs | Static data, checked by the asset registry when registered (eight SVG kinds, geometry attributes only). |

## 4. Dependencies

None added, runtime or development.

## 5. Security surface

Unchanged: no new endpoint, permission, storage key or header. The art is static data drawn through the
asset registry with the DOM, never parsed as markup; positions and timings are set through the CSSOM.

## 6. Abuse cases

None new.

## 7. Tests

- **Unit (552):** the schema offers ocean life; the plan audit (only transform and opacity animate; numbers
  in the config module; the keyframes generated from it); the size check counts every zone's catalog against
  the mode's art budget (1.2 KB of 150 KB).
- **End to end (Chromium reference):** the paused frame at 10 s into the pause, within the measured edge
  noise, and a control a second off that fails by far; life arrives on pause and leaves on resume; at 90 m
  only the sunlight zone's catalog loads and every drawn key is that zone's; at 300 m only the twilight
  zone's; only CSS animations move it; with the option off, low power or reduced motion nothing comes and
  nothing loads; turning the option on and off while paused brings it and takes it away; the options box
  with both rows against the Release 2 display frame.
- **Firefox and WebKit:** through the reference image.

## 8. Open risks and follow-ups

1. **Art licences:** recorded in `packages/web/src/art/ocean/LICENSE.md` for every file; which licence the
   owner grants is still the owner's question.
2. **Accurate to the depth:** every zone draws the same placeholder fish until the commissioned art gives each
   zone its own creatures, file for file.
3. **Layers:** each fish and bubble moves on its own small composited layers (about 75 while paused); measured
   smooth in the reference image, and absent with low power.

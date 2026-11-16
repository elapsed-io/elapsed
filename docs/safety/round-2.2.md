# Safety overview: Release 2, round 2.2 (Analog stopwatch)

Date: 2026-11-16 (overnight). Template: plan, Safety overviews > Round overview. Breakdown:
`docs/plan-release-2.md`, round 2.2.

## 1. What changed

- **Analog stopwatch**, a downloaded mode, drawn as the analog frame: the frame's dial (crown, minute and
  five-minute ticks, labels every 5 minutes, the hours subdial) and its two hands. While a session runs the
  minute hand glides 6° a minute and the hours hand 0.5°, on the compositor, anchored once a minute; held,
  they stay where they reached; under low power or reduced motion they step once a minute. The frame shows no
  digits: the time stays in the page for screen readers, and the dial shows the focus ring when the time has
  keyboard focus. Its replay is the ring replay ("results: analog and ring").
- **The mode tiles** have four columns (the Release 2 display frame), with the analog tile and its preview icon.
- **Round 2.1 follow-up:** the seconds' slide never jumps when settings open (decision 277).

## 2. Data

Nothing new is stored or sent. The display mode setting may now hold `analog`. Showing analog downloads its
script and stylesheet once and keeps them in `timer-offline-mode-analog` (round 2.1's downloaded modes).
`docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Stored setting `mode: "analog"` | One of the schema's choices, else digits (unchanged rule; tested with `Analog`, `sundial`, a path and non-strings). |

## 4. Dependencies

None added, runtime or development.

## 5. Security surface

Unchanged: no new endpoint, permission, storage key or header. The analog drawing is built with the DOM from
fixed numbers in the config module; its only text is the labels' numbers and the brand's "hours". The hands
turn by CSSOM transforms and Web Animations, as the ring and timeline do; no inline style attribute.

## 6. Abuse cases

None new: the mode reads only the session's focused time.

## 7. Tests

- **Unit (541):** the schema offers analog; the manifests list it as a downloaded mode with the standard
  budget; its tokens are in the plan audit's stylesheet checks (no stray numbers; only transform, opacity and
  filter animate).
- **End to end (Chromium):** the analog frame at 1 h 24 min with the glides frozen at the frame's moment
  (within 300 anti-aliased pixels, smoothed delta within 32) and a control that hands 3° off fail; the analog
  results match the "results: analog and ring" frame exactly; the hands glide 6° and 0.5° a minute on their
  own layers and re-anchor each minute; they hold while paused and glide on; they step with low power and with
  reduced motion; the time is readable on request and not shown; the analog tile matches the Release 2 display
  frame's in graphite and paper; the display panel with four columns; a stored "analog" now shows analog; the
  seconds' slide with settings open (real time, and frozen across 10 s and 60 s).
- **Firefox and WebKit:** through the reference image.

## 8. Open risks and follow-ups

1. **For the owner:** the hours hand glides (42° at 1 h 24 min) where the frame draws the whole hour (30°);
   see `docs/questions-overnight.md`.
2. **Hands in their own drawings:** each hand is an SVG covering the dial, so the compositor holds two
   dial-sized layers while a session runs. They are transparent but for the line; the memory is a few hundred
   kilobytes at most on a large screen.

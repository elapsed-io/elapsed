# Safety overview: Release 2, round 2.8 (Focus view, notices and fullscreen)

Date: 2026-11-17. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.8; owner, changes 5.

## 1. What changed

- **Focus view:** while a session runs and the page has been left untouched (3 s by default), pause and end step
  aside, the corner icons fade, the pointer hides and the time grows; any touch brings everything back at once
  (decisions 339 to 341).
- **Notices:** one pill above the time with a dismiss ×, and one universal "change" link; the first notice is the
  fullscreen tip on the idle screen (342).
- **Settings:** a "focus view" group in display: hide controls while focusing, fullscreen when a session starts,
  leave fullscreen (343).
- **The analog stopwatch redrawn** as its new frame, with a crown that dips when end is pressed and a seconds dial;
  five optional recipe fields for it (344, 345).
- **Ambient idle screens** and a 2-second crossfade on any change of environment (346); the Release 2 display
  frame compared whole (347); results replays that never stall (348).
- **Recipe versioning** decided by the owner (338).

## 2. Data

Three new stored choices in `settings` (`focusHide`: 3 s, 10 s or never; `fullscreenOnStart`: on or off;
`leaveFullscreen`: never, on pause or end, or on end), kept only on the device like every setting. One new local
storage record, `notices`, `{"schema":1,"dismissed":["fullscreen"]}`: the ids of dismissed notices and nothing
else, written only once a notice is dismissed or its "change" used, never synced, removed by clear device data.
Nothing new is sent. `docs/data-inventory.md` is updated.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| `notices` record (read back from local storage, so untrusted) | Exactly the keys `schema` and `dismissed`, schema 1, at most 64 ids, each a lowercase word of at most 32 letters, digits and hyphens; anything else reads as nothing dismissed, so a damaged record can only bring a notice back. Writing refuses an id of any other shape. |
| The three new settings | Through the settings schema like every setting: fixed choices or a switch; a stored value outside them reads as the default. |
| Recipe fields `theme.red`, `tail`, `batons`, `ticks`, `topColor` | The schema: a colour token or hex value (no `url()`), and numbers within bounds (a tail 0 to 200, 0 to 60 batons, 0 to 120 ticks); unknown fields are still refused. |
| Pointer, key, touch and wheel events | The focus view only notes when the last one came; it never reads what was pressed, and listens passively, so it cannot stop a key's own job. |

| Built-in recipes | Checked by the full loader when the site is built: a refused one stops the build (decision 350); the site loads them already checked and frozen. Any other recipe is still checked when it loads. |

## 4. Dependencies

None added, runtime or development.

## 5. Security surface

- **Fullscreen:** asked for only inside the start press, when the user has switched it on; left as the setting
  says; Esc is the browser's own and always leaves. No other permission is requested. Where the page cannot go
  fullscreen (iPhones) nothing asks for it and the settings do not offer it.
- **No new endpoint, header or permission.** The pill and the new settings rows are built with the DOM; the
  notice text comes from the brand module and reaches the page through a text node.
- **Startup code:** the recipe checker and its schema no longer load with the page (its own recipes were checked
  when it was built), which takes core JavaScript from 51.9 KB back to 44.6 KB of its 50 KB.
- **Timers:** the focus view adds no timer of its own; it waits on the engine's one shared timer, and nothing at
  all while the tab is hidden (340), so a background tab still wakes only for the heartbeat.

## 6. Abuse cases

- A page left running in focus view hides the controls, but never their keys: Space and E still pause and end, and
  any touch brings the controls back. Hidden controls take no presses, so a stray tap cannot end a session.
- A damaged or hostile `notices` record can only bring the tip back (3).
- A hostile recipe (later, when users can load them) gains nothing from the new fields: they are numbers and
  colour tokens, checked as before; the batons' and numbers' crowding rule only removes marks.

## 7. Tests

- **Results:** `npm run check` (736 unit tests; core JavaScript 44.6 KB of 50 KB); the reference image in Chromium,
  Firefox and WebKit: 936 passed, 18 skipped as declared, 0 failed.
- **Unit:** the settings schema with the three new choices; the theme's dial red (each preset meets 4.5:1 on the
  small dial); the recipe checks with the redesigned analog; the plan audit (only transforms and opacity animate,
  no literal sizes or times in stylesheets) and the size check.
- **End to end (Chromium, Firefox and WebKit):** the focus frames ("running, untouched" and "running, recently
  touched") and the motion's durations and easings; keys from the focus view; paused and check-in screens keeping
  their controls; the three focus settings; settings open over a running session; fullscreen entered and left as
  each choice says, and never unasked; the notice frame and the "change opens settings on it" frame; the pill not
  moving the time; dismissal holding across a reload and cleared by clear device data; no tip and no fullscreen
  rows without page fullscreen; the redesigned analog frame (with a control), its hands' glides, the seconds hand
  at rest when seconds never show, and the crown's dip; ambient idle screens and the environment crossfade; the
  Release 2 display frame whole; every results replay stepped through its own time frame by frame (never back, never stalled).

## 8. Open risks and follow-ups

1. **Questions for the owner** (`docs/questions-overnight.md`): the crown's dip on E, which the countdown hides at
   once; the dial red on the eight presets where the plan's red falls short of 4.5:1; whether figure modes grow
   whole in focus view; whether a hidden control should also take the tap that reveals it; re-entering fullscreen
   on resume; the seconds hand when seconds never show; the 2-second outline after "change"; the 13 px slip in the
   focus frames.
2. **Picture-in-picture** appears in the display frames and arrives in round 2.11; the interstellar tile and its
   note in round 2.9.
3. **The e2e suite keeps pages touched** (`e2e/test.ts`): a test that means to watch the focus view must say so
   (`test.use({ awake: false })`).

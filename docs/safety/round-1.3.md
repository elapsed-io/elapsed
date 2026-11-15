# Safety overview: Release 1, round 3 (Default screen)

Date: 2026-11-15. Template: plan, Safety overviews > Round overview.

## 1. What changed

The site now runs. A composition root (`packages/web/src/app.ts`) builds the round 2 engine with the
browser's clock, mounts the chosen display mode through the plan's display-mode contract, and connects
the controls, keyboard shortcuts and tab title through the event bus. Three modes exist: digits (bundled)
and ring and timeline (separate chunks downloaded only when chosen, for now with a temporary `?mode=`
parameter that accepts only known names). Start morphs into pause while end fades in; pause shows the
held, blurred time with "paused for" and the pause length; resume and end work, and end returns to idle
until round 5. The seconds blur away as in the running frame, drawn with CSS keyframes generated from
the plan's formulas and pinned to focused time by script. Space starts, pauses and resumes; E ends. The
tab title shows the elapsed time or pause length in hh:mm. Every screen built this round is compared
with its design frame pixel by pixel in Chromium.

## 2. Data

None newly stored or sent. The running session lives in page memory and is lost on refresh until round 4.
`document.title` now shows the elapsed or paused time (hh:mm) and the product name; it stays in the
browser's tab and history and is not sent anywhere by the site. A visit makes four same-origin requests
(page, script, stylesheet, font); ring or timeline adds that mode's script and stylesheet.
`docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| `?mode=` URL parameter | Compared exactly against the manifest ids (`digits`, `ring`, `timeline`); anything else, including other cases, path fragments, encoded markup and `__proto__`, falls back to digits. The value is never written into the page. Removed in round 6. |
| Pointer clicks on the buttons | Mapped to engine commands, which ignore commands that do not apply (a double click is harmless). |
| Keyboard | Only bare Space and E act; modifiers, held-down repeats, composition, typing in fields and editable content are ignored; Space on a focused button is left to the button so it acts once. |
| Font measurements | Widths from `getBoundingClientRect`, converted to em and set with `style.setProperty` (allowed by the CSP); a zero or invalid font size skips the measurement. |

## 4. Dependencies

None added. No runtime dependencies; no new development dependencies. The site's own JavaScript is
8.9 KB compressed; each lazy mode is about 1.2 KB of code and no art.

## 5. Security surface

No CSP or header changes; the page now runs script under the existing policy with no violations (tested).
DOM is built only with `createElement`, `createElementNS`, `setAttribute` and `textContent`; nothing parses
markup, so Trusted Types never has anything to block. Lazy modes load same-origin chunks and stylesheets.
No storage keys, cookies, endpoints or authentication. Lint additionally bans `setAttribute('style', …)`.

## 6. Abuse cases

| Abuse case | Defence |
| --- | --- |
| A crafted `?mode=` value to load an unexpected module or inject markup | Exact match against a fixed list; the registry imports only its own three modules; the value is never rendered. Tested with eight hostile values. |
| A crafted link that opens the site already running or ended | No URL parameter starts or ends anything; only the mode is read. |
| Script injection through the new DOM code | No markup strings anywhere; lint bans every HTML sink and style attributes; Trusted Types enforced. Browser tests confirm no CSP violations while running, pausing and switching modes. |
| Keyboard shortcuts firing while the user types elsewhere on the page (later: settings search, widgets) | Shortcuts never fire in inputs, text areas, selects or editable content. Tested. |
| A double action from Space on a focused button | The global handler leaves Space to focused buttons. Tested. |
| Rapid clicking to confuse the morph | Running transitions are cancelled and restarted from where the elements are; commands that do not apply do nothing. |
| A shared page or screen showing private information in the tab title | The title holds only a duration and the product name. |

## 7. Tests

Unit tests (35 new, 284 in total): shortcut decisions for every key, modifier, target and state; tab
titles for idle, running and paused; the mode parameter against valid and hostile values; mode manifests
and budgets; the generated blur-away keyframes (curves, percentages, reduced-motion cuts, and a check that
every keyframe animates only transform, opacity or filter); per-mode token values; per-package size
measurement; the new lint rule.

Browser tests (33 new, 43 in total), against the production build under the real CSP with a controlled
clock:

- **Frames**: running at eight moments across both blur-away windows (allowing only edge anti-aliasing),
  running after a minute and paused (exactly identical), ring and timeline at 01:24. A 1 px change to the
  digits or ring gap fails the comparisons.
- **Idle**: still identical to the idle frame, now also with JavaScript disabled; headers, CSP and Trusted
  Types; four requests and no mode chunk for digits.
- **Session**: start, pause, resume and end by pointer, with the time, pause length, accessible names, focus
  and tab title at each step; Space and E; Space on a focused button; modifiers, held keys and typing
  ignored; the row slides as end fades in, and end only fades; reduced motion cuts instead of blurring; a
  device clock set back mid-session loses no time.
- **Modes**: ring and timeline load only when asked for; hostile `?mode=` values show digits; the ring tail
  grows in and is whole after ten minutes; motion holds while paused.

## 8. Open risks and follow-ups

1. **The `?mode=` parameter must be removed in round 6** together with adding the display mode setting
   (decision 59).
2. **Flash of digits before ring or timeline.** With `?mode=`, the static digits screen paints before the
   mode's chunk loads. Temporary, like the parameter; round 6's stored setting faces the same question
   and should decide whether to delay first paint.
3. **"paused for" width.** The paused frame sets this label at width 100; the site draws it at 92 per
   decision 4 (decision 66). The owner may want the frame updated.
4. **Phones.** Ring and timeline scale with the window like the time, so on a 390 px phone the timeline's
   labels are about 6 px. Phone layouts are Release 2 (layouts per screen size).
5. **Reduced motion for ring and timeline.** They keep their very slow motion; round 8's accessibility pass
   should decide (decision 69).
6. **Accessibility pass (round 8).** Focus styles are the browser's; the time is read as digits and colons;
   while paused the held time is hidden from assistive technology and the pause length is exposed. Time
   announcements are a setting in round 6 and the accessibility review is round 8.
7. **Cross-browser.** Browser tests run in Chromium. Firefox and Safari support everything used
   (`getAnimations`, pinning CSS animation times, the `translate` property, `dvh`),
   but round 8's cross-browser checks must confirm the blur-away and the morph render the same.
8. **Unsaved sessions.** A refresh loses the running session until round 4 adds storage, replay on wake and
   multi-tab coordination.

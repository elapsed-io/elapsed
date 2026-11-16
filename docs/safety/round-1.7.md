# Safety overview: Release 1, round 7 (Custom CSS)

Date: 2026-11-16. Template: plan, Safety overviews > Round overview.

## 1. What changed

The settings panel has its sixth category, advanced, built from the advanced frame. It holds a custom CSS
editor (IBM Plex Mono, line numbers, comments drawn muted) whose "save" cleans the CSS with the browser's
parser and the allowlist from `core`, keeps it on this device only, and applies it to the timer view
through a constructed stylesheet in the `user` cascade layer, scoped to the view. It also holds "restart
in safe mode" (and `?safe`), which loads once without custom CSS; a settings file to export and import
(every choice and the custom CSS; fonts and images stay on the device); and "reset all settings". Reset
all and clear device data now ask first with the inline confirm step drawn in the frame. The timer view is
wrapped in an isolated stacking context, so custom CSS can never draw over the panel. The stable class
names and CSS variables are published in `docs/custom-css.md`. The panel matches all six settings frames,
pixel for pixel.

## 2. Data

| What | Where | Kept |
| --- | --- | --- |
| Custom CSS, as cleaned when saved (`{"schema":1,"css":"…"}`, at most 50 KB) | Local storage `custom-css`, apart from `settings`; never sent anywhere | Until changed, emptied, or device data is cleared (reset all keeps it) |
| The settings file (every choice and the custom CSS) | Downloaded by the browser when the user presses export; read from a file the user picks on import | The user's own file; nothing is sent |
| The custom CSS editor's script and its font (IBM Plex Mono 400) | Fetched from the site's own address the first time advanced opens | In the offline cache, like any site file |

Nothing new reaches a server. `docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Custom CSS typed in the editor | Refused over 50 KB (UTF-8), not cut. Parsed by the browser into a constructed stylesheet, which never loads anything; rules walked with the allowlist in `core`: only style rules and `@media`, `@supports`, `@container`, `@layer`, `@keyframes`, `@scope` and `@starting-style` are kept; a declaration is dropped if its value names a `url()` other than a PNG, JPEG, GIF, WebP or AVIF data image of at most 8 KB, uses `image()`, `image-set()`, `cross-fade()`, `element()`, `src()` or `expression()`, holds an at-keyword, or is `behavior` or `-moz-binding`. The text itself is also read by the `core` tokenizer (escapes undone, comments and strings skipped), so what the parser silently skips is not kept as text either. |
| Stored custom CSS | Exact record shape, schema 1 and the size cap; anything else reads as none. Applied without the checker (it was cleaned when saved); each rule is inserted into the scope by itself, so text cannot close the scope early. |
| A settings file | At most 256 KB before reading; JSON with `app` "elapsed", `kind` "settings" and `version` 1, else refused; choices read field by field as stored settings are (an invalid one takes its default); custom CSS size-checked and cleaned exactly as a save; a font file choice is kept only if this device holds one. A refusal changes nothing. |
| `?safe` | Presence only; removed from the address at once. |

## 4. Dependencies

None added, runtime or development. IBM Plex Mono's 400 file was already in the repository (round 6).

The first visit's JavaScript is 29.9 KB (budget 50 KB; 28.5 KB before): the applier, the store, safe mode
and the new copy. The checker is not in it: it loads only with the editor, as the plan asks (decision 192).
The panel loads on first use (7.3 KB of script, 3.4 KB of styles, compressed); the editor and its checker
load when advanced first opens (3.3 KB compressed) with one 17.5 KB font file.

## 5. Security surface

- **CSP and headers:** unchanged. Custom CSS is a constructed stylesheet (Chromium: no violation under
  `style-src 'self'`, tested; Firefox and Safari in round 8's cross-browser pass, decision 194). The export
  is a blob download; nothing in the advanced category causes a CSP violation (tested).
- **New storage key:** local storage `custom-css`.
- **No new endpoints, no authentication changes.**
- **Page structure:** the timer view is wrapped in `.view`, isolated as one stacking context; its display,
  isolation and stacking level are important declarations in the base layer, which custom CSS in the
  later `user` layer cannot override.

## 6. Abuse cases

| Abuse case | Defence |
| --- | --- |
| Data theft through `url()`, `@import` or `@font-face`, including attribute selectors that read the page | Every `url()` but a small data image, and every such at-rule, is removed when saved; the CSP blocks other origins even if one got through (control test). |
| Same-origin requests (allowed by the CSP for images) used to probe or count | Removed by the checker; a control test shows the corpus would catch a checker that stopped working. |
| Escaped or disguised names (`@\69mport`, `\75 rl(`, `b\61 ckground`) | The browser's parser and the `core` tokenizer both undo escapes before checking. |
| Text the parser skips (an `@import` in a constructed sheet, an invalid declaration holding a URL) | The text is scanned too; anything flagged makes the CSS rebuilt from what the parser kept. |
| Breaking out of the scope (`} } .settings { … }`), or styling the panel through `:root`, `body` or nested `@scope` | Each rule is inserted into the scope separately; the panel, `html` and `body` are outside it. |
| Interface spoofing or lockout: covering the panel, hiding the controls | The timer view is one isolated stacking context, locked against custom CSS; the comma key opens settings when the icon is hidden; safe mode (`?safe` or its button) loads once without custom CSS. |
| Script through CSS (`expression()`, `behavior`, `-moz-binding`, `javascript:` URLs, markup in the CSS) | Removed, and inert in current browsers; the CSS is only ever a textarea value, `textContent` or a stylesheet, never HTML. |
| Resource abuse: huge or pathological CSS | 50 KB cap, refused rather than cut; a settings file is capped at 256 KB before it is read. |
| A hostile settings file | Kind and version checked, choices validated field by field, CSS cleaned as if typed; refusals change nothing. |
| Losing custom CSS by accident | Reset all keeps it; clear device data asks first and says plainly that custom CSS, fonts and images go. |

## 7. Tests

Unit tests (29 new, 498 in total): the custom CSS rules and tokenizer (escapes, comments, strings, bad
strings and URLs, numbers and hash tokens, every blocked at-rule, function and URL, data image sizes), the
declaration splitter, the declaration check, the settings file (round trip, field-by-field reading,
refusals, size limits), the stored record, the safe-mode address and the editor's comment drawing.

Browser tests (17 new), against the production build under the real CSP:

- **Frames:** the advanced frame (its CSS typed, reset all's confirm step open), 0 differing pixels; the
  other five settings frames now keep the advanced row and still match exactly.
- **The malicious-CSS corpus:** 43 hostile inputs saved through the editor, each leaving no request (none
  even attempted), no CSP violation, nothing stored that names a resource or a blocked rule, no script run,
  and the panel usable on top; plus two control tests with CSS written straight into storage.
- **Behaviour:** custom CSS applies only on save, only to the timer view, survives a reload, reaches another
  tab and is removed by saving an empty editor; cleaning keeps clean text exactly and says when it removed
  something; over 50 KB is refused; the editor and checker load only when advanced opens, with one font
  file; typing never triggers shortcuts; lockout and safe mode, `?safe` once, a session kept across the
  restart; export and import (refusals, defaults, cleaning, fonts); reset all and clear device data, with
  cancel, Escape and confirm; no CSP violation.
- **Updated:** clear device data now goes through its confirm step; phones list six categories.

## 8. Open risks and follow-ups

1. **Questions for the owner:** the "reset all settings" row before its confirm step is not drawn; it
   follows privacy's "clear device data" row (decision 198). Import replaces this device's custom CSS with
   the file's without a separate confirm step (decision 200). Both are easy to change.
2. **Cross-browser:** constructed stylesheets under the CSP, `@scope`, the important locks on `.view` and
   the editor's transparent textarea are tested in Chromium only; round 8 checks Firefox and Safari and
   records the results in the decisions log (plan, defence 3).
3. **Tampered storage:** stored CSS is applied without the checker, as the plan asks. CSS written into
   storage by something other than the editor could still fetch same-origin images (the CSP allows
   `img-src 'self'`); doing so needs script access to the site or the device already.
4. **Keyframe names:** custom `@keyframes` share the page's keyframe names; one can replace an animation
   the timer view uses (for example while a chosen font loads). It affects only the timer view, and safe
   mode undoes it.
5. **Imported images (defence 10) and custom layouts** arrive in Release 2; safe mode will turn layouts off
   too.
6. **Accessibility pass (round 8):** the editor is a labelled textarea, Tab leaves it, and the confirm step
   moves focus; screen-reader wording of the step is reviewed then.

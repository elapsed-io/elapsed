# Safety overview: Release 1, round 6 (Settings and themes)

Date: 2026-11-16. Template: plan, Safety overviews > Round overview.

## 1. What changed

The product is now elapsed, at elapsed.io (the domain is not attached yet), and the plan is the owner's
new elapsed plan. The settings panel opens over the timer from the settings icon or the comma key, built
from the five Release 1 settings frames: timer (seconds, check-in interval, pause limit, shortcuts),
display (mode tiles with previews), appearance (ten theme cards, theme colours, a grid of thirteen fonts
plus your own font file, time size, clock format), notifications (check-ins, pause limit) and privacy and
data (usage counts, crash reports, storage on this device, clear device data), with search, a reset at the
end of each category, a "saved" check after each change and the footer. Every change applies live, is
saved on the device, and reaches other open tabs. On phones each category is its own page. Settings live
in a versioned schema in `core`; the user's own font file is kept apart from them, on the device only.
System notifications can announce check-ins and a pause about to end a session, and opt-in crash reports
go to a second route on the site's own endpoint. Lexend is not offered: it lacks tabular figures. The
panel matches all five frames, and the idle and results screens match their paper-theme frames, pixel for
pixel.

## 2. Data

| What | Where | Kept |
| --- | --- | --- |
| The user's choices (`settings`) | Local storage, only once a setting differs from its default | Until changed back, reset, or device data is cleared |
| The user's own font file (format and bytes, not its name) | IndexedDB `media`, created only when a file is loaded | Until replaced or device data is cleared; never uploaded |
| The check-in interval in force | Inside `timer.active` (schema 2) | As long as the session is open |
| Crash reports: scrubbed message and stack, build, browser family and major version | Sent to `POST /api/crash` only while crash reports are on; D1 table `crash_reports` with the UTC day | Deleted 14 days later |
| The sender's IP address | The endpoint's memory only, as a salted SHA-256 hash, to allow 5 reports a minute | One minute; never stored or logged |
| Notifications | Shown by the device when switched on and allowed; nothing stored or sent | — |
| Built-in fonts | Fetched from the site's own address when chosen (name previews when appearance opens) | In the offline cache, like any site file |

Usage counts now stop when switched off. `docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Stored settings | Capped at 16,384 characters, parsed, read field by field against the schema in `core`; a missing or invalid field takes its default, unknown fields are dropped. |
| Settings from another tab | The same read, on the storage event. |
| Panel controls | Each change goes through `withSetting`, which refuses values outside the schema (options, ranges and steps). |
| Hex colour fields | `#rgb` or `#rrggbb` only; anything else returns to the colour in use. |
| Your own font file | Size checked before reading (at most 2 MiB); format from its first bytes (woff2, woff, ttf, otf; collections refused); loaded from bytes so the browser's font sanitiser checks it; refused files are not stored. |
| The stored font record | Exact fields, schema, size and signature re-checked; anything else is deleted. |
| Active state schema 1 | Migrated to schema 2 with the interval unset. |
| Crash report bodies (endpoint) | Same-origin, JSON, at most 8 KB (declared and read), exact fields and types, lengths capped, re-scrubbed with the request's origin; 5 a minute per address. |
| Notification permission | Asked only when a notification switch is turned on. |

## 4. Dependencies

None added, runtime or development. New font files (all SIL Open Font License 1.1, license files kept
byte for byte): Barlow Semi Condensed, Saira, Inter, Space Grotesk, Sora, Manrope, Outfit, JetBrains Mono,
Roboto Mono and DM Mono from Google Fonts' repository at a pinned commit, trimmed and renamed; IBM Plex
Sans and Mono from IBM's npm packages (`@ibm/plex-sans` 1.1.0, `@ibm/plex-mono` 2.5.0), unmodified. They
are built by a committed developer script (fontTools 4.68.0 and brotli 1.2.1, as for Archivo), never
by CI. Sizes: full fonts 13 to 43 KB each, downloaded only when chosen; name previews 19 KB in all.

The core is 28.5 KB of JavaScript (budget 50 KB; 17.8 KB before) and 55.5 KB in total (budget 150 KB):
settings, theme derivation, the font registry and the stores now ship with the first visit. The panel
loads on first use: 5.6 KB of script and 2.9 KB of styles.

## 5. Security surface

- **CSP and headers:** unchanged. The appearance is one constructed stylesheet (no inline styles); fonts
  load from the site's own files or from bytes; the panel, fonts, own font and crash reports run with no
  CSP violation (tested).
- **New storage keys:** local storage `settings`; IndexedDB database `media` (store `files`, key `font`).
  Active state schema 2.
- **New endpoint:** `POST /api/crash`, with a daily scheduled deletion; the database binding is `DB` and
  the Worker is named `elapsed`.
- **Service worker:** precaches only what the first visit loads; handles notification clicks (focuses or
  opens the site).
- **No authentication changes.** The repository test now also fails if the private admin address appears
  anywhere in it.

## 6. Abuse cases

| Abuse case | Defence |
| --- | --- |
| Tampered settings (huge text, markup, out-of-range values) | Size cap, field-by-field validation; values are only ever set through CSS custom properties built from validated data, and text through `textContent`. |
| A hostile font file (an SVG, a script, a decompression bomb, a malformed table) | 2 MiB cap before reading, signature check, the browser's font sanitiser; refused files are not stored; nothing is fetched from a URL the file names. |
| A settings change that costs the user focused time | The check-in interval is fixed at each sign of presence, so shortening it never triggers a missed check-in (tested). |
| A hard-to-read font or colours locking the user out | The panel stays in the default font; reset buttons and clear device data restore defaults; custom colours affect the timer view's theme only. |
| Crash reports carrying personal data | Query strings, fragments, other origins' addresses (browser extensions) and every quoted string removed on the device and again on the endpoint; nothing typed is quoted into errors by the site's own code. |
| Flooding the crash table | At most 5 reports a page and no duplicates; 5 a minute per address at the endpoint; 8 KB per report; 14-day deletion. |
| Identifying people through the rate limit | The address is hashed with a per-instance random salt, kept in memory for one minute, never stored or logged. |
| Spammy notifications | Only after the user switches them on and the browser allows them; one per check-in and per pause; tagged so several tabs show one. |
| Publishing the private admin address | Written generically in the committed plan; a repository test fails on it. |

## 7. Tests

Unit tests (71 new, 469 in total): the settings schema (defaults, ranges, field-by-field reading, fixed
serialisation, resets, colours); the check-in interval kept with each stretch, including a shortened
interval mid-stretch and another tab with older settings; the pause-limit warning (5 minutes before, at
once for a 5-minute limit, once per pause, never after a missed check-in); crash report scrubbing, browser
detection, the 8 KB fit in UTF-8 bytes and strict parsing; the endpoint's crash route (storage, rate limit
and forgetting, refusals, 14-day deletion, schema constraints); the settings store; font file signatures,
sizes and stored records; the font registry; the appearance stylesheet; control value formats; clock
formats; the repository text checks.

Browser tests (26 new, 115 in total), against the production build under the real CSP, in the full Chromium
run headlessly (decision 184):

- **Frames:** the panel with each of timer, display, appearance, notifications and privacy and data open,
  0 differing pixels against the frames (the owner's rules applied: no advanced row, no footer links, no
  Lexend); idle and results in the paper theme, 0 differing pixels.
- **Behaviour:** opening with the icon and comma, closing with the button, Escape and comma, focus
  returning; the panel's code loading on first use; changes applying live, saving, surviving a reload and
  reaching another tab; resetting to nothing stored; theme colours; search; switching the display mode
  during a session (and the session recording it); seconds always and never; time size; clock format;
  the check-in interval rule; a 5-minute pause limit; font previews only when appearance opens, a font
  only when chosen; own fonts refused (too large, not a font, unreadable) and accepted, kept across a
  reload, listed, and removed by clear device data with no database left behind before any file; usage
  counts off; crash reports off and on, scrubbed; notification permission asked only when switched on, and a
  refused prompt; phone pages; no CSP violation.
- **Updated:** the first visit's files and the precache are now derived from the build, as the size check
  derives them; display modes are chosen through stored settings instead of `?mode=`; pixel diffs report
  where they differ; the countdown frame test waits for the browser to draw the moment it holds (a race the
  busier suite exposed in CI).
- **CI:** the first runs of this round failed in CI on the frame tests, which passed here. The log showed a
  slider thumb drawn 0.8 px from the frame (the frame rounds 45.45 % up to 46 %), the first pixel of input
  text clipped, and run-to-run anti-aliasing noise in Playwright's headless shell; decisions 184 and 185 fix
  all three.

## 8. Open risks and follow-ups

1. **Questions for the owner:** the address the "source code" footer link should name; which round, if
   any, builds the "animation speed" setting; whether clear device data should ask for confirmation once
   custom CSS exists (round 7). Lexend was dropped for lacking tabular figures.
2. **Privacy page and terms.** They must exist before the public launch (owner changes, item 12); their
   text is the owner's to approve. The footer will link them once they exist.
3. **Notifications in the background.** Without a push server, a notification needs the page running: a
   browser that suspends a background tab, or a sleeping device, shows it late or not at all. iPhones need
   the site on the home screen, as the setting says.
4. **Cross-browser.** Constructed stylesheets under the CSP, fonts loaded from bytes, `indexedDB.databases()`
   and the drawn sliders over native ones are tested in Chromium; round 8 checks Firefox and Safari.
5. **Timer size beside the panel.** The frames draw the timer at 120 px beside the panel; the site follows
   the plan's scaling rule (121.3 px at 1280 × 800). Only the panel is compared with the frames.
6. **Rate limiting is per Worker instance.** A determined sender spread across Cloudflare's locations can
   exceed 5 a minute; the 8 KB cap and 14-day deletion bound the cost.
7. **Font loading at first paint.** A chosen font may show the default font for a moment if it loads after
   the screen has painted; at most a one-second wait is applied on the first run.
8. **Accessibility pass (round 8).** The panel's controls have roles and names; focus styles beyond the
   sliders, swatches and search box are the browser's.

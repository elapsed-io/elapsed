# Safety overview: Release 2, round 2.1 (Mode platform, low power, animation speed, the ring's glide)

Date: 2026-11-16. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`,
round 2.1.

## 1. What changed

- **Downloaded modes.** Every display mode but digits downloads when it is first shown and is kept for
  offline use in a cache of its own, with the time it was last shown beside its files. Settings → display
  lists the downloaded modes with their size and a remove button, as the Release 2 display frame draws it
  (hidden while nothing is downloaded). A mode unused for 30 days is removed when the page loads, never the
  mode about to be shown, never on a timer. The build writes each mode's own files into the service worker,
  which refreshes them when a new version installs.
- **Animation speed** (appearance: slower, normal, faster) scales every interface animation and the results
  replay through `--motion-scale`.
- **Low power** (appearance, off by default; on whenever the system asks for reduced motion) makes the ring
  and the timeline step once a minute instead of gliding. While the system asks, the switch shows on and
  cannot be turned off there.
- **The ring's head glides** 6° a minute, as the timeline does, and holds where it reached while paused; its
  tail grows once a minute over the first nine minutes (decision 267, a point for the owner).
- **The asset registry**: art by key, drawn from checked data, with a placeholder for every key a mode
  declares. No mode has art yet.
- **Settings schema 2** with the two new choices; the appearance panel matches the Release 2 appearance
  frame pixel for pixel.

## 2. Data

| What | Where | Kept |
| --- | --- | --- |
| A downloaded mode's files (the site's own scripts and styles) | Cache Storage `timer-offline-mode-<mode>`, on this device | Until removed by hand, 30 days unused, or the kill switch |
| When a downloaded mode was last shown (milliseconds, the page's clock) | `/mode-last-use` in that mode's cache | With the mode |
| Animation speed and low power | Local storage `settings` (schema 2), only once a setting differs from its default | As every setting |

Nothing new reaches a server; the last-use time never leaves the device. `docs/data-inventory.md` is
updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| The page's "mode used" message to the service worker | Exactly `{type, id, at}`: `type` "mode-used", `id` one of the modes this build has (never a path; the worker caches only that mode's files from its own build list), `at` a finite non-negative number. Anything else is ignored. Only pages of the site's origin can message its worker. |
| A mode cache's last-use record | Read only as a whole number of milliseconds (at most 16 digits, a safe integer); anything else reads as no record, and a mode with no record is removed when the page next loads. |
| Stored settings (schema 1 or 2) | Field by field, as before; `animationSpeed` must be one of the three speeds, `lowPower` a boolean, else the default. |
| An art catalog (from round 2.2 on) | Checked when registered: eight SVG shape kinds, geometry attributes only, values of numbers and path words with no `url`, `javascript`, `data:`, `expression` or `var(`; tones and keys are plain lowercase names. One bad entry refuses the whole catalog. Drawn with the DOM, never parsed as markup. |

## 4. Dependencies

None added, runtime or development.

## 5. Security surface

- **CSP and headers:** unchanged. The ring's glide is a script-started animation of `transform` set through
  the CSSOM, as the timeline's; no inline style attribute. No new permission.
- **Service worker:** new caches `timer-offline-mode-<mode>` under the same prefix, so the kill switch
  empties them; a new message type, validated (section 3); a mode's files are served from its cache or the
  network and never written to another cache. The worker stays one self-contained script: the page repeats
  the cache names instead of importing the worker's module, and a test checks they match.
- **Storage reached only through adapters:** the page's code for the mode caches is `src/storage/mode-cache.ts`
  (the plan audit checks this).
- **Timers:** none added; the plan audit's one-scheduler check passes.
- **No new endpoints, no authentication changes.**

## 6. Abuse cases

| Case | What happens |
| --- | --- |
| A flood of mode downloads (switching modes over and over) | Each mode's files are fetched once and then served from its cache; switching again only rewrites the last-use record. The worker fetches only the files its build lists for that mode. |
| A cache filling the device's quota | A mode's files are a few KB (ring 3.4 KB, timeline 2.2 KB compressed; at most 30 KB of code and 150 KB of art by budget). A full quota makes the worker skip the copy; the mode keeps working online. Settings list each mode's size and remove it. |
| Another page messaging the worker | Impossible across origins; a message from the site's own page that is not a valid "mode used" is ignored. |
| A tampered last-use record (far future) | The mode is then kept until that time passes or it is removed by hand; nothing else is affected. A record that is not a number removes the mode. |
| A removed mode that is still chosen | It keeps working online; the next time it is shown it downloads again. Settings and sessions are untouched (tested). |
| Art carrying script, links or styles | Refused when the catalog registers (tested with script, image, fill, style, event handler, `url()`, script URL, markup, custom property). |

## 7. Tests

- **Unit (537 in all, up from 520):** settings schema 2 and the migration from schema 1; animation speed's
  factors; the worker's cache names, its stale-cache rule keeping mode caches, the "mode used" message (12
  malformed variants refused), files by mode; the build's split of each mode's own files (shared and core
  files stay out) and a build missing a mode; the 30-day rule and the last-use record; the asset registry
  (placeholders, keys, 15 kinds of bad art, whole-catalog refusal, manifests' declared art); the plan audits
  (timers, storage adapters) and the repository's Wrangler pin.
- **End to end (Chromium, 189):** a mode downloads only when picked, into its own cache, and works offline;
  settings list it with its size and remove it, leaving local storage as it was; a mode unused for 30 days
  goes when the page loads, the shown one never; animation speed slower and faster scale the start morph
  and the results replay, and normal is the Design system's timing; low power switched on stops the ring
  gliding; the system's reduced motion turns low power on, the switch says so and cannot be turned off,
  and when the system stops asking the timeline glides again; the ring glides 6° a minute on its own layer,
  re-anchored each minute, holds where it reached while paused and glides on; with low power or reduced
  motion the ring and timeline step; the three ring frames with the glide frozen, and the control that a
  ring 3° off fails; the Release 2 appearance frame pixel for pixel.
- **Firefox and WebKit:** through the reference image (`npm run test:e2e:docker`) and CI.

## 8. Open risks and follow-ups

1. **For the owner: the ring's tail.** It grows once a minute over the first nine minutes, not
   continuously (decision 267). Making it continuous needs either a timer per mode (against the one
   scheduler, and it would wake a hidden tab) or a per-frame repaint of the gradient (against the plan's
   "no per-frame drawing"). The far end is transparent, so the step is faint.
2. **The gliding ring is resampled by the compositor:** the running ring frame differs from the frame by up
   to 100 anti-aliased pixels in the reference image (75 measured); a ring 3° off differs by 145 visible
   pixels and a smoothed delta of 68, which fails.
3. **Low power's battery suggestion** is not built (optional in the plan, not drawn).
4. **No mode uses the asset registry yet;** its drawing is exercised from round 2.2 (analog has no art;
   ocean life in 2.4 is the first catalog). Catalog sizes are counted against each mode's art budget by
   the size check, as they are bundled with the mode.
5. **A worker from before Release 2** never answers the page's "mode used" message; the page then simply
   does not refresh the list until settings open again. The new worker takes over at the next load.

# Safety overview: Release 2, round 2.12 (Test modes behind the flag only)

Date: 2026-11-24. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.12; the owner's item 2 of 2026-11-24 and plan version 13 (Display modes > Interstellar).

## 1. What changed

- **The test flag replaces the test-modes switch** (decision 404): a visit opened with `?test=modes` (or the older
  `?test=interstellar`) adds ocean depth, height, the tree and interstellar to the mode tiles for that visit. The
  flag is read from the address on every load and kept in memory only; the address keeps it, so a reload stays
  flagged and a tab opened without it is not. The "test modes" switch is gone from advanced settings, and the
  `test-modes` record rounds 2.9 to 2.11 wrote is removed on every load.
- **Nothing of the test modes in a visit without the flag** (decision 405): their manifests and where their
  downloads are (`modes/test-modes.ts`, `modes/test-manifests.ts`), their tiles, previews, options boxes and words
  (`settings/test-modes.ts`, core `copy/test-modes.ts`) load only on a flagged visit. The core's mode names, the
  settings copy and the registry hold only the standard modes.
- **A test mode chosen** shows digits on a visit without the flag, the choice kept; a session replayed there draws
  digits' replay; a test mode downloaded on a flagged visit stays cached until unused for 30 days but is not listed
  without the flag (decision 406).
- **On a flagged visit** the line "test modes appear here only for a visit opened with ?test=modes." shows under the
  tiles, as the Release 2 display frame draws it; the display, "change opens settings on it" and Release 2
  advanced frames are compared from the current canvas (decision 407).

## 2. Data

Less is stored: one local-storage record (`test-modes`) is removed and never written again; nothing is added. The
flag is never stored, in local or session storage, a cookie, the settings file or a sync. `docs/data-inventory.md`
is updated. An end-to-end test compares everything a flagged and an unflagged visit store after the same steps, and finds
the same keys and no trace of the flag.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| The address's `test` parameter | Read with `URLSearchParams`; only the exact values `modes` and `interstellar` flag a visit (unit tests cover empty, misspelt, encoded and repeated values). It selects between two fixed code paths and is never stored, echoed into the page or sent anywhere. |
| An old `test-modes` record | Never parsed any more: removed on load if present, whatever it holds. A refusing storage is reported, not thrown (unit test). |
| A stored test-mode choice | Validated as before against the settings schema (the four ids stay declared), and shown as digits without the flag. |

## 4. Dependencies

None added or removed.

## 5. Security surface

- **No new endpoint, header, permission or network request.** A visit without the flag makes fewer requests than
  before: opening settings no longer fetches the ocean depth, ocean life and tree configs, and the core no longer
  carries the test modes' download lists (the core's main script fell from 36.8 KB to 34.6 KB gzipped; the settings
  panel's download from 18.4 KB to 16.1 KB).
- **Two new lazily loaded modules**, fetched only on a flagged visit, from the site's own origin under the same
  Content Security Policy and Trusted Types as every script; each has a size ceiling (1.5 KB and 5.5 KB).
- **DOM only, as before:** the tiles, the line and the options boxes are made with `createElement` from the site's
  own strings.

## 6. Abuse cases

- **A crafted address** (`?test=…`) can at most show the four test modes, which ship in the build anyway; anything
  else is ignored. It cannot persist: a later visit without it shows the standard modes.
- **A shared link with the flag** shows the test modes to whoever opens it, for that visit only, by design (the
  plan's flag); nothing carries over to their next visit.
- **Two tabs, one flagged:** the flagged tab offers the test modes; the other shows digits for a test-mode choice
  and never fetches their code; a choice made in either tab is kept for both, as settings are.

## 7. Tests

- **Results:** see the round summary in `docs/questions-overnight.md` for `npm run check` and the reference run in
  Chromium, Firefox and WebKit.
- **New unit tests:** `src/test-flag.test.ts` (which addresses flag a visit; the old record removed, nothing written
  when there is none, a refusing storage reported; the mode shown with and without the flag; the standard and test
  manifests kept apart); `src/modes/registry.test.ts` (only the standard modes known until the test modes are
  registered).
- **New end-to-end tests** (`e2e/test-modes.spec.ts`, rewritten): a visit without the flag shows the four standard
  tiles and no line or options, has no switch, and through settings (every category, a search), a session and its
  results fetches no file only a flagged visit can fetch (worked out from the build's manifest) and no script
  holding the test modes' words, and stores nothing about the flag; a flagged visit shows all eight with the line
  and stores exactly what an unflagged one does; a reload keeps the flag, a new tab without it shows four, closing
  the flagged tab ends it, and the next flagged visit shows the kept choice; `?test=interstellar` flags,
  `?test=calendar` does not; an old switch record is removed on load, flagged or not; a stored test-mode choice
  shows digits without the flag; a test mode downloaded on a flagged visit is not listed without it. In
  `e2e/settings.spec.ts`, the Release 2 advanced frame (no switch) and the display frames from the current canvas.
  Every other test of a test mode opens a flagged visit.

## 8. Open risks and follow-ups

1. **What a visit without the flag still carries of the test modes:** their four ids in the settings schema (so a
   choice made on a flagged visit is validated and kept), the flag's two values, and in the service worker's map
   the paths of each test mode's files (so a flagged visit's download is kept in that mode's own cache). None of it
   draws, names or describes a test mode (decision 405).
2. **The display frames' two later parts** (the redrawn analog tile, round 2.13; display as the first category,
   round 2.14) are applied to the reference as rules until built, and each rule goes in its round.

## Revision, 2026-11-25 (plan version 14)

Plan version 14 restates the round as built: the test modes only on a visit opened with `?test=modes` (or
`?test=interstellar`), for that visit only; no switch and nothing stored; a chosen test mode shown as digits
without the flag, the choice kept; and, newly explicit, the recipe pieces only those modes use loaded only on a
flagged visit. Each piece was already its own download, fetched only when a chosen recipe uses it; the unflagged
visit test now chooses each standard mode and checks that none of the twelve test-only piece, environment and
results-view modules was fetched, and that the standard modes' own downloaded piece (the analog dial) was
(decision 435). No code changed. `docs/plan.md` is version 14 (decision 432); `docs/recipes/` is unchanged, as
no new archive came with the message and the one on hand gives the committed recipes once answer 35's corrections
are applied (decision 434). Data, inputs, dependencies and the security surface are as above.

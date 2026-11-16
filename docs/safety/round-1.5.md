# Safety overview: Release 1, round 5 (End screen)

Date: 2026-11-16. Template: plan, Safety overviews > Round overview.

## 1. What changed

Ending a session now goes through the ending countdown: "tabulating results" with a 5-second bar,
cancel and end now (which ignores its first 300 ms), no corner icons. The session ends at the moment
end was pressed; cancel resumes as if it had not been. When the bar is full, the tabulating screen
holds and fades, and the results fade in: the focused headline counting up in CSS, the replay drawn in
the mode shown longest (a focus strip for digits and timeline, one ring per hour for ring), the six
session statistics, retry and share. Sessions that end on their own skip the countdown and show their
results in every tab that was showing them; the session maximum notice's "view results" now opens
them. The finished session is kept in the tab's session storage, so a reload shows the results again
without the replay, and is deleted when a new session starts. The guest invite stays hidden until
Release 3. The strip and ring results are identical to their (corrected) frames, pixel for pixel.

## 2. Data

| What | Where | Kept |
| --- | --- | --- |
| The finished session (its id, segment, gap and mode timestamps, local day, end reason) | Session storage `timer.finished`, this tab only | Until a new session starts or the tab closes |
| The finished session, between tabs | BroadcastChannel message to the site's other open tabs, when a session ends | Not kept; a receiving tab validates it and keeps it in its own session storage only if it ended on its own |
| "i studied for 2h 47m on [name]" and the site's address | The device's share sheet (touch devices) or the clipboard (computers), only when the user presses share | Wherever the user puts it |

Nothing new is sent to a server. The results screen's code is fetched from the site's own address the
first time it is needed. `docs/data-inventory.md` is updated.

## 3. Inputs

| Input | Validation |
| --- | --- |
| `timer.finished` read back | Capped at 1,048,576 characters; parsed; validated and migrated by `core`'s `migrateSession`; must have ended. Anything else is removed. |
| "ended" tab messages | Exact field set; a UUID-shaped id and a known end reason; the session string is capped, parsed, validated, and must match the id and reason and have ended. Anything else is ignored. |
| Clicks and keys on the countdown and results | Cancel, end now (ignored for 300 ms), retry and share act only on their own screens; Space and Escape cancel and E ends now during the countdown; Space retries on the results. |
| The time end was pressed | Taken from the engine; the end is clamped between the session's last pause or resume and now. |

## 4. Dependencies

None added, runtime or development. The core is 17.8 KB of JavaScript compressed (budget 50 KB) and
44.8 KB in total (budget 150 KB). The results screen loads on first use: 2.2 KB of script and 0.9 KB of
styles, plus the focus strip (1.0 KB and 0.4 KB) or the ring's replay (in the ring's 3.1 KB).

## 5. Security surface

No CSP or header changes; the countdown, results, replays, count-up, share and copy run under the
existing policy with no violations. New storage key: `timer.finished` in session storage. No new
endpoints, cookies or authentication. The clipboard is written only after the user presses share;
`navigator.share` is used only on touch devices. The plan audit now accounts for every script
animation and allows the two named exceptions only where they belong.

## 6. Abuse cases

| Abuse case | Defence |
| --- | --- |
| A tampered `timer.finished` (forged results, markup, huge text) | Size cap and full validation; text is only ever set with `textContent`; Trusted Types enforced. It only changes what that tab shows its own user. |
| A crafted "ended" message from another same-origin context | Exact shape, validation of the session, and it must match the session this tab was showing; it can only show results for that session. |
| A double click on end skipping the countdown | End now ignores its first 300 ms (tested). |
| Counting the countdown's seconds, or hours slept through it, as focus | The session ends where end was pressed (tested), clamped to the last pause or resume. |
| Share text carrying anything private | It holds the focused duration, the product name and the site's address only. |
| A long session making the results unreadable | Ring results fit every hour of 16 in the same circle; strip labels that would crowd are left out. |

## 7. Tests

Unit tests (16 new, 398 in total): ending at the moment end was pressed (the countdown's seconds, a
later pause, sleeping through it); the session summary (every statistic, the replay mode and its
tie-break, automatic endings); count keyframes (flat across pauses, landing on the total); ring
geometry up to 6 and at 16 hours, arcs and per-hour paths; strip label placement; share text; the
finished-session store; "ended" messages carrying a session; the stricter audit.

Browser tests (15 new, 87 in total), against the production build under the real CSP:

- **Frames:** the ending countdown at 2.5 s; the digits results and the ring results after their
  replays, both with 0 differing pixels against the corrected frames.
- **Behaviour:** cancel loses nothing and the session ends where end was pressed; the 300 ms guard;
  the CSS count-up and its landing; retry, Space and focus; tab storage written and cleared; reload
  showing the final results without a replay; sessions under a minute; copying with its check mark
  and announcement; the share sheet on a touch device; reduced motion; a phone layout (scaled
  headline, fitted strip, stats in two rows of three, no sideways scroll); the pause limit showing
  results in two tabs; the session maximum's "view results"; timeline replaying as the strip.
- Older tests now expect the countdown and results where they expected idle.

## 8. Open risks and follow-ups

1. **Copy refused.** Where the browser refuses the clipboard, share shows nothing (decision 149).
   Round 8's accessibility pass may want a visible failure.
2. **Results in background tabs.** The countdown and the fades run on the browser's animation clock,
   which pauses in hidden tabs, so a countdown started just before switching away completes on return.
3. **Cross-browser.** `@property`, `mod()`, `round()` and `linear()` easing are in every supported
   browser's current version; older ones show the total at once and a curve close to the plan's.
   Round 8 should confirm Safari and Firefox draw the masks and the count the same.
4. **Long-task check under load.** The "no task over 50 ms" check failed once when four test workers
   competed for the CPU, and passes alone (10 of 10). CI runs it with fewer workers.
5. **Theme frames.** The results frame in the paper theme is checked in round 6, when themes can be
   chosen.
6. **Accessibility pass (round 8).** Focus styles are the browser's; the replay's drawings are images
   with a text label, and the statistics are a description list.

# Safety overview: Release 1, round 4 (Persistence and abandonment)

Date: 2026-11-15. Template: plan, Safety overviews > Round overview.

## 1. What changed

A session now survives a refresh, a closed tab and a shut lid. The engine keeps an **active state** (the
open session plus what the abandonment rules remember) and applies the plan's rules as pure functions,
in order, on every wake, command and restore: check-ins after 2 hours of running time since the last
sign of presence, a missed check-in pausing the session where it appeared and ending it 12 hours later,
the pause limit fixed when each pause begins, and the 16-hour maximum. A heartbeat every 30 seconds
records gaps. The site stores the active state in local storage through a `SessionStore` that validates
everything it reads back, and tabs share one session through a BroadcastChannel and storage. Three new
screens match their frames pixel for pixel: the check-in line over the held time (answered by any key,
click or tap), the paused screen after a missed check-in, and the session maximum notice. A service
worker caches the core for offline use, with a version check and a remote kill switch, and a web app
manifest with placeholder icons makes the site installable. A new package, `packages/endpoint`, is the
Cloudflare Worker that counts anonymous daily visits and sessions in D1; the site sends one count per
visit and per session start. Nothing is deployed.

## 2. Data

| What | Where | Kept |
| --- | --- | --- |
| Active state: session id (random UUID), segment, gap and mode timestamps, local day, last sign of presence, missed check-in time, pause limit in force | Local storage `timer.active`, this device only | Until the session ends (by the user or a rule); then removed |
| Last heartbeat time | Local storage `timer.heartbeat` | Same |
| Copies of the site's own files | Cache Storage `timer-offline-<version>` | Until the next version takes over or the kill switch empties it |
| Service worker registration | Browser | Until the kill switch or the user removes it |
| `{"event":"visit"}` / `{"event":"session"}` | Sent to `POST /api/count` on the site's own address | The Worker adds one to a UTC day's total in D1 and keeps nothing else; totals are kept as long as the site runs |

The count requests carry no cookies, referrer, time or identifier, and nothing is stored on the device to
count them. Requests never leave the site's origin. `docs/data-inventory.md` is updated; it also moves
crash reports to round 6 with the owner's retention (14 days) and notes that the counting endpoint never
reads IP addresses.

## 3. Inputs

| Input | Validation |
| --- | --- |
| `timer.active` read back (load, other tabs) | Capped at 1,048,576 characters; `JSON.parse`; then `core`'s `migrateActiveState`/`parseActiveState`: plain objects only, exact field sets, whole non-negative times in order, segments, gaps and modes within their limits, a UUID id, a real calendar day, an open (not ended) session, presence inside the running segment, a missed check-in only where the session paused, a pause limit within 5 to 60 minutes. Unreadable data is removed and the site starts idle; data with a newer schema number is left alone and not used. |
| `timer.heartbeat` read back | Digits only, at most 16, a safe integer; clamped to now. Anything else is ignored. |
| BroadcastChannel messages | Exactly `{type: "changed"}` or `{type: "ended", id, reason}` with a UUID-shaped id and a known end reason; anything else is ignored. Messages carry no session data: the receiving tab re-reads and re-validates storage. |
| `storage` events | Only this store's keys on this tab's local storage area trigger a re-read. |
| Keys, clicks and taps while a check-in waits | Any one answers. Unmodified keys are consumed (keydown and keyup) so they do nothing else; modified keys, Tab and typing into text fields pass through. |
| `/sw-control.json` | Exactly `{"serviceWorker":"on"}` or `{"serviceWorker":"off"}`; anything else, an error or no network means "on". |
| `POST /api/count` (server) | Method POST; `Sec-Fetch-Site` same-origin and `Origin` equal to the site when present; `Content-Type: application/json`; declared and actual length at most 256 bytes; valid UTF-8; a plain object with exactly one key, `event`, equal to `visit` or `session`. Everything else gets 4xx before the database is touched. The SQL is a fixed, parameterised upsert. |
| Service worker requests | Only GETs to the site's own origin are handled; `/api/`, `/sw.js` and `/sw-control.json` always go to the network; only complete `200` same-origin, non-redirected responses are cached. |

## 4. Dependencies

None added: no runtime and no development dependencies. Cloudflare's D1 binding is typed by hand
(three methods), the Worker is not built with Wrangler in this repository, and its tests use Node's
built-in SQLite. The icons are drawn without an image library. The site's JavaScript is 15.3 KB
compressed (budget 50 KB) and the core 41.7 KB in total (budget 150 KB); `/sw.js` is 1.7 KB.

## 5. Security surface

- **CSP:** `trusted-types 'none'` becomes `trusted-types service-worker`: one named policy, created once,
  that accepts exactly `/sw.js` and throws for anything else; no default policy can exist.
  `worker-src 'self'` and `manifest-src 'self'` are added. No origin is added anywhere.
- **Headers:** `/sw.js` is served `Cache-Control: no-cache` and `/sw-control.json` `no-store`. The
  Worker's responses carry their own CSP (`default-src 'none'; frame-ancestors 'none'`), HSTS,
  `nosniff`, `no-referrer`, `Cross-Origin-Resource-Policy: same-origin` and `no-store`, because
  `_headers` does not apply to Worker responses.
- **Storage keys:** `timer.active`, `timer.heartbeat`; Cache Storage `timer-offline-<version>`; one
  service worker registration with scope `/`.
- **Endpoints:** `POST /api/count`; any other `/api/` path is 404. No authentication (none is needed:
  the endpoint only increments anonymous totals). Worker logs, `workers.dev` and preview URLs are off.
- **Lint and audit:** Cache Storage joins local storage, session storage and IndexedDB as reachable only
  from `src/storage` (the service worker excepted).

## 6. Abuse cases

| Abuse case | Defence |
| --- | --- |
| Stored data tampered with (a forged session claiming more focus, markup, huge strings) | Full schema validation on every read; markup is only ever data and never rendered (no HTML sinks; Trusted Types). Size cap before parsing. Tested with broken JSON, a forged shape and markup. For guests a forged session only fools its owner; Release 3 re-validates on the server. |
| Another tab, extension or page script posting crafted BroadcastChannel messages | Same-origin only by design; messages are checked against two exact shapes and carry no data; storage is re-read and re-validated. |
| A device clock moved to fake time | Round 2's jump detection while open; on reopening with the clock behind the last heartbeat, the session resumes from its last saved elapsed time. A forward jump counts like sleep and is capped by check-ins. |
| A frozen background tab overwriting newer state from another tab | Every scheduled wake re-reads storage first (decision 94); tested in core with a frozen tab. |
| Inflating the usage counts | Accepted risk (plan). Cross-site posts are refused by `Sec-Fetch-Site`/`Origin`; bodies are capped; only two events exist. |
| Using the count endpoint to store or exfiltrate data | It stores one integer per day and event; any extra field is refused. |
| Poisoning the offline cache with another origin's or an error response | Only same-origin, complete `200` responses are cached; API responses never. |
| A broken service worker stranding users | The page reads the kill switch on every load, past every cache; "off" stops the worker caching, unregisters it and empties its caches (tested). `/sw.js` is checked on every visit. |
| A malicious worker script URL | The Trusted Types policy accepts only `/sw.js`; the CSP allows only same-origin workers. |
| The check-in swallowing a keystroke the user meant elsewhere | Modified keys, Tab and typing into text fields pass through. |

## 7. Tests

Unit tests (98 new, 382 in total): the rules in order and their edge cases (check-ins counted since the
last sign of presence, the response window, backdated pauses that ignore the pause limit, the 12-hour
hold, the pause limit fixed per pause, the 16-hour maximum winning inside the response hour); the engine
with the rules (lid shut and reopened, heartbeat and gaps, restore, the clock behind the last heartbeat,
adopting another tab's state, a frozen tab taking up an answered check-in, another tab's heartbeat,
no repeated announcement); six new randomised engine runs with rules and heartbeat; `parseActiveState`
and the fixed-order serialiser; the session store (round-trip, discarding broken, forged, ended and
oversize data, leaving newer data alone, full or missing storage, change detection); tab messages and
two tabs sharing a session; check-in keys; visit counting; the kill switch file; the service worker's
routes and cache rules; the counting endpoint against the real migration on SQLite (counts per UTC day,
ten refused requests, response headers, other paths, database failure, schema constraints); the icons
match their script; the new CSP and headers.

Browser tests (25 new, 72 in total), against the production build under the real CSP:

- **Frames:** the check-in, paused after a missed check-in, and session maximum screens are identical to
  their frames (0 differing pixels).
- **Persistence:** refresh while running and while paused; a tab closed for hours reopening paused at the
  missed check-in with the frame's text and the right title, then resuming the same session; a tab closed
  past the 12-hour hold reopening idle; check-ins appearing at 2 hours with the title and announcement,
  answered by Space (with focus on the pause button) without pausing, by a click on pause (which also
  pauses) and by a tap anywhere; a missed check-in while open, still waiting past the pause limit; the
  pause limit ending a session; the session maximum notice, its focus, and starting again; three kinds of
  bad stored data discarded; two tabs starting, pausing, resuming and ending one session; counts sent for
  a visit and a session start with no cookie or referrer, none for a reload or a restored session, and
  nothing stored to count.
- **Offline:** the worker registers under the CSP and Trusted Types with no violations or errors, caches
  exactly the core, and the site loads and starts a session offline; a display mode is cached when picked
  and never in advance; the kill switch unregisters the worker and empties its caches; counts are never
  answered from a cache.
- **Quality:** only the two keys exist during a session and nothing after it.

## 8. Open risks and follow-ups

1. **"Ended and been saved."** The session maximum notice's copy (from the frame) says the session was
   saved; until round 5 adds tab-scoped storage of the finished session, an ended guest session is not
   kept anywhere (decision 107).
2. **Not deployed or run on Cloudflare.** `wrangler.jsonc` follows Cloudflare's current documentation but
   has never been run; its database id is a placeholder. The first deploy (after the release review)
   must create the D1 database, apply the migration, confirm `_headers` reach static files, that
   `run_worker_first` sends only `/api/*` to the script, and that Cloudflare's own request logging for
   the Worker is off as configured.
3. **Settings.** The check-in interval, pause limit and the usage counts switch are fixed at their
   defaults until round 6's settings (decision 98). The usage counts are on with no way to switch them off
   until then; the privacy policy (an open decision) must explain them before launch.
4. **Cross-browser.** Browser tests run in Chromium only. Firefox and Safari support BroadcastChannel,
   service workers and the APIs used; Trusted Types is skipped where unsupported. Round 8 must confirm the
   check-in key handling (keyup consumption) and offline behaviour there, and Safari's storage eviction
   for sites not added to the home screen.
5. **Lie-fi.** The page is network-first with no timeout, so on a connection that hangs the page waits for
   the browser's own timeout before the cached copy is used.
6. **A newer version's data.** A tab running an older build leaves alone, and does not adopt, state saved
   by a newer schema; until it reloads it may overwrite that state with its own. Only schema 1 exists.
7. **Rare tab races.** Two tabs acting within a few milliseconds of each other settle on whichever write
   lands last in storage; nothing is lost beyond that one command.
8. **Accessibility pass (round 8).** Focus styles are the browser's (the notice's focused button shows the
   default ring); announcements are polite.

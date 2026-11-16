# Data inventory

This file mirrors the plan's Privacy section. Any round that adds a stored or transmitted field
updates it in the same change (plan, Privacy > Living inventory).

## What the site does today

As of Release 1, round 5 (End screen).

| | Current state |
| --- | --- |
| Requests on a visit | All to the site's own origin, none to anyone else (`e2e/idle.spec.ts`): the page, its script, its stylesheet, the default font and the tab icon (`/icons/icon.svg`); `GET /sw-control.json` (the offline kill switch, never cached); `POST /api/count` with `{"event":"visit"}` unless the load is a reload or a back-and-forward navigation. Ring or timeline adds that mode's script and stylesheet. |
| Requests later | `POST /api/count` with `{"event":"session"}` when a session starts. The results screen's script and stylesheet the first time a session ends (and the focus strip's or the ring's drawing code). The service worker (`/sw.js`) fetches the core files, `/manifest.webmanifest` and the tab icon when it installs, and the browser re-checks `/sw.js` on each visit. Installing to a home screen fetches the PNG icons. |
| What a count request carries | The event's name and nothing else: no cookies (credentials omitted), no referrer, no time, no identifier, nothing stored on the device. The server sees the request's IP address and headers as any web server does; the Worker reads none of them except `Origin`, `Sec-Fetch-Site`, `Content-Type` and `Content-Length`, and keeps none. |
| Local storage | Only while a session is open, both removed when it ends: `timer.active` (the session's random id, its start, pause, resume and end timestamps, informational gaps, display modes with their start times, its local day, the last sign of presence, the time of a missed check-in, and the pause limit in force) and `timer.heartbeat` (the time of the last heartbeat). Nothing about what the user is doing. Validated whenever read. |
| Cache Storage | `timer-offline-<version>`: copies of the site's own files (page, script, stylesheet, font, manifest, icon, and display modes once picked). No personal data and nothing from `/api/`. Old versions are removed when a new one takes over; the kill switch empties it. |
| Service worker | One registration for the site's own scope (`/`). |
| Session storage (this tab only) | `timer.finished`: the last finished session (the same fields as `timer.active`'s session, with how it ended), from when it ends until a new session starts or the tab closes. Validated whenever read. |
| Sharing | Only when the user presses share: on a touch device, the device's share sheet receives "i studied for 2h 47m on [name]" and the site's address; on a computer, the same line goes to the clipboard. Nothing else, and nothing to a server. |
| IndexedDB, cookies | None. Lint bans `document.cookie`. |
| Server data | Cloudflare D1, table `daily_counts`: one row per UTC day and event (`visit`, `session`) holding a total. Nothing else. Kept as long as the site runs; totals describe no one. |
| Logs | The Worker writes none (`observability` off). Cloudflare's platform keeps its own standard request logs for the site. |

## Planned inventory

Mirrors the plan's Privacy table. "Round" says when each item starts to exist; until then it does not.

| Data | Guest | Account | Where it lives | Round |
| --- | --- | --- | --- | --- |
| Active session | Yes | Yes | Device storage until the session ends | R1 round 4 |
| Settings, theme, layouts, custom CSS | Yes | Yes | Device; synced to the server for accounts | R1 rounds 4, 6, 7; sync in R3 |
| Imported background images and font files | Yes | Yes | Device only, for guests and accounts; never uploaded. Images are re-encoded with location and camera metadata removed. On another device the layout falls back to the theme until the file is imported there | Fonts R1 round 6; images R2 |
| Finished sessions | Tab storage only; deleted when the tab closes | Yes | Server | R1 round 5 (guests); R3 (accounts) |
| Password hash | No | Yes, unless signing in with Google | Server | R3 |
| Email | No | Yes, for sign-in and recovery | Server | R3 |
| Display name | No | Yes; public only in competitions | Server | R3 |
| Age check | No | Only that the person is 13 or older; the birth year is not kept | Server | R3 |
| Google sign-in | No | Optional. Google learns of the sign-in only when the user chooses it; the server keeps only the Google account identifier | Server | R3 |
| Purchase record | No | Whether the unlock was bought, and Stripe's reference. Card details stay with Stripe | Server | R3 |
| Shared result pages | No | Optional, per session; private by default | Server | R3 |
| Widget connections | No | Optional, per integration. Access tokens only, encrypted; disconnecting deletes them | Server or the widget's own origin | R4 |
| Widget content (events, to-dos, emails) | No | Shown, never stored | Provider; held in memory while displayed | R4 |
| Cookies | None | One session cookie: HttpOnly, Secure, SameSite | Browser | R3 |
| IP address | Not stored | Used briefly for rate limiting; never saved with the account | Memory only | R1 round 6 (crash report rate limit); the counting endpoint never reads it |
| Usage counts | Anonymous daily visit and session counts, on by default, can be switched off | Same | A Cloudflare Worker on the site's own address, storing daily totals only in Cloudflare D1 | R1 round 4 (the switch: round 6) |
| Crash reports | Off unless switched on | Same | A Cloudflare D1 table, deleted after 14 days: error message, stack, build version, day, and browser family and major version. Query strings and anything the user typed are stripped; nothing else about the person or device is kept | R1 round 6 |
| Analytics, ads, other third-party requests | None | None, apart from the CAPTCHA on the sign-up page | Nowhere | — |

Never stored: what the user is working on, IP address, device fingerprint, or activity in other tabs.
Location is never stored before the social release, and then only as an opt-in named place.

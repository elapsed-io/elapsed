# Data inventory

This file mirrors the plan's Privacy section. Any round that adds a stored or transmitted field
updates it in the same change (plan, Privacy > Living inventory).

## What the site does today

As of Release 1, round 7 (Custom CSS).

| | Current state |
| --- | --- |
| Requests on a visit | All to the site's own origin, none to anyone else (`e2e/idle.spec.ts`): the page, its script, its stylesheet, the default font and the tab icon (`/icons/icon.svg`); `GET /sw-control.json` (the offline kill switch, never cached); `POST /api/count` with `{"event":"visit"}` unless the load is a reload or a back-and-forward navigation, and only while usage counts are on. Ring or timeline adds that mode's script and stylesheet; a chosen built-in font adds that font's files. |
| Requests later | `POST /api/count` with `{"event":"session"}` when a session starts, while usage counts are on. The settings panel's script and stylesheet the first time it opens; the twelve fonts' name previews (about 19 KB) the first time the appearance category opens; a font's files when it is chosen. The custom CSS editor's script and its one font file (IBM Plex Mono at 400) the first time the advanced category opens. Saved custom CSS loads nothing: anything that would (`url()` other than a small data image, `@import`, `@font-face`) is removed when it is saved, and the CSP blocks other origins regardless. `POST /api/crash` with one scrubbed report per uncaught error, only while crash reports are on (at most 5 a page). The results screen's script and stylesheet the first time a session ends (and the focus strip's or the ring's drawing code). The service worker (`/sw.js`) fetches the core files, `/manifest.webmanifest` and the tab icon when it installs, and the browser re-checks `/sw.js` on each visit. Installing to a home screen fetches the PNG icons. |
| What a crash report carries | The error message and its stack, with query strings, fragments, other origins' addresses and every quoted string removed; the build (the site's script file name); the browser family and major version, read from the user agent on the device. At most 8 KB. No cookies, no referrer, no time, no identifier. The endpoint reads the request's IP address only to limit an address to 5 reports a minute, hashed with a random salt and forgotten after that minute; it is never stored or logged. |
| What a count request carries | The event's name and nothing else: no cookies (credentials omitted), no referrer, no time, no identifier, nothing stored on the device. The server sees the request's IP address and headers as any web server does; the Worker reads none of them except `Origin`, `Sec-Fetch-Site`, `Content-Type` and `Content-Length`, and keeps none. |
| Local storage | Only while a session is open, both removed when it ends: `timer.active` (the session's random id, its start, pause, resume and end timestamps, informational gaps, display modes with their start times, its local day, the last sign of presence, the time of a missed check-in, the pause limit in force, and the check-in interval in force) and `timer.heartbeat` (the time of the last heartbeat). `settings`, only once a setting differs from its default: the user's choices (seconds, check-in interval, pause limit, display mode, theme and any custom theme colours, font choice, time size, clock format, the two notification switches, usage counts, crash reports). For your own font it holds only `"own"`, never the file. `custom-css`, only while the user has saved custom CSS: `{"schema":1,"css":"…"}`, the CSS as cleaned when saved, at most 50 KB; kept apart from `settings` because it never syncs (Release 3 sends at most a note that custom CSS is in use). Nothing about what the user is doing. Validated whenever read. |
| Cache Storage | `timer-offline-<version>`: copies of the site's own files (page, scripts, stylesheet, font, manifest, icon, and display modes, fonts and the settings panel once used). No personal data and nothing from `/api/`. Old versions are removed when a new one takes over; the kill switch empties it. |
| Service worker | One registration for the site's own scope (`/`). |
| Session storage (this tab only) | `timer.finished`: the last finished session (the same fields as `timer.active`'s session, with how it ended), from when it ends until a new session starts or the tab closes. Validated whenever read. |
| Settings file | Only when the user presses export: a file `elapsed-settings.json` that the browser downloads, holding every choice and the custom CSS (never fonts or images). Nothing is sent anywhere. Import reads a file the user picks, at most 256 KB, on the device only. |
| Sharing | Only when the user presses share: on a touch device, the device's share sheet receives "i studied for 2h 47m on elapsed" and the site's address; on a computer, the same line goes to the clipboard. Nothing else, and nothing to a server. |
| IndexedDB | Database `media`, created only when a font file is loaded: the user's own font file (its format and bytes; not its name), kept on this device only and never uploaded. Validated whenever read. Clear device data removes it, with `settings` and `custom-css`, after asking. |
| Notifications | Only when switched on and allowed by the browser: the check-in and pause-limit notices, with the product's copy and a clock time, shown by the device. Nothing is stored or sent. |
| Cookies | None. Lint bans `document.cookie`. |
| Server data | Cloudflare D1 (one database, `elapsed`). Table `daily_counts`: one row per UTC day and event (`visit`, `session`) holding a total; kept as long as the site runs; totals describe no one. Table `crash_reports`: per report, the UTC day, the build, the browser family and major version, the scrubbed message and stack; deleted 14 days later (on every new report and by a daily schedule). Nothing else. |
| Logs | The Worker writes none (`observability` off). Cloudflare's platform keeps its own standard request logs for the site. |

## Planned inventory

Mirrors the plan's Privacy table. "Round" says when each item starts to exist; until then it does not.

| Data | Guest | Account | Where it lives | Round |
| --- | --- | --- | --- | --- |
| Active session | Yes | Yes | Device storage until the session ends | R1 round 4 |
| Settings, theme and layouts (choices only) | Yes | Yes | Device; synced to the server for accounts | R1 rounds 4, 6; layouts R2; sync in R3 |
| Imported background images, font files and custom CSS | Yes | Yes | Device only, for guests and accounts; never uploaded. Images are re-encoded with location and camera metadata removed. On another device the layout falls back to the theme until the file is imported there | Fonts R1 round 6; custom CSS R1 round 7; images R2 |
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

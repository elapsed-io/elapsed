# Data inventory

This file mirrors the plan's Privacy section. Any round that adds a stored or transmitted field
updates it in the same change (plan, Privacy > Living inventory).

## What the site does today

As of Release 1, round 1 (Foundations), the site stores nothing and sends nothing.

| | Current state |
| --- | --- |
| Requests on a visit | Three, all to the site's own origin: the page, its stylesheet and the default font. No third-party requests. Verified by `packages/web/e2e/idle.spec.ts`. |
| Browser storage | None. No `localStorage`, `sessionStorage`, IndexedDB or Cache Storage keys. Lint restricts storage access to the future storage adapters. |
| Cookies | None. Lint bans `document.cookie`. |
| Server endpoints | None. The anonymous counting endpoint arrives in round 4. |
| Logs | None of our own. The static host (Cloudflare) keeps its standard request logs. |

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
| IP address | Not stored | Used briefly for rate limiting; never saved with the account | Memory only | R1 round 4 (counting endpoint) |
| Usage counts | Anonymous daily visit and session counts, on by default, can be switched off | Same | Server, as daily totals only | R1 round 4 |
| Crash reports | Off unless switched on | Same | Our server only, without personal data, kept briefly | R1 round 4 |
| Analytics, ads, other third-party requests | None | None, apart from the CAPTCHA on the sign-up page | Nowhere | — |

Never stored: what the user is working on, IP address, device fingerprint, or activity in other tabs.
Location is never stored before the social release, and then only as an opt-in named place.

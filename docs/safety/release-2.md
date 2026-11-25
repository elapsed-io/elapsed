# Release review: Release 2

Date: 2026-11-25. Template: plan, Safety overviews > Release review, preceded by round 2.16's own overview
(`docs/safety/round-2.16.md`). Every checklist item is answered below; every open risk from rounds 2.1 to 2.16 is
closed, accepted with its reason, or waiting on the owner (part E).

**Status: ready for the owner's final items and sign-off.** Release 2 is elapsed's public launch on elapsed.io
(owner, answer 38): the four standard modes (digits, ring, timeline, analog) and the screens around them, keep
screen awake and the check-ins switch. Ocean depth, height, the tree, interstellar and picture-in-picture are
behind the test flag and not part of it. Nothing is deployed: the owner runs every deploy (`docs/deploy.md`,
Part 7). Revised for plan version 14 (rounds 2.12 to 2.16 revised, 2026-11-25): the owner's six launch tasks are in
part E, in the plan's order, and the full git history has been scanned for secrets (part B; question 41).

## A. Round 2.16

`docs/safety/round-2.16.md`: the privacy page and terms served by the app; the source code link held by one switch;
the launch steps and the production deploy script; the hardening pass.

## B. The release review checklist

| Item (plan, Release review) | Answer |
| --- | --- |
| Every round overview is re-read, and each open risk is closed or accepted in writing. | Done: part C answers every open risk of rounds 2.1 to 2.16; part E lists what needs the owner. |
| The data inventory matches a live session: no third-party requests, no unexpected storage keys or cookies. | Done in CI: `e2e/privacy.spec.ts` uses every feature Release 1 had and, since this review, analog (a downloaded mode), check-ins off, keep screen awake and the three plain pages, in Chromium, Firefox and WebKit, and checks every request, body, stored key and cookie against `docs/data-inventory.md` (updated through round 2.16). `e2e/test-modes.spec.ts` shows a flagged visit stores exactly what an unflagged one does, and that an unflagged one fetches none of the flagged-only files (the test modes and picture-in-picture). On the deployed build, `tooling/check-deployed.ts` checks cookies too; the owner runs it after the launch. |
| Dependencies are audited for known vulnerabilities, unused packages are removed, and the lockfile is committed. | Done: `npm audit` finds 0 vulnerabilities; registry signatures verify, 53 packages with attestations; the site still has no runtime dependency and the same 9 development dependencies, each used; the lockfile is committed and CI installs from it without install scripts. |
| The CSP and headers are verified on the deployed build, not only locally. | Ready, pending the launch: `node tooling/check-deployed.ts app https://elapsed.io` (`docs/deploy.md`, Part 7, step 6) compares every response, now including `/privacy`, `/terms`, `/credits/` and `pages.css`, with the `_headers` deployed. Locally, the exact CSP, Trusted Types and Permissions-Policy are tested on the production build in all three engines, on the timer and on the plain pages. **Owner action after the launch.** |
| The malicious-CSS corpus passes and safe mode works. | Done: `e2e/custom-css.spec.ts` (the corpus, scoping and lock tests, safe mode) passes in Chromium, Firefox and WebKit. |
| The threat model is updated for the new features. | Done: part D. |
| Accessibility checks and performance budgets pass. | Done in CI: axe-core's WCAG 2.2 A and AA rules over the four standard modes idle, running, paused and checking in, the ending countdown and results in four themes, every settings category at desktop and phone widths, the idle screen with each tip, and the three plain pages in a dark and a light theme; keyboard, focus, screen-reader, 44 px target, reflow and reduced-motion tests; every download within its ceiling (core JavaScript 41.3 of 50 KB, core total 70.5 of 150 KB, analog 7.0 of 30 KB, every part under its own ceiling; plan version 14's revision); 100 ms responses, long tasks, layout shift; every standard mode for seven hours and in a hidden tab. What needs a real device is part F. |
| From Release 3: auth flows, rate limits, session expiry, export and deletion are reviewed, and no secrets are in the repository. | Not applicable until Release 3, apart from secrets. **The full git history** (decision 446): every blob, path and commit message reachable from any of the repository's 11 refs (its four branches and every pull request's head and merge refs, which GitHub keeps and shows once the repository is public): 98 commits, 1,838 blobs (28.3 MB), 671 paths, scanned for keys and tokens of 16 kinds, private key blocks, credentials in addresses, bearer tokens, high-entropy values assigned to key, secret, token or password names, and file names that usually hold secrets. **No key, token, password or private key was ever committed**; the one such-named file, `.npmrc`, holds only install settings; the D1 database ids in `packages/endpoint/wrangler.jsonc` are identifiers, not credentials. **One finding for the owner (question 41):** the private admin address is the author of three merge commits made on GitHub (two pull request merges on `claude/release-2`, and GitHub's own test merge for pull request 4), so it would show in their metadata once the repository is public; it appears in no file and no message. One other commit carries the owner's name with a personal address. GitHub's own secret scanning runs once it is switched on (the owner's task 3, right after making the repository public). |
| A rollback plan is written. | Done: `docs/rollback.md` (the app's versions, the offline kill switch, the soon page, the database, the domain at launch) and `docs/deploy.md`, Part 7 ("Rolling back the launch"). |
| The owner signs off. | **Waiting** on the owner's two items and the sign-off (part E). |

## C. Open risks from rounds 2.1 to 2.16

Rounds 2.3 to 2.6 and 2.9 to 2.11 built, or changed, the test modes (ocean depth, height, the tree, interstellar),
which stay behind the test flag and are not part of this release; their risks are carried with them, apart from
anything that reaches a visit without the flag (round 2.12 shows nothing does).

| Round | Risk | Disposition |
| --- | --- | --- |
| 2.1 | The ring's tail grows once a minute over its first nine minutes, not continuously (decision 267). | Accepted: continuous growth needs a timer per mode or per-frame drawing, both against the plan; the far end is transparent, so the step is faint. |
| 2.1 | The gliding ring is resampled by the compositor. | Closed: the ring frames are matched in three browsers with decision 412's two-step comparison. |
| 2.1 | Low power's battery suggestion is not built. | Accepted: optional in the plan and not drawn. |
| 2.1 | A worker from before Release 2 never answers "mode used". | Accepted: the downloaded list catches up when settings open again; the new worker takes over at the next load. |
| 2.2 | The hours hand glides where the frame draws the whole hour. | Closed: answered (question 1, keep the glide). |
| 2.2 | Each analog hand is a dial-sized layer. | Accepted: a few hundred kilobytes at most; the seven-hour and hidden-tab tests pass. |
| 2.3 to 2.6 | Ocean depth's icon contrast near the surface, its water near the surface and sonar rings, height's and the tree's open points, art licences. | Behind the flag. The art's licence is answered (question 3: CC0); the rest go with the test modes. |
| 2.6 | The tree's year of about 420 animations. | Behind the flag (and round 2.14 found and fixed a test that depended on real time around it, decision 420). |
| 2.7 | The contrast switch's crossfade and ocean life's arrivals. | Closed: answered (questions 10, 11). |
| 2.7 | The core's budget. | Closed: 41.4 of 50 KB since round 2.10's split. |
| 2.7 | Piece tokens scoped to their mode. | Accepted until a mode can be copied (a later release). |
| 2.8 | Questions 13 to 21 (the crown's dip, the dial red, focus view in figure modes, a tap on hidden controls, fullscreen after a resume, the analog seconds hand, the outline, the focus frames' 13 px, "change" and the tip) and 22. | Open with the owner (part E): each is built one way, works and is tested; an answer becomes a small change. |
| 2.8 | Picture-in-picture in the display frames. | Closed: moved to a later release, behind the flag, its row and button hidden (decision 424). |
| 2.8 | The test suite keeps pages touched. | Accepted: a test practice (`awake: false` where the focus view is watched). |
| 2.9 to 2.11 | Interstellar's open points, the HYG sky's size on a phone, the recipe system's reach, ocean depth's and height's "black screen". | Behind the flag; questions 28 to 31 and 33 go with the test modes. |
| 2.9, 2.11 | Glyph anti-aliasing against the frames; the frost's 1 to 2 levels around a held display. | Accepted: measured, stated in each frame test, and compared exactly with text transparent; the frost only where art lies behind the time. |
| 2.10 | Long-task tests on a software rasteriser. | Accepted: a strict bound; a phone with a GPU draws faster. |
| 2.12 | A visit without the flag carries the test modes' ids in the schema and their paths in the worker's map. | Accepted: none of it draws, names or fetches a test mode (decision 405). |
| 2.13 | The frames show seconds. | Closed: seconds "always" by default (round 2.14). |
| 2.13 | The test modes' recipes differ from the archive's. | Behind the flag, until rounds 2.18 and 2.19. |
| 2.14 | People who finished sessions in Release 1 see the fullscreen tip first. | Accepted: nothing before Release 3 records earlier sessions. |
| 2.14 | The timer re-lays itself beside the panel when it opens. | Accepted: every settings frame places it there (decision 416); it never moves while the panel moves. |
| 2.15 | Keep screen awake holds on every screen while the tab is seen. | Closed (answer 40, decision 444): it holds only while a session is running or paused in the visible tab. |
| 2.15 | With check-ins off, a shut lid is credited up to the session maximum. | Accepted: it follows from the plan (the lid rule is the check-in's); Release 6 marks such sessions. |
| 2.15 | The floating window has no frame. | Behind the flag until its release. |
| 2.16 | The app edition's wording and date; the deployed checks; GitHub's secret scanning. | The owner's (part E). |

## D. Threat model: what Release 2 adds to Release 1's

Release 1's model (`docs/safety/release-1.md`, part D) stands; these rows are new or changed.

| Asset or surface | Threat | Defence | Tested by |
| --- | --- | --- | --- |
| The test flag (`?test=modes`) | A crafted or shared address showing unreleased modes, or persisting | Exact values only; read from the address on each load, never stored; an unflagged visit fetches none of the flagged files | `test-flag.test.ts`, `test-modes.spec.ts` |
| Downloaded modes (Cache Storage, one cache per mode) | A stale or tampered cache, unbounded growth | Hashed files only, the site's own origin, refreshed by a new worker, removed after 30 days unused or by hand, the kill switch | `offline.spec.ts`, `sw/logic.test.ts`, `modes.spec.ts` |
| Display-mode recipes (built in) | A recipe that draws outside its slot, loads remote art or never ends | The validator and schema (references, budgets, safety cases from the archive's checker, permanent tests), assets only from the site's registry | `recipes/*.test.ts`, `archive.test.ts` |
| The notices record | A crafted record hiding or forcing tips | Read as untrusted: anything malformed reads as nothing dismissed and no session yet; it can change no setting | `notice-store.test.ts`, `notices.spec.ts` |
| The check-ins switch | Gaming the abandonment rules | Off removes check-ins only; the session maximum and the pause limit hold; turning it on never dates a pause | `rules.test.ts`, `engine.rules.test.ts`, `timer-switches.spec.ts` |
| The screen wake lock | Holding the screen while not seen; being blocked or opened to others | Held only while the tab is seen and the setting is on; the Permissions-Policy leaves it to the site's own pages | `wake-lock.test.ts`, `headers.test.ts`, `timer-switches.spec.ts` |
| Picture-in-picture (flagged) | A window outside the page's policies | Fetched only on a flagged visit with the API; the window inherits the page's CSP and Trusted Types and holds no script | `pip.spec.ts`, `test-modes.spec.ts` |
| The plain pages (credits, privacy, terms) | Script or style injection; a theme record breaking the page; the wrong edition published | Static HTML under the site's CSP, one module of the site's own, validated settings, the renderer's escaping and edition markers | `credits.spec.ts`, `site-pages.spec.ts`, `legal.test.ts` |
| The launch | The domain on the wrong Worker, production behind Access or the test build open, headers lost | The domain never written into the app's configuration; the owner's ordered steps; the deployed-header check; the private-window checks | `docs/deploy.md`, Part 7; `check-deployed.ts` |
| Source distribution | Serving GPL-3.0 JavaScript without its source | The repository is made public by the owner before the link shows | `brand.test.ts`, `site-pages.spec.ts` |

## E. For the owner

### The six launch tasks, in the plan's order (plan version 14; `docs/release-readiness.md`, section 4)

1. **The legal review** of the privacy page and terms in the app's edition (decision 427 lists every change from
   the published text), with the effective date set to the launch day (`docs/deploy.md`, Part 7, A).
2. **Make the repository public** (Part 7, B), once question 41 (the private admin address in three merge commits'
   metadata) is settled.
3. **Secret scanning and push protection**, switched on right after: free on public repositories (Part 7, C).
4. **The source code link** switched on (`REPOSITORY_PUBLIC`), checked and committed before the deploy (Part 7, D).
5. **The device checks** (`docs/device-checks.md`, part F below; Part 7, E).
6. **The deploy and sign-off** (`docs/deploy.md`, Part 7, steps 1 to 8): the production database,
   `npm run deploy:production`, moving elapsed.io from the soon page to the app, production out of Cloudflare
   Access with the test build still behind it, the deployed-header check against elapsed.io, HSTS preload only once
   every subdomain answers over HTTPS, and the sign-off.

### Open questions (`docs/questions-overnight.md`)

13 to 22 (round 2.8's focus view, notices and analog details) and 28 to 33 (the test modes): still open, each
kept as built until answered (owner, 2026-11-25). None blocks the launch unless the owner says so. Question 41 (the
private admin address in three merge commits' metadata) is to be settled before task 2.

## F. What needs a real device

`docs/device-checks.md`: Release 1's checks 1 to 31 and Release 2's 32 to 37 (keep screen awake, check-ins off with
a shut lid, the tips, the panel's slide, the plain pages, a slow phone), on the iPhone, a Mac with Safari, a
low-end Android phone and a Chrome or Edge computer, against the build that will launch.

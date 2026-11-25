# Release readiness: the standard modes

Written 2026-11-24 for the owner's review, before any further building; updated the same day with the owner's
answers (plan version 13: questions 35 to 39). Sources: `docs/plan.md` (version 13), the design canvas (version
1795558050-f326, every frame read), the owner's messages of 2026-11-24, and the code on `claude/release-2`
(round 2.11, commit `b396113`). Each round that lands updates this page.

## 1. What this release is

**Ships:** the four standard modes, digits, ring, timeline and analog, finished and polished, with the shared
screens around them (idle, running, check-in, paused, ending, results, settings) and the owner's in-scope list:
the shared sizes (a 260 px dial for ring and analog, a 48 px time inside ring and timeline, the compact 360 px
timeline), the analog redesign, focus view, notices and the fullscreen settings ("leave fullscreen" defaulting
to never), seconds shown by default ("hide seconds after starting": never) with its once-only tip, the launch
settings layout (plan version 14: a darkened box always holds settings that belong to the setting above it; eight
themes; "pause before ending"; clock format in timer; low power to the backlog), settings opening on display and
the panel's motion, the credits page, results replays that never stall, and the shared layout and layer order.

**Does not ship:** ocean depth, height, the tree and interstellar. They are proofs of concept for the recipe
system, available only on a visit opened with `?test=modes` (or `?test=interstellar`), never downloaded
otherwise; work on them goes only as far as it tests or improves the recipe system.

**Release 2 is elapsed's public launch on elapsed.io** (owner, answer 38). It also ships **keep screen awake**
and **the check-ins switch** (round 2.15). **Picture-in-picture moves to a later release:** its code stays behind
the test flag, its settings row and corner button hidden at launch (the Release 2 display frame no longer shows
the row). The layout editor comes after the launch. **Release 1's launch list applies in full** (section 4).

## 2. The standard modes

Each row: what is done (built and tested against its frame), what is left against the frames and the plan, and
what of that blocks the release. "Frame" names are the canvas titles.

### Digits

| | |
| --- | --- |
| **Done** | **Round 2.14:** seconds "always" by default and every timer frame re-taken with seconds (running at 01:24:37, the focus frames, check-in at 02:00:00, paused, paused after a missed check-in), matched in three browsers; the once-only seconds tip (decisions 413, 414, 419). Before: idle, running (seconds blur away, now an option, its frame unchanged), check-in, paused, paused after a missed check-in, ending countdown, session maximum and results (focus strip) all built and compared pixel for pixel with their frames in Chromium, Firefox and WebKit; the shared layout (time, 26 px gap, buttons) measured identical to the other time modes; focus view; the tab title; keyboard control; reduced motion and low power. |
| **Left against the frames** | Nothing. |
| **Left against the plan** | Nothing. |
| **Blocks the release** | No. |

### Ring

| | |
| --- | --- |
| **Done** | **Round 2.13:** the shared 260 px dial (an 8 px track filling it), the time at the shared 48 px inside it, the buttons 26 px below; frames "ring: the shared 260 px dial, time 48 px", "ring at the start" and "ring, paused" matched in three browsers (decision 408). Before: the fading tail growing in behind the head, the head gliding 6° a minute on its own layer and stepping with reduced motion or low power, holding while paused; the paused screen blurring the whole figure; results as one ring per hour (frame "results: analog and ring", matched). |
| **Left against the frames** | Nothing: the frames' seconds are the default since round 2.14. |
| **Left against the plan** | Nothing. |
| **Blocks the release** | No. |

### Timeline

| | |
| --- | --- |
| **Done** | **Round 2.13:** the compact timeline, the shared 48 px time 14 px above a 360 px track (its ends fading over 14 %), the buttons 26 px below; frames "timeline: compact, time 48 px", "timeline at the start" and "timeline, paused" matched in three browsers (decision 408). Before: the track gliding 10 px a minute on its own layers (stepping with reduced motion or low power), nothing before the start, ticks and labels on whole pixels; results as the focus strip (matched). The personal-record marker stays hidden until records arrive (Release 3), as the frame index says. |
| **Left against the frames** | Nothing: the frames' seconds are the default since round 2.14. |
| **Left against the plan** | Nothing. |
| **Blocks the release** | No. |

### Analog

| | |
| --- | --- |
| **Done** | **Round 2.13, revised (plan version 14):** the block is the 260 px square around the dial, the crown overhanging it, so the analog and ring dials sit at the same point with the buttons 26 px below (decision 436). **Round 2.13:** the redesigned stopwatch on the shared 260 px dial, from the frame's own coordinates (a 300 × 296 drawing; case, rim and face 130, 126 and 120; the seconds dial of radius 36; numbers at 10 and 8.5 px; the hands 99, 45 and 33 long), 26 px above the buttons; frame "analog: the shared 260 px dial" matched; its settings tile redrawn as the stopwatch (decision 409). Before: the hands gliding and stepping as the ring's do, the crown dipping when end is pressed; results as rings per hour (matched); a downloaded mode, cached for offline use. |
| **Left against the frames** | Nothing. |
| **Left against the plan** | Nothing. |
| **Blocks the release** | No. |

## 3. The shared screens

| Screen | Done | Left against the frames and the plan | Blocks the release |
| --- | --- | --- | --- |
| **Idle** | Built and matched (graphite and paper); the ambient idle for modes with an environment. **Round 2.14:** the fullscreen tip before the first session and the seconds tip after the first completed session while seconds are "always", one at a time, each never returning once dismissed or acted on; frame "the seconds tip, once only" matched (decision 414). | Nothing. | No. |
| **Running** | Built and matched: seconds shown by default ("hide seconds after starting": never; stored settings never changed move to it, a choice made is kept; decisions 413, 438), the focus frames at 01:24:37, and the blur away at every moment of the running frame, as an option; focus view (decisions 339 to 341). | Nothing. | No. |
| **Check-in** | Built and matched, at 02:00:00 with seconds (round 2.14); never hides its controls; the layer order keeps every mode's art under it. | Nothing. | No. |
| **Paused** | Built and matched with seconds (round 2.14), with "paused after a missed check-in"; the pause blur; ring and timeline's own paused frames (round 2.13). | Nothing. | No. |
| **Ending** | Built and matched; unchanged. | Nothing. | No. |
| **Session maximum** | Built and matched; unchanged. | Nothing. | No. |
| **Results** | Built and matched: digits and timeline, analog and ring, the paper theme; replays never stall and sweep evenly through pauses (decision 348). | Nothing against the frames. | No. |
| **Settings** | Built and matched: every Release 1 and Release 2 frame as it was; search, resets, the settings file, custom CSS, safe mode; "leave fullscreen" defaulting to never (decision 397); the credits link. **Round 2.14:** display first, the panel opening on it with display mode at the top (frame "settings open on display, now first"); the panel sliding 24 px in from the right while fading in over 200 ms and out over 160 ms, the timer still beside it (frame "settings panel: slides in and out"); seconds offered as always, blur away, never (frame "seconds: always (default), blur away, never"); decisions 415 to 417. **Round 2.14, revised (plan version 14):** the launch layout, matched to "settings, display (launch)", the launch timer and appearance frames, the flagged display frame and "settings, opened by a notice": "mode" with the chosen mode's options in a darkened box, the plain focus mode group with "hide seconds after starting"; check-in every in a darkened box under check-ins, "pause before ending", keep screen awake's line, clock format ("system settings" first); eight larger theme tiles four to a row with the theme colours in a darkened box; oxblood, lilac and low power removed; settings schema 5 with the owner's mapping (decisions 438 to 443). **Round 2.15:** the Release 2 timer frame (the check-ins switch with its warning, the interval without a help line, keep screen awake) matched; the check-ins switch and keep screen awake built (decisions 421 to 423; keep screen awake only while a session is open since the revision, decision 444); picture-in-picture behind the test flag, its row and button hidden at launch (decision 424), so the display frame, without its row, is the launch's. | Nothing. | No. |
| **Credits page** | Built (decision 398): every third-party work and its licence, under the site's security policy, reached from the footer. **Round 2.14:** in the person's chosen theme (each of the ten, and colours of their own) and the site's typeface, laid out like the privacy and terms pages (decision 418). | Nothing. | No. |

### Across every screen

| | Done | Left | Blocks the release |
| --- | --- | --- | --- |
| **Shared layout and layer order** | One layer order in tokens for every mode and screen; no mode may set a z-index; the shared time, gap and buttons in the time modes (decisions 388 to 392); the figure modes in the shared slot at the shared sizes (round 2.13, decision 408). | Nothing. | No. |
| **Test modes behind the flag only** | **Built in round 2.12** (decisions 404 to 407): the flag read from the address for the visit only, no switch and nothing stored (the old record removed on load); a visit without the flag shows the four standard tiles, fetches no file only a flagged visit can (the test modes, their pieces, tiles, options and words) and lists no downloaded test mode; a test-mode choice shows digits there and is kept; the flagged visit's line under the tiles; the Release 2 advanced frame without the switch. | Nothing. | No. |
| **The recipe archive** | **Reconciled in round 2.13** (decisions 410, 411): `recipe-check.py` corrected so the standard recipes are the frames', run, and the archive written again (64 features); the site ships the same four recipes; the checker's validation, references, budgets, features and twenty safety cases are permanent tests, with the site's validator. The test modes' recipes stay the site's own until rounds 2.18 and 2.19. | Nothing. | No. |
| **Hardening** | Release 1's passes and every round's tests since. **Round 2.16** (decision 430): axe-core over the four standard modes, both tips and the three plain pages; every standard mode over seven hours and in a hidden tab; the live-session data test extended to Release 2; the device checklist's checks 32 to 37; the dependency audit and a secret scan; the release review `docs/safety/release-2.md`. | The device checks on real devices (the owner's run) and the owner's sign-off. | The sign-off. |

## 4. What else blocks a release

### The owner's tasks, in the plan's launch order (plan version 14)

Release 2 is the public launch, so Release 1's launch list applies in full. These six are the owner's, in this
order; `docs/deploy.md`, Part 7, has the steps for each (A to E before the deploy, then steps 1 to 8).

| # | Task | Status |
| --- | --- | --- |
| 1 | **The legal review** of the privacy page and terms in the app's edition, with the effective date set to the launch day | Waiting on the owner. The app serves its edition at `/privacy` and `/terms` (decisions 426, 427; every change from the published text is listed in decision 427); both pages read "Effective November 15, 2026." until the owner sets the launch day (Part 7, A). |
| 2 | **Make the repository public** | Waiting on the owner, after question 41: the full history holds no key, token or password (decision 446), but the private admin address is the author of three merge commits made on GitHub, which would show once public (Part 7, B). |
| 3 | **Secret scanning and push protection**, switched on right after (free on public repositories) | Off until then; the full-history scan and the repository's pattern test stand in (Part 7, C). |
| 4 | **The source code link** switched on | Built, hidden (decision 428): one switch, `REPOSITORY_PUBLIC`, flipped and checked once the owner confirms the repository is public, before the deploy (Part 7, D). |
| 5 | **The device checks** | `docs/device-checks.md`, Release 1's 1 to 31 and Release 2's 32 to 37, on the iPhone, a Mac with Safari, the Android phone and a Chrome or Edge computer (Part 7, E). |
| 6 | **The deploy and sign-off** | Prepared: the production database, `npm run deploy:production` (decision 429), elapsed.io moved from the soon page to the app, production out of Cloudflare Access with the test build still behind it, the deployed-header check (now covering `/privacy`, `/terms`, `/credits/` and `pages.css`), HSTS preload only once every subdomain serves HTTPS, and the sign-off (Part 7, steps 1 to 8). |

Built for the launch list already: the privacy page and terms served by the app from the same sources as the soon
page's (round 2.16), the deployed-header check, the production deploy script and the source code link's switch.

### Answers that touch the standard modes

- `docs/questions-overnight.md` 13 to 21 (the analog crown's dip on E, the dial red on the other themes, focus view
  in modes drawn round their time, a tap on hidden controls, fullscreen after a resume, the analog seconds hand
  at rest, how brief the outline is, the focus frames' 13 px, "change" and the tip): each is built one way and
  works; an answer that changes one becomes a small fix in the round it touches.
- **Nothing else known:** no failing test (the revised rounds' last reference run, 2.15's, in Chromium, Firefox and
  WebKit: 1,209 passed, 98 skipped, one test-only failure in a test mode's seven-hour test, fixed (decision 445) and
  the performance spec passed twice over in all three, with the timing tests on their own; `npm run check`
  passes), and every download within its ceiling.

## 5. The remaining work, in order

Ordered to release the standard modes soonest (every question that held a round is answered by plan version
13 and the owner's answer to question 38). Each round finishes completely
(checks, the reference run in three browsers, its safety overview, decisions) before the next starts.

| Round | Builds | Frames | Waits on |
| --- | --- | --- | --- |
| **2.12** Test modes behind the flag only (**done**) | The owner's item 2 in full, with its tests; the advanced category without the switch. | "settings, advanced (release 2)"; the Release 2 display frame's flagged-visit line. | Nothing. |
| **2.13** The standard sizes and the recipe archive (**done**) | The 260 px dial for ring and analog, the 48 px time inside ring and timeline, the compact 360 px timeline, every main block in the shared slot 26 px above the buttons, the analog rescale and its tile; the recipes reconciled (the frames win for the standard modes, and each corrected recipe is written back into the archive and checked again), the validator taking the archive's schema, and `recipe-check.py`'s checks made permanent tests. | The three ring frames, the three timeline frames, the analog frame, the Release 2 display frame's analog tile. | Nothing. |
| **2.14** Seconds, settings and notices (**done**, revised for plan version 14) | Seconds shown by default ("hide seconds after starting": never, blur away, right away, in display's focus mode group; stored settings never changed move to the new defaults, a choice made is kept), the seconds tip on the idle screen after the first completed session while it is still "never" (the fullscreen tip before the first session; one notice at a time; a dismissed or acted-on tip never returns), the launch settings layout (darkened boxes, eight themes, pause before ending, clock format in timer, low power removed), settings opening on display (first) with mode at the top, the panel's slide, the seconds options' order, the credits page in the chosen theme and the legal pages' layout; every shared timer frame re-taken with seconds. | "the seconds tip, once only", "settings panel: slides in and out", "settings, display (launch)", the launch timer and appearance frames, "settings, opened by a notice", the running, focus, check-in and paused frames. | Nothing. |
| **2.15** Check-ins switch and keep screen awake (**done**, revised for plan version 14) | The two Release 2 timer controls (keep screen awake only while a session is running or paused in the visible tab, answer 40); picture-in-picture's code behind the test flag, its row and button hidden at launch. | Release 2 settings: timer and display. | Nothing. |
| **2.16** Hardening, the launch list and the release review (**done**, awaiting the owner's sign-off) | The Release 2 passes over the standard modes and screens; the privacy and terms pages served by the app; the launch list prepared for the owner (section 4); `docs/safety/release-2.md`. | Every frame of the release. | The owner's two tasks (legal review, the repository public) and sign-off. |

**After the release, behind the flag** (no earlier, unless the owner says so):

- **2.17 The layout editor** (held until the customize-mode frames are on the canvas; the old round 2.12).
- **2.18 Ocean depth's calm water** (owner's item 4; frame "ocean depth (proof of concept): idle, calm water"
  and its recipe): the gradient as the page's background, the glow drawn once and moved by transforms and
  opacity, three depths of marine snow as half-resolution strips slid by CSS, no timers and no blend modes,
  removed on start with a 2 s crossfade into the running colours from #1F6485, still with reduced motion or
  low power; tests for zero repaints a frame, under 3 MB of GPU memory, and 4.5:1 at the glow's brightest.
  "When the standard modes allow": after the launch, unless the owner says otherwise.
- **2.19 Height's falcon** (the five height frames): after the standard modes have shipped, as the proof of
  concept for the cinematic recipe pieces.
- **Recipe pieces only when a recipe uses them**, each its own small download; no beam particles or drifting
  patches (no recipe uses them).

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
to never), seconds defaulting to "always" with its once-only tip, settings opening on display and the panel's
motion, the credits page, results replays that never stall, and the shared layout and layer order.

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
| **Done** | Idle, running (seconds blur-away), check-in, paused, paused after a missed check-in, ending countdown, session maximum and results (focus strip) all built and compared pixel for pixel with their frames in Chromium, Firefox and WebKit; the shared layout (time, 26 px gap, buttons) measured identical to the other time modes; focus view; the tab title; keyboard control; reduced motion and low power. |
| **Left against the frames** | The timer frames now show seconds (running at 01:24:37, "running, untouched" and "recently touched", check-in at 02:00:00, paused at 01:24:37 for 00:04:12, missed check-in at 02:00:00): the site shows hh:mm after the first minute because its seconds default is still "blur away". "seconds: blur away" stays as an option, its frame unchanged. |
| **Left against the plan** | Seconds default "always show" (Settings catalog); the once-only seconds tip ("seconds can fade out after a minute, for a calmer screen", with "change"; frame "the seconds tip, once only"). |
| **Blocks the release** | The seconds default and its tip, and the frame tests re-taken from the current frames. |

### Ring

| | |
| --- | --- |
| **Done** | The ring with its fading tail growing in behind the head, the head gliding 6° a minute on its own layer and stepping with reduced motion or low power, holding while paused; the paused screen blurring the whole figure; results as one ring per hour (frame "results: analog and ring", unchanged and matched). |
| **Left against the frames** | Frames "ring: the shared 260 px dial, time 48 px", "ring at the start" and "ring, paused" (all new): a 260 px dial with an 8 px track, the time at 48 px inside it, the buttons 26 px below the dial; paused, the dial and its time blur at 10 px and 40 % with "paused for" and the 44 px pause length over them. Built: a 232 px ring (its centre line 224 px across) in a 280 px box, a 52 px time, 20 px to the buttons. |
| **Left against the plan** | "The dial is 260 px across in both ring and analog, and the time inside a mode (ring and timeline) is 48 px"; "every mode's main block sits in the same centered slot with its buttons 26 px below it". |
| **Blocks the release** | All of the above. |

### Timeline

| | |
| --- | --- |
| **Done** | The track gliding 10 px a minute on its own layers (stepping with reduced motion or low power), faded ends, nothing before the start, ticks and labels on whole pixels; the paused screen blurring the whole display; results as the focus strip (frame "results: digits and timeline", unchanged and matched). |
| **Left against the frames** | Frames "timeline: compact, time 48 px", "timeline at the start" and "timeline, paused" (all new): the time at 48 px, 14 px above a 360 px track (its ends fading over 14 %), the buttons 26 px below. Built: a 56 px time 18 px above a 480 px track, 30 px to the buttons. The frames draw the personal-record marker ("pr: 01:35:12"); the plan brings it in Release 3, so the site keeps it hidden (frame index: "the personal record marker arrives in Release 3"). |
| **Left against the plan** | "The time at 48 px, 14 px above a compact 360 px track". |
| **Blocks the release** | The compact timeline and its three frames. |

### Analog

| | |
| --- | --- |
| **Done** | The redesigned stopwatch of round 2.8 (polished case, rim, face, batons, numbers, the hours subdial with its accent hand, the seconds dial, the crown that dips when end is pressed), its hands gliding and stepping as the ring's do, readable on request; results as rings per hour (unchanged and matched); a downloaded mode, cached for offline use. |
| **Left against the frames** | Frame "analog: the shared 260 px dial": the same design scaled to the shared dial: the drawing 300 × 296 (was 340 × 336), the case 260 px across (radius 130, was 150), rim 126 and face 120 (were 146 and 138), the seconds dial radius 36 (was 42), numbers at 10 px and the small dial's at 8.5 (were 11 and 9.5), the minute hand 2.4 wide (was 2.5), and 26 px to the buttons (was 14). The analog tile in the display settings is redrawn as a stopwatch with its crown. |
| **Left against the plan** | The shared 260 px dial and the 26 px slot. |
| **Blocks the release** | The rescale, its frame and the tile. |

## 3. The shared screens

| Screen | Done | Left against the frames and the plan | Blocks the release |
| --- | --- | --- | --- |
| **Idle** | Built and matched (graphite and paper); the fullscreen tip above the time; the ambient idle for modes with an environment. | The seconds tip (frame "the seconds tip, once only"), with "only one notice shows at a time": the fullscreen tip first, on the idle screen before the first session; the seconds tip on the idle screen after the first completed session, only while seconds are still "always"; a dismissed or acted-on tip never returns (plan version 13). Its "change" must point to a choice (seconds: blur away), where the pill's "change" today turns on a switch. | The tip. |
| **Running** | Built and matched: the blur-away at every moment of the running frame (an option now), focus view (the three focus frames, decisions 339 to 341). | Default seconds "always" (stored settings never changed move to it; a choice the person made is kept): the focus frames now show 01:24:37. | The default and the re-taken frames. |
| **Check-in** | Built and matched; never hides its controls; the layer order keeps every mode's art under it. | The frame shows 02:00:00 with seconds. | The re-taken frame. |
| **Paused** | Built and matched, with "paused after a missed check-in"; the pause blur. | Both frames now show seconds; ring and timeline have paused frames of their own at the new sizes (section 2). | The re-taken frames. |
| **Ending** | Built and matched; unchanged. | Nothing. | No. |
| **Session maximum** | Built and matched; unchanged. | Nothing. | No. |
| **Results** | Built and matched: digits and timeline, analog and ring, the paper theme; replays never stall and sweep evenly through pauses (decision 348). | Nothing against the frames. | No. |
| **Settings** | Built and matched: every Release 1 and Release 2 frame as it was; search, resets, the settings file, custom CSS, safe mode; "leave fullscreen" defaulting to never (decision 397); the credits link. | Frames "settings open on display, now first" and "settings panel: slides in and out": display is the first category and the panel opens on it, display mode at the top; the panel slides 24 px in from the right while fading in over 200 ms and out over 160 ms (built: opens on timer, no slide). Frame "seconds: always (default), blur away, never": the options in that order. The Release 2 display frame: the analog tile redrawn (the advanced frame without the switch, "leave fullscreen" with never chosen, no picture-in-picture row and the flagged visit's line under the tiles are built and matched, round 2.12). The Release 2 timer frame's check-ins switch and "keep screen awake" are not built (round 2.15). | Display first, the motion, the seconds row, the advanced frame, the analog tile, the check-ins switch and keep screen awake. |
| **Credits page** | Built (decision 398): every third-party work and its licence, under the site's security policy, reached from the footer. | Plan version 12: it follows the person's chosen theme and the site's typeface, laid out like the privacy and terms pages (built: the default theme, its own layout). | Yes. |

### Across every screen

| | Done | Left | Blocks the release |
| --- | --- | --- | --- |
| **Shared layout and layer order** | One layer order in tokens for every mode and screen; no mode may set a z-index; the shared time, gap and buttons in the time modes (decisions 388 to 392). | The figure modes join the shared slot at the shared sizes (section 2): plan version 12 answers question 32. | With section 2. |
| **Test modes behind the flag only** | **Built in round 2.12** (decisions 404 to 407): the flag read from the address for the visit only, no switch and nothing stored (the old record removed on load); a visit without the flag shows the four standard tiles, fetches no file only a flagged visit can (the test modes, their pieces, tiles, options and words) and lists no downloaded test mode; a test-mode choice shows digits there and is kept; the flagged visit's line under the tiles; the Release 2 advanced frame without the switch. | Nothing. | No. |
| **The recipe archive** | `docs/recipes/` replaced with the owner's archive of 2026-11-24 (its checker passes: all eight recipes valid, 62 features). | The archive was written from an earlier copy: its standard recipes predate the analog redesign and carry ring's 52 px and timeline's 56 px time, where the frames and plan version 12 say 48; its schema adds fields the site does not draw yet and a keyword its validator lacks (`minProperties`). So the site still builds from its own copies (`packages/core/src/recipes/shipped/`, unchanged from round 2.11) until the two are reconciled: for the standard modes the frames win, and each corrected recipe is written back into the archive and checked again (plan version 13). Then `recipe-check.py`'s validation, feature checks and safety tests become permanent tests. | The standard recipes must match the frames; the reconciliation and the permanent checks come with the sizes round. |
| **Hardening** | Release 1's passes (accessibility, performance, cross-browser, device checks) and every round's tests since. | The Release 2 pass over the standard modes and the new screens: WCAG 2.2 AA with axe-core, keyboard and screen readers, 44 px targets, reduced motion and low power; the budgets; the device checklist; the release review `docs/safety/release-2.md`; the owner's sign-off. | Yes. |

## 4. What else blocks a release

### The launch list (plan version 13; Release 1, round 8)

Release 2 is the public launch, so Release 1's launch list applies in full. Each item is in round 2.16's release
review; the owner runs every step that touches Cloudflare or GitHub's settings.

| Item | Who | Status |
| --- | --- | --- |
| Serve the privacy and terms pages from the app (`/privacy`, `/terms`), from the same sources as today's | Built in round 2.16 | Today they live in the soon page's project |
| A final legal review of the privacy and terms pages | **Owner** | To be confirmed by the owner before the release review |
| Check the security headers against elapsed.io (`tooling/check-deployed.ts`) | Prepared in 2.16; run by the owner after the switch | Checked today against the test build only |
| HSTS preload, only once every subdomain serves HTTPS | Owner, after the check | Not submitted |
| GitHub secret scanning and push protection | Owner (repository settings) | Off |
| Replace the soon page with the app on elapsed.io | Owner (`docs/deploy.md`, updated in 2.16) | The soon page is live |
| Take production out from behind Cloudflare Access, keeping the test build behind it | Owner (`docs/deploy.md`, updated in 2.16) | Everything is behind Access |
| The source code link in the settings footer | Built in 2.16, kept hidden | Hidden until the owner confirms the repository is public |
| Make the repository public | **Owner** | To be confirmed by the owner before the release review; the source code link shows only then (serving the GPL-3.0 JavaScript likely counts as distributing it) |

### Answers that touch the standard modes

- `docs/questions-overnight.md` 13 to 21 (the analog crown's dip on E, the dial red on the other themes, focus view
  in modes drawn round their time, a tap on hidden controls, fullscreen after a resume, the analog seconds hand
  at rest, how brief the outline is, the focus frames' 13 px, "change" and the tip): each is built one way and
  works; an answer that changes one becomes a small fix in the round it touches.
- **Nothing else known:** no failing test (the reference run on 2026-11-24, after the recipes moved: 1,028
  passed, 100 skipped, 0 failed in Chromium, Firefox and WebKit; `npm run check` passes), and every download
  within its ceiling.

## 5. The remaining work, in order

Ordered to release the standard modes soonest (every question that held a round is answered by plan version
13 and the owner's answer to question 38). Each round finishes completely
(checks, the reference run in three browsers, its safety overview, decisions) before the next starts.

| Round | Builds | Frames | Waits on |
| --- | --- | --- | --- |
| **2.12** Test modes behind the flag only (**done**) | The owner's item 2 in full, with its tests; the advanced category without the switch. | "settings, advanced (release 2)"; the Release 2 display frame's flagged-visit line. | Nothing. |
| **2.13** The standard sizes and the recipe archive | The 260 px dial for ring and analog, the 48 px time inside ring and timeline, the compact 360 px timeline, every main block in the shared slot 26 px above the buttons, the analog rescale and its tile; the recipes reconciled (the frames win for the standard modes, and each corrected recipe is written back into the archive and checked again), the validator taking the archive's schema, and `recipe-check.py`'s checks made permanent tests. | The three ring frames, the three timeline frames, the analog frame, the Release 2 display frame's analog tile. | Nothing. |
| **2.14** Seconds, settings and notices | Seconds default "always" (stored settings never changed move to it), the seconds tip on the idle screen after the first completed session while seconds are still "always" (the fullscreen tip before the first session; one notice at a time; a dismissed or acted-on tip never returns), settings opening on display (first) with display mode at the top, the panel's slide, the seconds options' order, the credits page in the chosen theme and the legal pages' layout; every shared timer frame re-taken with seconds. | "the seconds tip, once only", "settings panel: slides in and out", "settings open on display, now first", "seconds: always (default), blur away, never", the running, focus, check-in and paused frames. | Nothing. |
| **2.15** Check-ins switch and keep screen awake | The two Release 2 timer controls; picture-in-picture's code behind the test flag, its row and button hidden at launch. | Release 2 settings: timer and display. | Nothing. |
| **2.16** Hardening, the launch list and the release review | The Release 2 passes over the standard modes and screens; the privacy and terms pages served by the app; the launch list prepared for the owner (section 4); `docs/safety/release-2.md`. | Every frame of the release. | The owner's two tasks (legal review, the repository public) and sign-off. |

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

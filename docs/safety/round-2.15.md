# Safety overview: Release 2, round 2.15 (The check-ins switch and keep screen awake; picture-in-picture behind the flag)

Date: 2026-11-25. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.15; the owner's answer 38 (Release 2 is the public launch; keep screen awake and the check-ins switch ship in it;
picture-in-picture moves to a later release, behind the test flag).

## 1. What changed

- **The check-ins switch** (timer, on by default; decisions 421, 422): off, no check-in falls due and a session
  runs on to the session maximum, the pause limit still applying; back on during a session, the count starts from
  that moment, so turning it on never makes a check-in due or missed. The plan's warning shows under the switch.
- **Keep screen awake** (timer, on by default; decision 423): a screen wake lock while the setting is on and the
  tab is seen, let go when hidden, asked for again when seen.
- **Picture-in-picture behind the test flag** (decision 424): only on a flagged visit in a browser with the
  Document Picture-in-Picture API, a display switch (off by default) and, when on, a corner button opening a small
  window with the timer's time and buttons. Without both, nothing of it exists or is downloaded.
- **The Release 2 timer frame** matched (900 px tall); the display frame, without the picture-in-picture row, is
  the launch's.

## 2. Data

- **Three settings** in the settings record (schema 4, no migration rule): `checkIns`, `keepAwake`,
  `pictureInPicture`, each a boolean, validated like every setting (anything but a boolean reads as the default).
  They stay on the device and travel only in a settings file the person exports, as every setting does.
- **The session record is unchanged.** Turning check-ins back on moves the open session's last sign of presence to
  that moment, a field it already had. Nothing marks a session as run without check-ins yet (Release 6 adds that).
- **Nothing is stored or sent** for the wake lock or the floating window. `docs/data-inventory.md` is updated.

## 3. Permissions used

- **Screen wake lock.** No permission prompt: browsers grant it to a visible page of a secure origin. The
  Permissions-Policy header (`camera=(), microphone=(), geolocation=()`) does not name `screen-wake-lock`, so it
  keeps its default allowlist, the site's own pages; nothing is opened to other origins (there are no frames: CSP
  `frame-src 'none'`, `frame-ancestors 'none'`). A unit test fails if the header ever disables it; an end-to-end
  test reads the served header and, in Chromium, the document's own verdict.
- **Document Picture-in-Picture** (flagged visits only). Not governed by the Permissions-Policy; the browser opens
  the window only on a person's click. The window is `about:blank` of the site's own origin and inherits the page's
  Content Security Policy and Trusted Types.

## 4. Inputs

| What | How it is checked |
| --- | --- |
| The three settings, read back from storage or a settings file | The settings schema's switch validation: a non-boolean reads as the default (check-ins and keep screen awake on, picture-in-picture off). The engine's rules take only an explicit false as off (unit tests). |
| The browser's wake lock answers | A granted lock is held and let go as above; a refusal (`DOMException`) is accepted quietly; any other error is reported through the crash path (only if crash reports are on). Unit tests cover grant, hide, show, off, a late grant and both kinds of refusal. |
| The browser's picture-in-picture answers | A refusal opens nothing; the window's content is made only with `createElement` and `textContent` from the site's own strings and the engine's view. |

## 5. Dependencies

None added or removed.

## 6. Security surface

- **No new endpoint, header or network request.** The Permissions-Policy is unchanged.
- **One new lazily loaded module** (`pip/pip.ts` and its stylesheet, 1.8 KB, ceiling 2.0 KB), fetched only on a
  flagged visit in a browser with the API, from the site's own origin under the same CSP and Trusted Types. The
  flagged-only files test now includes it: a visit without the flag fetches none of it even where the browser
  offers the window.
- **The floating window** takes the site's stylesheets by address (its own origin) and its constructed sheets by
  their rules; it holds no script of its own (its buttons' handlers live in the page) and nothing from storage
  reaches its markup.

## 7. Abuse cases

- **A settings record with check-ins off** (written by hand or imported) only removes check-ins, which the person
  can do anyway; sessions still end at the session maximum and a long pause still ends a session.
- **Rapid switching** of check-ins can at most restart their count, never date a pause or end a session.
- **Keep screen awake** cannot hold the screen while the tab is hidden: the browser lets go and the site asks again
  only once it is seen.
- **A crafted address** with the test flag can at most show the picture-in-picture switch, whose window shows the
  person's own timer; it cannot persist past the visit.

## 8. Tests

- **Results:** see the round summary in `docs/questions-overnight.md` for `npm run check` and the reference run in
  Chromium, Firefox and WebKit.
- **Unit tests:** rules with check-ins off (none due, the session maximum, the pause limit), normalisation; the
  engine switching check-ins off with one waiting, on again mid-session (counting from then), on while on; the
  settings declarations, order and defaults, older records reading the defaults; the wake lock
  (`shell/wake-lock.test.ts`); the Permissions-Policy (`build/headers.test.ts`).
- **End-to-end tests:** `e2e/timer-switches.spec.ts` (check-ins on by default with the warning as the switch's
  description and the frame's order; off, five hours with no check-in and the pause limit still ending the
  session; off mid-session and on again, the next check-in two hours after; the wake lock held while seen, let go
  when hidden, asked again when seen, never while off, off kept after a reload; the served Permissions-Policy and
  Chromium's verdict; no error with the browser's own wake lock), `e2e/pip.spec.ts` (without the flag no row, button
  or code even where the window is offered; with the flag and no window, neither; in Chromium, the row off by
  default, the button left of settings with the same look and separate 44 px tap areas, the window's time, buttons
  and theme, its buttons pausing, resuming and ending the session, closing cleanly, and the setting off removing
  the button and closing the window), the Release 2 timer frame (`e2e/settings.spec.ts`), and the flagged-only
  files test (`e2e/test-modes.spec.ts`).

## 9. Open risks and follow-ups

1. **Keep screen awake holds on every screen while the tab is seen** (idle, paused, results), as the plan's words
   say; question 40 asks whether it should hold only while a session runs.
2. **Check-ins off and the shut lid:** with no check-in to cap it, lid-shut time is credited up to the session
   maximum. This follows from the plan (the lid rule is the check-in's) and is what Release 6's verification marking
   is for.
3. **The floating window has no frame yet;** it is built plainly from the site's parts and stays behind the flag
   until the release that ships it draws one.

## Revision, 2026-11-25 (plan version 14; the owner's answer 40)

- **Keep screen awake only while a session is open** (decision 444): the wake lock is held while the setting is on,
  a session is running or paused (a check-in waiting counts as running) and the tab is seen; it is let go on the
  idle screen, on the results, when the tab is hidden and when the setting goes off, and a lock granted after any of
  these changed is let go at once. This closes open risk 1 above. Its line now reads "while elapsed is the active
  tab".
- **The check-ins switch's line** is the plan's new wording ("check-ins remind you that your session is still
  running. sessions without them still count toward your history, but not toward competitions."), and "pause
  limit" is "pause before ending" (round 2.14's revision).
- **Data, inputs, dependencies, security surface:** unchanged. The lock is asked for less often than before, never
  more; nothing is stored or sent for it.
- **Abuse cases:** a page left open on the idle screen or the results can no longer keep a screen on.
- **Tests:** unit tests (`shell/wake-lock.test.ts`: never asked on the idle screen, held once a session starts and
  through a pause without asking again, let go when it ends, asked again by the next session; a lock granted after
  the session ended let go at once; the earlier cases with a session open); `e2e/timer-switches.spec.ts` (idle not
  held; running held; hidden let go and seen asked again; paused still held; the results and the idle screen after
  them let go and not asked again; off never asked even while a session runs; on again mid-session held at once;
  off kept after a reload; a paused session restored on load held at once). The reference run's one failure, the
  interstellar seven-hour test (a test mode), was the test counting the held display's 180 ms fade right after the
  key that answered a check-in; the test now lets short fades end first (decision 445), and the performance spec
  passed twice over in all three browsers, with the timing tests on their own.

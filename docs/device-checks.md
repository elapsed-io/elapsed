# Checks on real devices

What the automated tests cannot see: how the site behaves on a real phone, installed to its home
screen, locked, asleep or slow. Run every section before the private test run ends and before each
release ships (plan, round 8 and Performance requirements: "measured on a slow phone"). Use the test
address (Cloudflare Access lets only invited emails in; see `docs/test-run.md`).

Record each run in the table at the end: the device, its system and browser versions, the date, and
any check that failed, with what happened instead. A failed check is fixed before the public launch,
or listed in `docs/known-issues.md` with the owner's decision.

Browser support (plan, Open decisions): the last two versions of Chrome, Firefox, Safari and Edge.
CI runs every end-to-end test in Chromium (Chrome and Edge's engine), Firefox and WebKit (Safari's
engine) on Linux; these checks cover what that cannot.

## iPhone (Safari)

### Installing to the home screen

1. In Safari, open the test address, then Share → Add to Home Screen.
   - [ ] The suggested name is "elapsed" and the icon is the placeholder: the ring's track and head dot.
2. Open it from the home screen.
   - [ ] It opens full screen, without Safari's address bar, in the dark theme's background colour.
   - [ ] The idle screen matches the timer frame scaled to the phone: the time, start, and the two corner icons.
   - [ ] Rotating the phone keeps everything on screen, with nothing to scroll sideways.

### Offline

3. Start a session in the installed app. Turn on Airplane Mode, close the app from the app switcher,
   and open it again.
   - [ ] It opens, the session is still running, and the time is right.
   - [ ] Ring and timeline modes open offline if they were used once online (settings → display).
4. Turn Airplane Mode off and end the session.
   - [ ] The results appear; nothing reports an error.

### Notifications

5. In Safari (not installed): settings → notifications.
   - [ ] The setting says iPhones need the site on the home screen, and no permission prompt appears.
6. In the installed app: switch on check-in notifications.
   - [ ] The system asks for permission only now. Allow.
7. Set the check-in interval to its shortest choice (30 minutes), start a session, and switch to
   another app (do not lock the phone).
   - [ ] When the check-in falls due, a notification arrives with the product's own words and no other
     content, and the device plays its own sound.
8. Repeat with the phone locked.
   - Expected limit: a locked iPhone suspends the page, and Release 1 has no push server, so the
     notification may arrive late (when the page next runs) or not at all. Record what happens; the
     session itself stays correct (step 10).
9. Pause a session and leave the app until 5 minutes before the pause limit.
   - [ ] The pause-limit notification arrives (same limit as step 8 when locked).

### Wake from sleep

10. Start a session, lock the phone for 10 minutes, and unlock it.
    - [ ] The time is right at once (it is computed from timestamps, not counted).
11. With a 30-minute check-in interval, start a session and lock the phone for 2 hours.
    - [ ] On unlocking, the session is "paused after a missed check-in", with the time of the
      unanswered check-in, and the locked time is credited for at most the interval plus the 1-hour
      answer window (plan, Check-ins).
12. Set the pause limit to 5 minutes, pause a session, and lock the phone for 10 minutes.
    - [ ] On unlocking, the session has ended, dated to when the pause began, and its results are shown.

### Screen reader and display settings

13. With VoiceOver on, swipe through the timer.
    - [ ] The order is: settings, the time (read in words, for example "12 minutes focused"), start.
      The account icon is skipped.
    - [ ] The time is never read out on its own as it changes; a check-in falling due is announced.
14. With Reduce Motion on (Settings → Accessibility → Motion):
    - [ ] The seconds cut out instead of blurring, the ring steps instead of turning, and the results
      appear without a replay.
15. With the text size at its largest (Settings → Display & Brightness → Text Size):
    - [ ] Nothing overlaps or is cut off in the timer, the results or the settings panel.

### Responsiveness

16. Tap start, pause, resume and end, several times each.
    - [ ] Each tap shows its change at once; the first pause blurs the display without a stutter.

## Safari on a Mac

The two service worker tests that Playwright cannot run in WebKit (decision 224), on the production
build served locally:

```bash
npm run build -w @stopwatch/web
```

```bash
npm run preview -w @stopwatch/web
```

17. Open `http://localhost:4173` in a new private Safari window with Web Inspector's Network tab open.
    - [ ] The default font (`timer-sans-….woff2`) is transferred once; a second line for it, if shown,
      says it came from the memory cache (decision 229).
    Then reload once and open Storage.
    - [ ] A service worker is registered and the cache holds the site's files.
18. Network tab: press Space to start a session.
    - [ ] One `POST /api/count` goes to the network (it fails locally with no endpoint, which is fine),
      and Storage → Cache Storage has no entry under `/api/`.
19. Kill switch: edit `packages/web/dist/sw-control.json` to `{"serviceWorker":"off"}` and reload twice.
    - [ ] Storage shows no service worker and no caches. Undo the edit afterwards (a new build also
      rewrites it).
20. Develop → Show Web Inspector → Timelines, record, then click start, pause, resume and pause again.
    - [ ] Each click is followed by a painted frame within 100 ms, the first pause included (decision 234:
      Playwright's WebKit on CI, drawing in software, took up to 117 ms for the first pause).
21. Settings → notifications in Safari on macOS: switch on, allow, start a session, switch to another app.
    - [ ] The check-in notification arrives.

## A low-end Android phone (Chrome)

The plan asks for a low-end Android phone: for example one with 2 to 3 GB of memory and an entry-level
processor (an Android Go phone, or a budget model a few years old). Measure with Chrome's own tools
only, over USB (chrome://inspect on a computer); no third-party monitoring.

22. First visit on a slow connection (DevTools → Network → Fast 4G, cache disabled).
    - [ ] The idle screen appears drawn as the frame, with the time in its font, without a jump when the
      font arrives.
    - [ ] Start responds to the first tap at once.
23. DevTools → Performance: record starting, pausing, resuming and ending a session.
    - [ ] Each tap is followed by a painted frame within 100 ms, and no task takes 50 ms or more.
24. Performance monitor during a running session, in each display mode, after the first minute:
    - [ ] CPU stays near 0 % between the once-a-minute updates; nothing redraws every frame.
25. The results replay, after a session of at least an hour in ring mode.
    - [ ] It runs smoothly, with the arcs revealed behind the hand and never ahead of it.
26. Settings: open the panel, switch categories, choose another font, open advanced (the editor loads).
    - [ ] Each opens without a visible stall.
27. Put Chrome in the background for 30 minutes during a session, then return.
    - [ ] The time is right at once, and the session was not marked as abandoned.
28. Install to the home screen (Chrome menu → Add to Home screen or Install app) and repeat steps 3 and 4.
    - [ ] Same results as on the iPhone.
29. Notifications: switch on, allow, set the shortest check-in interval, switch to another app.
    - [ ] The notification arrives at the check-in, or record how late (Chrome may freeze a page left in the
      background, the same limit as step 8).
30. A one-hour session with the screen on, in digits mode.
    - [ ] The phone does not get warm, and the battery use shown for Chrome is no more than for an
      ordinary web page left open.

## Other desktop browsers

31. Firefox and Edge (latest), on any computer: one session from start to results in each display mode,
    and every settings category.
    - [ ] Everything looks as in Chrome, and nothing reports an error in the console.

## Runs

| Date | Device | System | Browser | Checks failed | Notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

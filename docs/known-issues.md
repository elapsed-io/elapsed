# Known issues

What is known before the private test run, so testers need not report it and the owner can decide what
must change before the public launch. Send anything else to **support@elapsed.io**. Each entry says why
it is so and where it was decided; "launch" marks what must be settled before the public launch.

## Limits of the web platform

- **Notifications on a locked or backgrounded phone may be late or missing.** The page shows a check-in or
  pause-limit notification when its own timer fires. A locked iPhone, or Chrome on Android after a while
  in the background, stops running the page, and Release 1 has no push server, so the notification can
  arrive when the page next runs, or not at all. The session itself is always right when the page runs
  again: the rules are replayed from timestamps. On iPhone, notifications work only once the site is on
  the home screen, and the setting says so. (`docs/device-checks.md`, steps 8, 9 and 29.)
- **Safari removes a site's stored data after seven days without a visit**, unless the site is on the home
  screen: settings, custom CSS and your own font file would then be gone. This is Safari's rule for every
  site; adding elapsed to the home screen avoids it.
- **A hidden tab wakes every 30 seconds.** Nothing is drawn while the tab is hidden; the only wake is the
  heartbeat (so a long background session is never mistaken for a sleeping device), and the tab title
  follows in that wake, so it can trail the minute by up to 30 s. Check-ins and the pause limit are applied
  at the next heartbeat, dated when they fell due. Accepted by the owner (decision 246).

## Not in Release 1

- **The account icon does nothing.** It is drawn, as in every frame, and hidden from screen readers and
  the keyboard; accounts arrive in Release 3 (decision 218).
- **The personal-record colour is not checked for text contrast**, because nothing in Release 1 shows a
  record (decision 207). It must pass before records arrive.
- **The privacy page and terms live on the soon page's project.** **Launch:** they must move into the app
  (or the app must serve them at `/privacy` and `/terms`) before elapsed.io moves to it
  (`packages/soon/README.md`).

## Seen only in automated browsers

- **Playwright's WebKit can take over 100 ms to paint a pause** (its script takes a few ms), because it
  draws the blur in software at twice the pixels on a CI machine without a GPU; the timing test there judges
  the script's time (`e2e/timing.spec.ts`). Chromium (also with
  a four-times-slower processor) and Firefox stay well under 100 ms. Safari on real devices is measured by
  hand (`docs/device-checks.md`, steps 16 and 20; decision 234).
- **WebKit reports the default font as requested twice.** Whether Safari downloads it twice or answers the
  second from memory is checked in Web Inspector (step 17; decision 229).
- **Two offline tests cannot run in WebKit** (the kill switch, and that counts are never answered from a
  cache), because Playwright cannot route a service worker's requests there. They run in Chromium and
  Firefox and are checked by hand in Safari (steps 18 and 19; decision 224).
- **Exact pixel checks hold only in the reference environment** (Chromium in Playwright's image: CI and
  `npm run test:e2e:docker`). Run directly on a Mac, or in Firefox and WebKit, frames are compared after
  setting aside sub-pixel text placement (decisions 226 and 241).
- **Outside Chromium, frame comparisons allow sub-pixel glyph placement.** Firefox and WebKit place the
  digits in a moving layer a fraction of a pixel from the static frame; a control test shows a wrong frame
  still fails by far (decision 226).

## The test run itself

- **Cloudflare Access keeps testers' email addresses, sends them sign-in codes, logs sign-ins and sets a
  sign-in cookie on the test address.** The invitation says so (`docs/test-run.md`, step 6); it ends with
  the test run. The public site has no Access and no cookies.
- **Usage counts and crash reports from testers go to a separate test database**, deleted after the run.

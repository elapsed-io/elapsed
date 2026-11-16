# elapsed: Build Plan for Claude Code

Nov 13, 2026 · @Jeffrey

## How to use this plan

Build the site in the rounds listed under Release roadmap, in order, one round per working session.

- A **round** is one coherent unit of code. Every round ends with a written safety overview.
- A **release** is a group of rounds that ships to the public. Every release ends with a full safety review before deploy.
- The Architecture invariants section is binding in every round. Later releases add modules; they do not restructure.
- Stop and ask the owner when a round touches an item under Open decisions, or when a request conflicts with a rule here.

## Product summary

The product is a website that opens directly on a stopwatch for tracking focused work, the way monkeytype opens directly on a typing test.

- **Owner:** humanbn (humanbn.com). The product is called elapsed, written in lowercase, at elapsed.io. The name still lives in one brand config, so any future rename touches one file.
- **Audience:** students from high school upward, and Gen Z users generally.
- **Two uses:** an on-camera prop on a second monitor or propped-up phone, and a background tab that tracks focus time. Desktop first, but every screen works on a phone.
- **Default look:** a large centered time, small buttons, discreet settings and account icons in a corner, and lowercase interface text throughout. Users can change almost all of it.
- **Guests** get the full timer, themes, fonts, custom CSS and built-in widgets; free-form layout editing comes with the paid unlock. **Accounts** add tracking (history, streaks, personal records) and widgets that connect calendars, to-do lists and email.
- **Out of scope until Release 6:** leaderboards, competitions and other social features.
- **Design file:** the screens and display modes live in a separate design canvas handed over with this plan. Every screen is built to be identical to its frame; the Design system section records the exact values.

## Principles

Each of the four core development points is stated as rules that can be checked in code review.

| Principle | Rules |
| --- | --- |
| Customizable | Almost everything is user-customizable, and every design in the design file is only a default. A user can import their own background, move, rotate, stretch or hide any element (the timer, buttons, icons, widgets), and retune colours, fonts, timings and each display mode's parameters. Each new feature exposes its look and behaviour through the settings schema and CSS variables from its first round, never as hard-coded values. |
| Appealing and fast | Animations use only `transform`, `opacity` and `filter`, with smooth easing so motion reads as fluid. There is exactly one exception: a results replay is driven by a single animated custom property holding its progress, from which its SVG stroke offsets, the clock hand's rotation and the headline count are all derived. Anything that moves with time (the ring's head, the analog hand, the timeline track) glides continuously through a linear CSS animation, never in once-a-minute jumps; with reduced motion or low power it steps once a minute instead. Every time-based animation runs from the session's own times, so opening settings or any other overlay never restarts, skips or jumps it. `prefers-reduced-motion` is honoured. Controls respond within 100 ms. The display re-renders only when the visible value changes. CSS does all motion; JavaScript only changes state when something happens, such as a minute ticking over, a check-in falling due or a button press, and never runs an animation loop. |
| Lightweight | No UI framework. First load is at most 150 KB compressed, including one self-hosted font, with at most 50 KB of JavaScript. CI warns when a budget is exceeded and fails only past twice the budget; see Loading and performance. Display modes, the layout editor and widgets are lazy-loaded. Every runtime dependency needs owner approval. |
| Private | No ads, analytics or third-party requests from the timer page itself. Exceptions are isolated and opt-in: Google sign-in on the account page, and widgets a user connects, which run in a separate sandboxed origin, plus Cloudflare's CAPTCHA on the sign-up page only and, for signed-in users, the live-sync connection to the project's own Supabase database. Anonymous usage counts (daily visits and sessions started, with nothing that identifies a person or device; a visit is a page load that is not a reload or a back-and-forward navigation, and nothing is stored on the device to count it) are on by default and can be switched off in settings. Crash reports are opt-in and go only to our own server. No cookies for guests. Only the data listed under Privacy is collected. |
| Safe | A strict Content Security Policy from round 1. No `eval`. No `innerHTML` with dynamic content. All input is validated at the boundary, including data read back from storage, imported files and widget data. Every round ends with a safety overview. |

## Decisions already made

These are settled by the owner and are not to be reopened during a round.

- **Defaults, not rules:** everything below that describes a look or a feel is the default. Users can change almost all of it.
- **Timer:** counts up from 00:00:00. There is no countdown mode. Every time display is centered by default.
- **Seconds:** visible at start. Each seconds digit blurs away when the digit to its left first changes (the ones digit by 00:00:10, the tens digit and colon by 00:01:00), leaving a static hh:mm. A setting keeps seconds visible.
- **Controls:** start morphs into pause, and end appears to its right. Ending opens a "tabulating results" screen with a 5-second progress bar, cancel on the left and end now on the right, matching pause and end. End now ignores input for its first 300 ms, so a double-click on end cannot skip the countdown. Cancel resumes with no time lost. If the countdown finishes or end now is pressed, the session ends at the moment end was pressed; the countdown seconds count only if the user cancels. On the results screen, retry and Space return to the idle screen, ready for a new session; the settings icon opens settings over the results. Share opens the share sheet on touch devices and copies the text on computers; after copying, the share icon becomes a check mark for 2 seconds and screen readers hear "copied". If the browser refuses to copy, the icon shows a small cross for 2 seconds and screen readers hear "couldn't copy". Sessions under a minute still get the countdown and results. Reloading while results show brings them back from tab storage in their final state, without replaying. Sessions that end automatically skip the countdown.
- **Results:** fade in from the tabulating screen. Focused time is the headline, with all session data beneath and a replay animation drawn in the session's display mode. Pauses are left blank. Retry and share icons sit below. Share sends a short line of text with the focused time and a link (for example "i studied for 2h 47m on elapsed") through the device's share sheet, or copies it on desktop. For accounts, the link opens that session's results page exactly as the owner saw it after finishing, and the owner sets each link to private or viewable by anyone with the link; guests share a link to the site. If a session switches display modes, the replay uses the mode shown longest; a session that started in ocean depth, height or interstellar keeps that mode for its whole replay and progress.
- **Interface:** lowercase text, small buttons, settings and account icons on every screen except the ending countdown and the brief tabulating moment, as drawn, and a cleanly organized, searchable settings panel that opens over the running timer and previews changes live. There is no command palette, and no first-visit tutorial or hints. Each settings section has a reset button, each display mode's options live in the display mode section, guests see account-only settings with a prompt to create an account, and on phones each section is its own page. Links to about, privacy, terms, feedback, source code and donations sit in a small footer inside settings and the dashboard; each link appears once its page exists. Guests see "changes are autosaved"; "synced to your account" appears only for accounts. A small "saved" check appears to the left of the settings panel's close button after each change. Display modes are chosen from tiles with a small preview icon of each mode. Settings categories appear only once they contain a setting, and each open category ends with a small "reset" text button. Destructive actions ask first with an inline confirm step, as drawn in the Advanced frame: "reset all settings" restores every choice but keeps custom CSS, fonts and images, while "clear device data" removes everything stored in the browser and says so in its confirm step. Before its confirm step, "reset all settings" is a row like "clear device data": a label and a small red button. Importing a settings file that would replace existing custom CSS asks first with the same confirm step. Paid features appear blurred behind an "unlock · $5 once" badge with a one-line summary of everything the unlock includes; there are no pop-ups or repeated reminders. Screen-reader time announcements in drawn modes are a setting, off by default; the time can always be read on demand. Widgets and layout are edited in one customize mode, entered from settings, or with a long press on phones. Accounts get a dashboard. By default it shows the core metrics (total focused time, current streak, personal record), the year heatmap and session history. Insights, charts, records and the goal section are optional sections; adding, hiding and reordering sections is entirely part of the paid unlock. Each stat can be shared on its own. From Release 5, an awards section shows badges for milestones and challenges; badges appear on the dashboard, not on individual sessions. Totals over a day read as hours and minutes (412h 18m). The week start is a setting. Records for ambient modes appear only after the user has tried that mode. Insights are plain facts computed by simple, deterministic rules, with no AI.
- **Themes:** each theme is three colours: background, foreground (the time and button text) and accent (focus in results, the ring, clock hands). Every other colour derives from these. About ten presets ship; the default dark and light themes are near-black and near-white, and the rest use coloured backgrounds. Presets must pass contrast checks: text at least 4.5:1, accent graphics at least 2.5:1 against the background. Button colours can be overridden with custom CSS. From Release 5, a marketplace lets anyone browse and install community-made CSS configs for free; paid configs may come later. Release 2 builds the free-form layout editor fully but switches it on only with the unlock in Release 3; until then everyone gets preset positions. Ocean life and the final art will be commissioned, under a contract that grants the right to modify and publish the art; art files carry their own license, separate from the GPL code.
- **Font:** user-selectable. The default is Archivo, narrowed through its width axis. It is licensed under the SIL Open Font License 1.1, which allows free use, self-hosting and bundling in commercial or non-commercial projects. The repository must ship the license file with the font, the font cannot be sold on its own, and a modified version cannot keep the Archivo name.
- **Layout:** every on-screen element is a layer that can be moved, rotated, stretched, resized, hidden and reordered in a layout editor. Users can import a background image from their device; it stays on that device and is never uploaded. Layouts are saved per display mode and per screen size (desktop and phone; the phone default is designed for the phone rather than scaled down) and can be reset to the default. Free-form editing is part of the paid unlock; everyone can place widgets in preset positions.
- **Display modes:** digits, ring and timeline ship in Release 1; analog stopwatch, ocean depth, height and tree in Release 2; interstellar distance as a test mode. Ice melt is dropped. Every mode, native or third-party, receives the same timer events.
- **Ambient modes loop or cap:** the tree cycles through a one-hour year indefinitely. Ocean depth sinks at a fixed rate and stops at Challenger Deep. Height climbs at 140 m per focused minute, darkens toward black and reveals stars as it nears space, and stops at the Kármán line.
- **Interstellar:** the solar system sits at the center on a logarithmic map, and the user travels outward at light speed. The background is a real star field with accurate positions for bright stars and well-known groups such as Orion and the Pleiades; it stays still, because those stars are too far away to shift noticeably on a solar-system scale. Guests travel per session. Accounts accumulate distance across all sessions, which is the only way to reach the Oort cloud and beyond.
- **Tree:** side and isometric views, chosen in settings. Leaves are gone before winter begins, and winter shows snow on bare branches. The isometric tree stands on a simple grassy field.
- **Ocean life:** pausing in ocean depth brings in fish and animals accurate to the current depth, picked at random from a small catalog per depth zone. They appear as schools and individuals at several distances, near and far, and leave as soon as the timer resumes.
- **Widgets (accounts):** users can place widgets on the timer screen that show and act on their calendars, to-do lists and email. The first integrations are Google Calendar, Apple Calendar, Canvas and Gmail, with more to follow, and all are read-only at first. Canvas starts with its read-only calendar feed; applying for a developer key that schools can enable waits until the product is large enough; Notion Calendar is covered through the calendars it syncs. Widgets can be shown always, only while paused, or only outside sessions. Every connected widget has a fallback, usually a calendar link, for school accounts that block third-party apps. One connected widget is free; more come with the paid unlock. A weekly goal widget sets a soft target and adds a goal section to the dashboard; it is never a countdown. Widgets can go anywhere except a no-widget zone around the timer, in every display mode, and around the buttons.
- **Personal record indicator:** must work in every display mode through a shared event, never through mode-specific code.
- **Art assets:** ocean life and other ambient art start as placeholders; the app has no sounds at all. They load through an asset registry so final files drop in without code changes.
- **Guests:** full timer, settings, themes, custom CSS and built-in widgets (clock, scratchpad), all kept on the device. No history, streaks, records, free-form layout editing or connected widgets without an account.
- **Guest invite:** the end screen invites a guest to create an account. Signing up in the same tab saves the session just finished.
- **Guest storage:** the browser's local storage holds only the active session and settings; an imported background image is kept on the device in IndexedDB. A finished guest session moves to tab-scoped storage (`sessionStorage`) and is deleted when the tab closes or a new session starts. Nothing is sent to a server. On a shared browser, device data is kept separately for each account, and signing out offers to remove that account's data from the device. When a guest signs up, their settings, layout, theme, device images and the session just finished carry over.
- **Survival:** a session survives refresh, tab close and a shut laptop lid. With an account, one live session exists across devices: a session started on a laptop appears on a phone and can be paused there. If two devices each start a session while offline, both are kept as separate sessions when they reconnect, so nothing is lost and the user can delete one. The site works offline and installs to a home screen as a web app, syncing when back online. Optional system notifications cover check-ins and the pause limit, and permission is requested only when they are switched on. On iPhones, web notifications work only after the site is added to the home screen, and the setting says so.
- **Check-ins:** one rule covers open and shut lids, and lid-shut time is credited for at most one check-in interval plus the 1-hour response window. From Release 2, anyone can switch check-ins off; the setting warns that sessions without check-ins count towards history but won't count towards competitions. Sessions without check-ins still count toward personal records and streaks; personal history carries no verified or unverified tags.
- **Pause limit:** a pause longer than the limit ends the session, dated to when the pause began. The default is 30 minutes, adjustable from 5 to 60. Research sets no such threshold, so this is a product definition. A changed limit applies from the next pause. A pause caused by a missed check-in ignores the limit and waits up to 12 hours instead.
- **History:** sessions under 1 minute are not saved. A day counts toward a streak at 15 focused minutes, and a streak counts qualifying days and survives one busy day: it breaks only when 48 hours pass after the last qualifying session without another. Two qualifying days inside that window both count. There are no streak freezes. Free accounts keep 12 months of sessions, and older sessions are deleted; lifetime totals, personal records and best streaks are kept for everyone, and the paid unlock keeps all history. Sessions have no labels. Users can delete a session but cannot edit one or add one manually.
- **Accounts:** email and password, or Google sign-in, plus a display name (not unique) chosen at sign-up and editable later. Names pass a word filter and can be reported. A name is public only in competitions and on CSS configs a user publishes to the marketplace. Accounts are for ages 13 and up; guests have no age limit because guest mode collects nothing that identifies a person. Email is required and is the recovery route. It is used only for verification, password resets and receipts; any future marketing email, such as merchandise drops, would be strictly opt-in. Deleting an account deletes all its data, including the paid unlock, and both checkout and the deletion screen say so. There are no public profiles; the dashboard is always private. Free accounts sync every setting across devices; the unlock adds per-device settings. Only choices sync: anything the user creates (custom CSS, font files, background images) stays on the device where it was made. Statistics: totals by day, week, month and all time, streak, record, average session and a calendar heatmap. When sessions sync, the server checks their times against its own clock and flags any that don't fit, so changing the device clock cannot fake a session or a record.
- **Discipline:** the site does not block or monitor other apps or sites. It relies on the user to stay on task.
- **Business:** free with no ads, plus a one-time $5 unlock for free-form layout editing, more than one connected widget, session history beyond 12 months, dashboard customization, per-device settings and, once they exist, competitions. Optional donations later, a public repository that anyone can read, at github.com/elapsed-io/elapsed, owned by the project's GitHub organization rather than a personal account, with contributions from the team only, and English only at launch. Feedback and bug reports arrive through several channels that all reach the developers; the channels are still to be named. This is a passion project: running costs beyond revenue are accepted. Success is measured from data the product already holds, counted in aggregate: account sign-ups, sessions, returning accounts and, later, social participation.
- **Social features:** deferred until integrity is designed.

## Architecture invariants

The framework below is fixed from round 1, so later releases add modules instead of restructuring.

**Stack:** strict TypeScript, Vite for the build, plain CSS with custom properties, and no UI framework. Release 1 is a static site plus one small endpoint that receives anonymous usage counts and opt-in crash reports. The endpoint is a Cloudflare Worker on the site's own address that writes daily totals to Cloudflare D1 through a direct binding, so no database key is stored, nothing pauses while the site is idle, and the anonymous counts live apart from account data in Supabase.

```text
/packages/core   Pure TypeScript: session model, timer engine, events, validation. No DOM, no network.
/packages/web    The site: UI shell, display modes, themes, settings, storage adapters.
/packages/api    Added in Release 3: accounts and session sync. Imports core for validation.
/docs            decisions.md, data-inventory.md, safety/ (round overviews)
```

1. **Timestamps, not ticks.** Elapsed time is computed from stored timestamps. The engine takes an injected clock so tests can fake time.
2. **Sessions are segments.** A session is a list of running segments. Every statistic is derived from them, so rules can change later without migrating data.
3. **Typed event bus.** The engine emits events. The UI, display modes, widgets and later the statistics module subscribe. Nothing calls across these layers directly.
4. **Display-mode contract.** Every mode implements the interface below, including a results replay. Digits is built through the contract, not as a special case.
5. **Layers and layouts.** The timer screen is a list of layers (background, display mode, buttons, icons, widgets), each with position, size, rotation, stretch, visibility and order. Layouts are data, saved per display mode, and the layout editor only edits that data. Every mode reports its rendered bounds, so the no-widget zone follows the timer however it is moved, rotated or stretched.
6. **Storage behind interfaces.** `SessionStore`, `SettingsStore` and `MediaStore` hide where data lives. Release 1 ships local adapters; Release 3 adds remote ones. No other module touches browser storage.
7. **Capabilities, not identity checks.** Code asks `can('history')` or `can('widgets')`, never `if (user)`. Guests and accounts differ only in their capability set.
8. **Themes are three tokens.** A theme defines background, foreground and accent; every other colour is derived in one place. All colours, sizes, fonts and timings are CSS custom properties, with cascade layers ordered `base, theme, mode, user`. CI checks every preset for contrast.
9. **Settings schema drives customization.** Every customizable value is declared once in a typed settings schema with its default, range and the CSS variable or engine option it controls, so the settings panel, layout editor and custom CSS stay in step as features grow.
10. **Versioned schemas.** Settings, layouts and sessions carry a schema number and a migration function from the first round.
11. **One config module.** Every tunable number (thresholds, limits, durations, sink and climb rates) lives in one file.
12. **One brand module.** The product name, domain and user-facing copy live in one file, ready for the final name.
13. **Asset registry and vector art.** Ambient art (ocean life, tree, field, star catalog) are referenced by key with placeholder defaults, so final files replace them without code changes. Art is inline SVG whose colours are CSS custom properties, so custom CSS can restyle it. Raster textures are avoided: they add weight and cannot follow the theme. Catalogs load only when their mode is used. Display modes are downloaded on demand and cached for offline use, and a downloaded mode can be removed from the device to free space. Widgets are installed one at a time from a widget menu; only installed widgets load, so users who never add one load no integration code.
14. **Widget platform.** Each widget runs in a sandboxed iframe on a separate origin and talks to the timer page only by message passing. Data comes straight from the provider in the browser where the provider allows it, so email and calendar contents never pass through our servers. Where a provider requires a server, a pass-through proxy forwards requests without storing contents. Tokens are encrypted at rest, scopes are the narrowest available, and widgets are read-only unless the user turns on an action such as checking off a to-do.
15. **One active session per browser.** Open tabs coordinate through `BroadcastChannel` and show the same session.
16. **Security is framework.** The CSP, the ban on third-party origins on the timer page, the widget sandbox, and the separation of the timer view from credential forms are part of the structure.

```ts
interface DisplayMode {
  id: string;
  mount(root: HTMLElement, ctx: DisplayContext): void;
  render(view: TimerView): void;                 // called only when the visible value changes
  onEvent?(event: TimerEvent): void;             // milestones, record passed, check-in due
  replay(root: HTMLElement, s: Session): void;   // results animation for this mode
  unmount(): void;
}
```

## Loading and performance

The app loads in tiers, so a first visit costs only what the timer needs.

| Tier | Contents | Loads when |
| --- | --- | --- |
| Core | Timer engine, digits mode, start, pause and end, theme tokens, one trimmed font | First visit; cached for offline use |
| On first use | Settings panel, results screen | Opened |
| On choice | Each display mode with its art, the layout editor, the custom CSS editor, user fonts | Picked |
| Installed | Each widget, in its own sandboxed frame | Installed from the widget menu |
| Account pages | Sign-in, dashboard, payment | Visited; separate pages |

- **Packages and manifests:** each display mode and each widget is a self-contained package with a manifest declaring its name, size budget, art, and for widgets the permissions it needs. The app finds packages through a registry and never imports one directly, so adding or removing a mode or widget means adding or removing its package.
- **Downloaded modes:** never fetched in advance. A mode is cached when picked and removed automatically after 30 days unused, or by hand in settings.
- **Budgets:** core at most 50 KB of JavaScript and 150 KB in total, compressed; each display mode at most 30 KB of code and 150 KB of art; each widget at most 40 KB; the dashboard at most 60 KB with no chart library. CI warns when a package passes its budget and fails the build only past twice the budget.
- **Fonts:** Archivo is cut down to the default width, the weights in use and the characters needed. Other fonts download only when chosen. The settings font grid shows each name using a tiny subset of that font containing only the letters of its name, loaded only when the appearance category opens. The built-in fonts are Archivo (default), Barlow Semi Condensed, Saira, Inter, Space Grotesk, Sora, Manrope, Outfit, Lexend, IBM Plex Sans, JetBrains Mono, IBM Plex Mono, Roboto Mono and DM Mono. Each must be free to reuse and have tabular figures, so the time never shifts as digits change; a font without them is dropped from the list. Users can load their own font file; like background images, it stays on the device and is checked for format and size.
- **Custom CSS:** cleaned once, when saved, and stored cleaned, so pages apply it directly and the checker loads only with the editor.
- **Rendering:** redraw only when the visible value changes. Once the seconds blur away, the digits change once a minute. Ambient modes move through slow CSS transitions rather than per-frame drawing, and all animation stops while the tab is hidden.
- **Low power:** a setting that freezes ambient animation and shows only the time. It is turned on by hand and also follows the system's reduced-motion preference. Browsers do not reliably report battery saver mode; where a browser reports a low, discharging battery, the app may suggest low power.
- **Server-side totals:** the dashboard receives daily totals and pre-computed records, never the full session history; history loads a page at a time.
- **Split catalogs:** ocean life loads one depth zone at a time, and the star catalog is a few kilobytes of numbers.

## Settings catalog

Every setting below is declared once in the settings schema. Categories run from what a new user changes first to what only experts touch. Each category has a reset button, a search box covers all of them, and on phones each category is its own page. "Unlock" marks the $5 one-time unlock.

### 1. Timer

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Seconds | Blur away, always show, never show | Blur away | Everyone |
| Check-in interval | 30 min to 3 h | 2 h | Everyone |
| Check-ins | On, off. Turning them off shows: "sessions without check-ins count towards your history, but won't count towards competitions" | On | Everyone (Release 2) |
| Pause limit | 5 to 60 min | 30 min | Everyone |
| Keep screen awake | On, off; only while the site is the active tab | On | Everyone (Release 2) |
| Keyboard shortcuts | Fixed and listed here: no modifier keys, so they never clash with browser shortcuts, and they never fire while typing | Space starts and pauses, E ends, comma opens settings | Everyone |

### 2. Display

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Display mode | Digits, ring, timeline, analog stopwatch, ocean depth, height, tree, interstellar (test) | Digits | Everyone |
| Mode options | Shown for the chosen mode: tree view (side or isometric), ocean life, results landmarks | Side view; ocean life on; landmarks on | Everyone |
| Picture-in-picture | On, off: adds a button to the timer's top-right icons that opens a small floating timer window. The setting and the button appear only where the browser offers a window for a page (Chromium browsers) | Off | Everyone (Release 2) |
| Personal record marker | On, off | On | Accounts |
| Downloaded modes | List with sizes; remove any | Unused modes removed after 30 days | Everyone |

### 3. Appearance

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Theme | About ten presets | Graphite | Everyone |
| Theme colors | Background, foreground, accent | From the preset | Everyone |
| Font | A grid of 14 built-in fonts, each name shown in its own font, or your own font file (woff2, woff, ttf or otf, up to 2 MB, kept on the device and never uploaded) | Archivo | Everyone |
| Time size | One slider from 50% to 150% that scales the timer with its proportions locked; it changes the same value as the layout editor | Default | Everyone |
| Clock format | 12-hour, 24-hour, follow region (for clock times such as "started 2:02 pm"; elapsed time stays hh:mm) | Follow region | Everyone |
| Animation speed | Slower, normal, faster (Release 2, with the ambient modes); scales every animation's duration, including results replays, and "normal" is the timing in the Design system | Normal | Everyone |
| Low power | On, off | Off | Everyone |

### 4. Notifications

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| System notifications | Check-ins, pause limit (5 minutes before a pause would end the session); the device plays its own sound | Off; iPhones need the site on the home screen | Everyone |

The app plays no sounds of its own anywhere.

### 5. Layout and widgets

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Customize mode | Preset widget positions; free-form layout | Default layout | Everyone (preset); unlock (free-form) |
| Background image | One per display mode, imported from the device | None | Everyone |
| Widgets | Widget menu: clock, scratchpad, weekly goal, connected apps | None | Everyone (built-in); accounts (goal, connected) |
| Widget visibility | Always, only while paused, only outside sessions | Always | Everyone |
| Connected apps | Connect, disconnect, calendar-link fallback | None | Accounts: one free, more with unlock |
| Reset layout | Per display mode and screen size | — | Everyone |

### 6. Accessibility

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Reduced motion | Follow system, on, off | Follow system | Everyone |
| Screen-reader time announcements | Off, on request, every hour | Off | Everyone |

### 7. Stats

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Week starts on | Monday, Sunday, follow region | Follow region | Accounts |
| Dashboard sections | Add, hide, reorder | Core metrics, heatmap, history | Unlock |

### 8. Account

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Display name | Free text, word-filtered | Chosen at sign-up | Accounts |
| Email and password | Change, with re-confirmation | — | Accounts |
| Google sign-in | Link, unlink | — | Accounts |
| Unlock | Buy once for $5 | — | Accounts |
| Per-device settings | On, off | Off | Unlock |
| Export data | Download a file of all your data | — | Accounts |
| Delete account | Deletes all data, including the unlock | — | Accounts |

### 9. Privacy and data

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Anonymous usage counts | On, off | On | Everyone |
| Crash reports | On, off | Off | Everyone |
| Storage on this device | Images, fonts and modes with sizes | — | Everyone |
| Clear device data | Removes everything stored in this browser | — | Everyone |

### 10. Advanced

| Setting | Options | Default | Available to |
| --- | --- | --- | --- |
| Custom CSS | Editor; cleaned when saved | Empty | Everyone |
| Safe mode | Start once without custom CSS and layouts | — | Everyone |
| Import and export settings | A file with your choices and custom CSS; fonts and images stay on the device | — | Everyone |
| Reset all settings | Back to every default | — | Everyone |

About, privacy, terms, feedback, source code and donations sit in the footer, not in a category.

## Design system

The design canvas is the visual source of truth. Every product screen is built to match its frame: the same layout, proportions, colors, type and motion. Where a frame and this section disagree, stop and ask the owner. Frames are drawn at reference sizes (timer screens 720 × 450, results 720 × 520, settings and dashboard 1280 wide). In the product, only the time and the gap below it scale, by min(window width ÷ 720, window height ÷ 450), multiplied by the time size setting. Buttons, button text, corner icons and their insets stay at the frame's pixel sizes at every window size, including phones, where the time shrinks to fit but controls never get smaller than the frame. A dedicated phone frame may refine this later. Results screens follow the same idea: the focused headline scales like the time; text, stats, icons and buttons stay at frame sizes; the replay graphic (strip, rings or chart) shrinks to fit narrower windows but never grows past its frame size; and below 720 px wide the six stats wrap into two rows of three.

### Frame index

| Frame | Shows | Release | Status |
| --- | --- | --- | --- |
| Idle | Time at 00:00:00 and the start button | 1 | Build |
| Running | Seconds blurring away after start | 1 | Build; the canvas runs it at 5× speed for review |
| Check-in | Blurred time with "press any key if you're still here" | 1 | Build |
| Paused | Blurred time with "paused for" and the pause length; a second frame, "paused after a missed check-in," adds the time of the unanswered check-in | 1 | Build |
| Ending countdown | "Tabulating results," the 5-second bar, cancel and end now | 1 | Build |
| Session maximum | The 16-hour notice | 1 | Build |
| Results: digits and timeline | Focus strip replay | 1 | Build |
| Results: analog and ring | One ring per hour | 1 (ring), 2 (analog) | Build |
| Ring, timeline | Running displays | 1 | Build; the personal record marker arrives in Release 3 |
| Idle and results, paper theme | Light theme | 1 | Build |
| Themes | The ten presets | 1 | Build |
| Settings panel | Panel over the running timer, every category (final). Six Release 1 frames (timer, display, appearance, notifications, privacy and data, advanced) show each Release 1 control, and four Release 2 frames (timer, display, appearance, advanced) add the Release 2 controls and the new modes' tiles | 1 | Build; categories fill in by release |
| Analog stopwatch | Running display | 2 | Build |
| Ocean depth: running, 0 to 20 m, paused | Light model and placeholder ocean life | 2 | Build; ocean life art is a placeholder |
| Tree: side and isometric | Seasons over a one-hour year | 2 | Build; the canvas runs them at 60× speed |
| Height | Climb with stars appearing | 2 | Build; the canvas compresses the climb |
| Interstellar: running and results | Centered map and star field | 2 (test) | Build |
| Results: ocean depth, tree, height | Mode replays | 2 | Build |
| Layout editor | Moved, rotated and stretched elements | 2 | Build; the dune scene stands in for a user's own image |
| Dashboard, default and with every section | Core metrics, heatmap, history; optional sections | 3 | Build |
| Widgets, normal and edit mode | Widget cards and no-widget zones | 4 | Build; sample data, and Gmail arrives in the third wave |
| Font options | Archivo and two alternatives | — | Reference only; build Archivo |
| Blind mode | Time blurred throughout | Backlog | Do not build |
| Ice melt | Old concept | Dropped | Do not build; remove from the canvas |

### Type

- **Family:** Archivo, self-hosted and trimmed, at width 92 on its width axis. Because trimming makes it a modified version, its internal name is changed (for example to "Timer Sans"), and the license file and docs credit Archivo as the source.
- **Time:** weight 300, tabular figures, letter-spacing −0.01em, always centered. Colons are tightened by 0.05em on each side and raised 0.06em.
- **Interface text:** also at width 92, weight 400 to 500, lowercase. One trimmed font file serves the time and all interface text.
- **Sizes at reference:** 104 px for the time on the idle, running, check-in, paused, ocean, height and interstellar screens; 60 px for the results headline; 56 px in timeline; 52 px in ring; 44 px for the paused-for time; 30 px under the tree; 11 to 13 px for labels; 12 px for buttons.

### Color

| Theme | Background | Foreground | Accent |
| --- | --- | --- | --- |
| Graphite (default) | #0E0F11 | #ECEAE4 | #35764E |
| Paper | #F6F5F2 | #1A1B1E | #4A9E6C |
| Deep sea | #0F2B3B | #DDEDF5 | #237389 |
| Forest | #14301F | #E6F0DA | #816819 |
| Oxblood | #3A1418 | #F5E4DF | #B0472B |
| Plum | #2A1838 | #EFE3F6 | #963ACB |
| Lilac | #E2DAF5 | #231A38 | #8F75DC |
| Sky | #D3E7F5 | #0F2638 | #4190D1 |
| Sand | #F3E3C3 | #2A1E0C | #B9783C |
| Mint | #D5F0E3 | #0E2A1E | #2F9D6C |

- **Derived colors:** muted (labels, help text and icons) starts as the foreground mixed 45% toward the background and, per theme, moves back toward the foreground only as far as needed to reach 4.5:1 against both the background and the settings panel (for example graphite #8a8a87, paper #646465); faint 84% (dividers, ring track); track 91% (cards and empty bars); the pause and cancel buttons 80%.
- **Fixed colors:** the end button is #A8403D on dark themes and #E28A86 on light ones (background luminance 0.4 or more). The personal record marker is #8C7A52 on dark themes and #8A6D2E on light ones. Button text is always the foreground.
- **Ambient modes** use their own palettes, defined under Display modes below.

### Controls and icons

- **Buttons:** 24 px tall, 13 px side padding, 6 px corners, 14 px apart, no border, with an invisible 44 px tap area.
- **Icons:** the Tabler Icons outline set (MIT license) at a 1.6 stroke. Settings and account are 16 px icons in 28 px boxes, 14 px from the top-right corner and 4 px apart, in the muted color. The results screen's retry and share are 18 px icons in 32 px boxes in the foreground color.
- **Timer layout:** time centered, buttons 26 px below it. The ending bar is 380 × 3 px.

### Motion

| Moment | Specification |
| --- | --- |
| Start | Start morphs into pause and end fades in to its right, over 200 ms |
| Seconds blur-away | The ones digit clears over the first 10 s; the tens digit and colon over 10 to 60 s. Within each window, with progress p and smoothstep s: blur is 14·s(p) px, opacity 1 − s((p − 0.3)/0.7), and width 1 − s((p − 0.55)/0.45), so the time re-centers smoothly. Static afterward |
| Check-in and pause | In every display mode, the whole display (the time and its graphics) blurs 10 px at 40% opacity, and "paused for" with the pause length, or the check-in line, sits at the center of the display. Buttons stay sharp |
| Ending | The 5-second bar fills left to right at a constant rate |
| Results | The tabulating screen holds 0.5 s and fades out over 0.4 s. Results fade in over 0.5 s from 0.5 s, rising 8 px. The replay starts at 0.8 s and runs 2.4 s with an ease-out curve, cubic-bezier(0.25, 1, 0.5, 1), so it starts quickly and settles gently. One registered custom property carries the replay's progress from 0 to 1, and the stroke offsets, the clock hand's rotation and the headline count (shown through counter()) are all calculated from it, so every part moves in step; never a JavaScript loop; with reduced motion, or where the browser lacks support, it shows the final value at once |
| Reduced motion | No blur animation and no replay: the final state appears with a short crossfade |

### Display modes

- **Ring:** one revolution per hour; an 8 px track in the faint color; a round head dot with a tail up to 55° long, drawn as one smooth conic gradient (never stepped segments) that fades from the accent at the head to fully transparent at its far end. At 00:00 only the head shows at 12 o'clock; the tail grows in behind it over the first 9 minutes and fades out over whatever length it has, so there is never a hard edge at the top.
- **Analog stopwatch:** one revolution per hour, labels every 5 minutes, an hours subdial, and the hand in the accent color.
- **Timeline:** the time at 56 px above a 480 px track (reference sizes; the track never grows past its frame size), 10 minutes per 100 px with now at the center, and both ends fading out. The past line is muted and the future faint; ticks every 5 minutes and hh:mm labels every 10. Nothing is drawn before the session's start. Lines and ticks sit on whole pixels, and the track glides continuously at 10 px per minute through a linear CSS transform animation on its own layer, drawn once so it stays sharp, never in visible jumps. With reduced motion, it steps once a minute instead. The personal record is a thin marker labeled "pr: hh:mm:ss".
- **Ocean depth:** 15 m per focused minute, stopping at 10,935 m. The background is linear RGB (0.0232, 0.212, 0.392) × e^(−K·depth) with K = (0.30, 0.06, 0.023) per meter, drawn as a gradient from depth − 6 m to depth + 6 m, with text in #DCE8EE.
- **Height:** 140 m per focused minute, stopping at 100 km. The sky is linear RGB (0.078, 0.275, 0.597) × e^(−K·h/8,500 m) with K = (1.25, 1.1, 0.95), as a gradient across ±1,500 m. Stars fade in between 18 and 42 km.
- **Interstellar:** light speed. It is a test mode: opening the site once with ?test=interstellar shows a "test modes" switch in advanced settings, off by default, which adds interstellar to the mode tiles; nothing else reveals it. At reference, the map radius is 26 + 30·log10(AU/0.3) px from the center, with rings for the eight planets, dashed rings for the Kuiper belt edge (50 AU) and the heliopause (120 AU), a faint band for the Oort cloud (2,000 to 100,000 AU), Proxima Centauri at 268,000 AU, and travel toward −32°. The star field is the canvas catalog (Orion, Taurus with the Pleiades and Hyades, Gemini, Sirius, Procyon), projected around right ascension 5.5 h and declination +6° at 8 px per degree, each star's radius max(0.7, 2.7 − 0.42 × magnitude) px.
- **Tree:** one year per focused hour, 15 minutes per season. Leaves grow in spring (#C2DE8E to #86C060), deepen in summer (#3E8B47), turn in autumn (#D9822F to #A9502A) and are all gone by the end of autumn, each cluster offset by up to a quarter season. Winter shows snow on the branches and the ground. Side and isometric views as drawn.
- **Results replays:** digits and timeline as a focus strip; analog and ring as one ring per hour, outermost first, each revealed exactly behind the sweeping hand, drawn exactly as the frame up to 6 hours and moving closer and thinner beyond that so every hour fits in the same circle; ocean depth and height as a profile chart with zone bands and at most two random landmarks per 1,000 m or 10 km band; the tree growing to full size at 60 focused minutes through its seasons; interstellar as the radial map with callouts.

### Screens

- **Settings:** at reference, a 440 px panel on the right over the running timer, with search, collapsible categories and the footer. On phones each category is its own page.
- **Dashboard:** cards with 12 px corners, 18 to 20 px padding and 16 px gaps; heatmap cells of 15 px with 3 px gaps; locked sections blurred under the "unlock · $5 once" badge.
- **Widgets:** cards on the track color with 10 px corners; no-widget zones shown hatched only in edit mode.

## Data model

A session stores only timestamps and how it ended; everything else is derived.

```ts
type Segment = { start: number; end: number | null };      // epoch ms; null = still running
type Gap = { start: number; end: number };                  // device asleep or tab closed
type ModeSpan = { mode: string; start: number };            // display mode shown from this moment
type EndReason = 'user' | 'pause_timeout' | 'checkin_missed' | 'max_duration';

interface Session {
  schema: 1;
  id: string;              // random UUID generated on the device
  segments: Segment[];
  gaps: Gap[];
  modes: ModeSpan[];       // decides the results replay and which ambient mode the session counts toward
  endReason: EndReason | null;
  localDay: string;        // YYYY-MM-DD in local time at start, with the day ending at 04:00
}
```

- **Derived values:** focused time is the sum of segments. Pause count is segments minus one. Longest unbroken stretch is the longest segment.
- **Personal record:** the longest focused time in one session, pauses excluded. Longest unbroken stretch is a second statistic at no extra cost.
- **Events:** `session.started`, `session.paused`, `session.resumed`, `session.ended`, `view.changed`, `milestone.hour`, `gap.detected`, `checkin.due`, and `record.passed` (Release 3).
- **Never stored:** what the user is working on, IP address, device fingerprint, or activity in other tabs. Location is never stored before the social release, and then only as an opt-in named place.

## Session lifecycle and abandonment

A session always survives; unattended time is credited only up to the next check-in, plus the hour after it if the check-in is answered within that hour.

| Situation | Rule | Default |
| --- | --- | --- |
| Refresh or reopened tab | The session resumes from storage with no time lost. | Always |
| Background tab | Time counts normally. Browsers slow background timers, which is why the engine uses timestamps. | Always |
| Check-in | The elapsed time blurs and a short line asks for any key, click or tap. It is non-modal, and it is always announced to screen readers. Users can switch check-ins off from Release 2. | Every 2 h of running time since the last sign of presence (start, pause, resume or an answered check-in); pauses don't add to the count. Adjustable 30 min to 3 h |
| Missed check-in | If a check-in goes unanswered for 1 hour, the session pauses, backdated to when the check-in appeared, so the unconfirmed hour is not counted. This pause ignores the pause limit: the session waits, and when the user returns the paused screen explains the missed check-in and resume continues the same session. After 12 hours it is saved and ended, dated to the check-in. | 1 h to respond; then waits up to 12 h |
| Lid shut or tab closed | Time keeps counting. On return, the engine replays the check-in rule against the clock. A check-in that fell due while away is shown on return and can still be answered until 1 hour after it fell due, crediting the time in between; after that it counts as missed. | Same as above |
| Long pause | The session ends automatically, dated to the moment the pause began. | 30 min, adjustable 5 to 60 min |
| Session maximum | The session ends and is saved, and a notice explains the 16-hour maximum for a single session. Guests read "this one has ended; start a new one whenever you're ready"; accounts read "this one has ended and been saved". A new session can start right away. Guests are limited too. | 16 h of focus in one session |

- **Replay on wake:** the rules are pure functions of the session and the current time. A sleeping device runs no code, so after sleep or a reopened tab the engine applies the rules in order as if it had been running. Clock changes: timestamps are UTC, so daylight saving and time zone changes never affect them. A forward jump looks the same as sleep and is treated as sleep. A backward jump shifts every stored time in the open session back by the jump, detected while the page is open by comparing the wall clock with the browser's monotonic clock, so no focused time is lost and segments stay in order. If the page reopens and the clock reads earlier than the last heartbeat, the session resumes from the heartbeat, and the unmeasurable time while it was closed is not credited.
- **Consequence:** unattended time is credited only up to the next check-in, plus the hour after it if the check-in is answered within that hour. A user studying with the lid shut must open the laptop within an hour of each check-in falling due.
- **User settings:** the check-in interval and the pause limit are the only thresholds users can change. From Release 2, check-ins can be switched off; the pause limit cannot.
- **Heartbeat:** the engine writes a timestamp every 30 seconds and records a gap when it is more than 5 minutes stale. Gaps are informational and do not change focused time.
  - **Clock changes:** while the page is open, the engine compares the device clock with the browser's steady clock to spot jumps. If the device clock moves backward, every stored time in the open session shifts back by the same amount, so no focused time is lost or gained. If the clock is found behind the last heartbeat when the page reopens, the session resumes from its last saved elapsed time. A forward jump is treated like sleep: check-ins cap it and, for accounts, the server flags it. Time zone and daylight saving changes are not jumps, because times are stored in UTC.
- **No modal "are you still there?" prompt.** A modal interrupts focus and spoils filmed sessions.
- **One code path:** guests and accounts follow identical rules, although only accounts have records at stake.
- **Tunable:** every default above lives in the config module.

## Infrastructure and security review

The stack as planned, with recommendations where a choice is still open.

| Layer | Choice | Status |
| --- | --- | --- |
| Front end | Strict TypeScript, Vite, plain CSS, no UI framework | Decided |
| Domain and DNS | Cloudflare | Decided |
| Static hosting | Cloudflare, serving hashed files with HTTPS and security headers | Recommended |
| Offline | A service worker: core cached on first visit, hashed files cache-first, pages network-first, a version check and a remote kill switch | Decided |
| API | TypeScript on Cloudflare Workers, reusing `core` validation and writing to the database | Recommended |
| Database | Supabase (PostgreSQL). Free projects pause after 7 days without activity, which matters only before launch; a paused project is resumed from the dashboard | Decided |
| Sign-in | Supabase Auth: email and password, or Google through a redirect flow, so no Google script runs on site pages | Recommended |
| Live session sync | Supabase Realtime, one channel per account with a running session | Recommended |
| Bot protection | Cloudflare Turnstile, on the sign-up page only; the CSP allows Cloudflare's challenge script on that page alone | Decided |
| Widget origin | A separate registrable domain, not a subdomain of elapsed.io, so cookies and storage are fully isolated | Recommended |
| Payments | Stripe Checkout as a hosted page with Managed Payments, so no Stripe script runs on site pages | Decided |
| Email | A transactional provider with a free tier that can grow or be swapped later, chosen at Release 3 and listed as a processor in the privacy policy. Incoming mail to privacy@elapsed.io, support@elapsed.io and the private admin address is forwarded free to the owner's inbox through Cloudflare Email Routing, from Release 1 | Open |
| Backups | Supabase's free plan includes no backups, so a daily encrypted export to separate storage is kept for 30 days | Decided |
| Secrets | The platforms' secret storage for keys; nothing secret in the repository | Recommended |
| Plan | Free tiers first, upgrading only when usage needs it | Decided |

**Performance requirements**

- **One scheduler:** the engine, modes, check-ins and heartbeat share one timer that wakes only for the next visible change, never separate intervals per module. While the tab is hidden, the only wake-up is the 30-second heartbeat, which also updates the tab title in the same wake.
- **No per-frame drawing:** SVG scenes animate by moving whole groups with CSS transforms. Season and light colors change every few seconds through animated CSS custom properties. Nothing is redrawn every frame.
- **Replays:** results animations move stroke offsets and transforms rather than rebuilding shapes, and run once. Every part of a replay is derived from one progress value, so focus arcs are revealed by the clock hand and never run ahead of it.
- **Blur:** the seconds blur-away is the only animated blur, and it stops after the first minute.
- **Images at screen size:** imported backgrounds are scaled to the device's screen when imported, stored compressed, and decoded once.
- **Widgets on demand:** a widget's frame is created only when shown, and its refreshing stops when it is hidden, when the tab is hidden, or during sessions if the user hides widgets then.
- **Account code outside the core:** the sign-in library and live sync load only for signed-in users and do not count against the core budget.
- **Font loading:** the trimmed default font is preloaded, so the time never jumps when the font arrives.
- **Measured on a slow phone:** each release is checked on a low-end Android phone before it ships, without any third-party monitoring.

**Security requirements**

- **Headers:** HSTS with preload, `X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and a `Permissions-Policy` that turns off camera, microphone and location until a release needs them.
- **Trusted Types:** the CSP requires Trusted Types where browsers support it, so the browser itself blocks unsafe HTML insertion; a lint rule covers the rest.
- **CSP exceptions, and only these:** the timer page may connect to the project's Supabase address for signed-in users' live sync; the sign-up page may load Cloudflare's challenge script and frame; widget frames may load only from the widget domain.
- **Service worker:** limited to the site's own scope, never caches personal API responses, clears its caches on sign-out, and can be switched off remotely.
- **Supply chain:** pinned dependencies, a committed lockfile, install scripts disabled, dependency review in CI, and two-factor sign-in on every service account (code host, package registry, Cloudflare, Supabase, Stripe, Google Cloud). Every backend service is registered to the private admin address, which is never shown publicly; because that inbox can reset every service, its own account has two-factor sign-in and its recovery codes are stored offline.
- **Database:** row-level security on every table, so a browser key can reach only its own user's rows. The service key lives only in the API's secret storage.
- **Passwords and sessions:** a strong, slow password hash (handled by the sign-in provider), rate limits with growing delays, email verification, a fresh session after sign-in, CSRF protection, and re-confirmation for changing email, connecting apps or deleting the account. Changing the email notifies the old address.
- **Google sign-in:** OpenID Connect with PKCE, a nonce, and full checks of the returned token.
- **Payments:** the unlock is granted only by a signed Stripe webhook, processed once, never by the page the buyer returns to.
- **Widgets:** every message between the timer page and a widget is checked for its origin and validated against a schema. Tokens fetched in the browser stay in memory only; tokens on the server are encrypted, use the narrowest scopes, and are revoked on disconnect. The widget domain is a second domain that must be registered before Release 4.
- **Imported files:** image dimensions are checked before decoding, to stop decompression bombs, then re-encoded. Background images may be JPEG, PNG, WebP or AVIF, detected from their contents, at most 20 MB and 50 megapixels, and are re-encoded at the screen's size, which also strips location and camera data; SVG is refused. Fonts are size-capped, checked by their contents, and loaded from bytes. Check how each browser applies the CSP to fonts loaded this way.
- **Result pages:** unguessable links, private by default, hidden from search engines, and rate-limited.
- **Scheduled deletion:** jobs delete free accounts' sessions older than 12 months and, after the email warning, accounts unused for three years. Both are logged and tested.
- **Anonymous counts:** no cookies, no stored IP addresses, totals only; inflated counts are an accepted risk.
- **Age check:** a neutral birth-year question at sign-up for the 13+ rule, without hints about the required age; only the result is kept.
- **Operations:** logs exclude request bodies, tokens and personal data and are kept briefly; backups are encrypted and a restore is tested regularly; admin access needs two-factor sign-in and is logged.
- **Email:** SPF, DKIM and DMARC are set up so verification emails cannot be spoofed.
- **Licenses:** the code is GPL-3.0; Archivo is under the SIL Open Font License and Tabler Icons under MIT, both compatible. Each license file ships in the repository.
- **Design canvas fonts:** the canvas loads its font from Google Fonts for preview only. The product self-hosts every font.

## Custom CSS safety

Custom CSS is accepted as text only, applied only to the timer view, and blocked from loading anything remote.

**Threats**

- **Data theft:** CSS can request remote URLs through `url()`, `@import` and `@font-face`, and attribute selectors can leak values on the page.
- **Interface spoofing:** CSS can hide or move controls, or imitate a login prompt. This matters once themes are shared between users.
- **Lockout:** a user can hide their own controls.
- **Resource abuse:** very large or pathological stylesheets.

**Required defences**

1. **Isolation.** Custom CSS loads only on the timer view. Login, registration and account screens are separate documents that never load it.
2. **CSP.** `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src` (the widget origin only)`; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`. Remote loads fail even if sanitizing misses something.
3. **Injection method.** Apply user CSS through a constructable stylesheet (`CSSStyleSheet` plus `adoptedStyleSheets`), never an inline `<style>` tag. Verify how each target browser treats this under the CSP and record the result in the decisions log.
4. **Sanitizing.** Parse with the browser's CSS parser and walk the rules. Drop `@import`, `@font-face`, `@namespace` and every `url()` that is not a small `data:` image. Reject input over 50 KB.
5. **Layering.** Place user rules in the `user` cascade layer, scoped to the timer view root.
6. **Safe mode.** A `?safe` URL parameter and the safe mode button in settings load the site with custom CSS and custom layouts off. Both are documented in settings.
7. **Text only.** The CSS is stored as a string and shown through `textContent` or a textarea value. It is never interpolated into HTML.
8. **No custom HTML or JavaScript in any release.** Third-party display modes and widgets, if ever shipped, run in sandboxed iframes with message passing. Custom CSS stays in the app; stable, documented class names and CSS variables are also published, so people who prefer a browser extension can style the site that way.
9. **Shared rules.** The allowlist lives in `core` as data, so the server can re-validate shared themes and layouts with its own parser. A user's own custom CSS stays on their device and never syncs. Only a config the user chooses to publish to the marketplace (Release 5) reaches the server, where it is re-checked with the same rules.
10. **Imported images.** Accept only common raster formats, detected from file contents rather than the name. Re-encode every image, which strips location and camera metadata, and cap size and dimensions. SVG files are refused, because they can carry scripts.
11. **Widget content.** Calendar, to-do and email data is rendered as plain text, never as HTML. Remote images in emails are never loaded, since they can track the reader. Links open in a new tab with `noopener` and `noreferrer`.
12. **Tests.** A corpus of malicious CSS, crafted images and hostile widget payloads runs in CI and must be fully neutralized.

## Privacy

Guests send nothing to a server, and accounts store only what tracking requires.

| Data | Guest | Account | Where it lives |
| --- | --- | --- | --- |
| Active session | Yes | Yes | Device storage until the session ends |
| Settings, theme and layouts (choices only) | Yes | Yes | Device; synced to the server for accounts |
| Imported background images, font files and custom CSS | Yes | Yes | Device only, for guests and accounts; never uploaded. Images are re-encoded with location and camera metadata removed. On another device the layout falls back to the theme until the file is imported there |
| Finished sessions | Tab storage only; deleted when the tab closes | Yes | Server |
| Password hash | No | Yes, unless signing in with Google | Server |
| Email | No | Yes, for sign-in and recovery | Server |
| Display name | No | Yes; public only in competitions | Server |
| Age check | No | Only that the person is 13 or older; the birth year is not kept | Server |
| Google sign-in | No | Optional. Google learns of the sign-in only when the user chooses it; the server keeps only the Google account identifier | Server |
| Purchase record | No | Whether the unlock was bought, and Stripe's reference. Card details stay with Stripe | Server |
| Shared result pages | No | Optional, per session; private by default | Server |
| Widget connections | No | Optional, per integration. Access tokens only, encrypted; disconnecting deletes them | Server or the widget's own origin |
| Widget content (events, to-dos, emails) | No | Shown, never stored | Provider; held in memory while displayed |
| Cookies | None | One session cookie: HttpOnly, Secure, SameSite | Browser |
| IP address | Not stored | Used briefly for rate limiting; never saved with the account | Memory only |
| Usage counts | Anonymous daily visit and session counts, on by default, can be switched off | Same | A Cloudflare Worker on the site's own address, storing daily totals only in Cloudflare D1, kept apart from account data |
| Crash reports | Off unless switched on | Same | A Cloudflare D1 table, deleted after 14 days: error message, stack, build version, day, and browser family and major version. Query strings and anything the user typed are stripped; nothing else about the person or device is kept. Each report is at most 8 KB, and one address can send at most 5 a minute |
| Analytics, ads, other third-party requests | None | None, apart from the CAPTCHA on the sign-up page | Nowhere |

- **Account rights from the first account release:** export all data as JSON, and delete the account with all its data immediately. Daily encrypted backups are kept for 30 days, so deleted data is gone from backups within 30 days, and the privacy policy says so. Accounts unused for three years are deleted after an email warning.
- **Minors:** the audience includes high school students. Accounts are for ages 13 and up; the privacy policy and terms need legal review before Release 3.
- **Living inventory:** `docs/data-inventory.md` mirrors this table. Any round that adds a stored or transmitted field updates it.

## Release roadmap

Six releases ship in order; only Release 1 is broken into rounds now, and each later release gets its round list when it starts.

### Release 1: Guest timer (static site plus one small counting endpoint)

1. **Foundations.** Repository layout, strict TypeScript, build, test runner, CI, CSP and security headers, size-budget check, decisions log, brand module, theme tokens with the contrast check, self-hosted default font.
2. **Timer engine.** Session model, injected clock and events in `core`. Unit tests with fake time cover sleep, throttling and system clock changes.
3. **Default screen.** Digits, ring and timeline modes through the contract; start, pause and end with transitions; seconds blur-away; keyboard control (space starts and pauses); the tab title, updated once a minute (running "00:42 · elapsed", paused "paused for 00:04 · elapsed", check-in waiting "check in · 02:00 · elapsed", idle "elapsed").
4. **Persistence and abandonment.** Storage adapters, heartbeat, replay on wake, check-ins, pause limit, session maximum, multi-tab coordination, the service worker for offline use and installing to the home screen (with a placeholder app icon, the ring's track and head dot, generated by a committed script until an icon is designed), and the anonymous counting endpoint.
5. **End screen.** Tabulating countdown with end now and cancel, results fade-in, replays for the three Release 1 modes, all session data, retry, tab-scoped storage of the finished session. The guest line "this session isn't saved. create an account to keep it." appears only from Release 3, when accounts exist. The share icon shares text and a link through the device's share sheet.
6. **Settings and themes.** Settings panel with search and per-category resets, covering the Release 1 parts of the settings catalog: display mode (digits, ring, timeline), preset themes and theme colors, font choice including the user's own font file, time size, clock format, seconds, check-in and pause settings, notifications, usage counts and crash reports. Versioned settings.
7. **Custom CSS.** Editor, sanitizer, constructable stylesheet, safe mode, malicious-CSS test corpus.
8. **Hardening.** Accessibility pass against WCAG 2.2 AA (small buttons keep 44 px tap areas), reduced motion, performance budget, cross-browser checks. Then the full release safety review, followed by a private test run: a handful of friends use the site on their own devices for about a week, and their problems are fixed before the public launch. Until launch, elapsed.io shows a static "soon" page drawn in the design canvas: no scripts, no counting and no cookies, in the default theme matching the system's light or dark setting. Small "privacy" and "terms" links sit at its bottom. It deploys separately from the app, and at launch the app takes over the domain. Before the public launch: move the privacy and terms pages into the app, run the header check against elapsed.io, turn on GitHub secret scanning and push protection, and submit to the HSTS preload list only once every subdomain serves HTTPS.

### Release 2: Display modes and layout

- Analog stopwatch, ocean depth, height and tree modes, each lazy-loaded with its results replay. Interstellar distance ships behind a test flag.
- Layout editor: move, rotate, stretch, resize, hide and reorder every layer; import a background image; save layouts per display mode and screen size; reset to default. Free-form editing is part of the unlock.
- Ocean depth and height: backgrounds follow real light models, rates come from the config module, and results show randomly chosen landmarks, at most two per depth or height band. Height reveals stars near space.
- Interstellar: centered logarithmic solar-system map, real star catalog, light-speed travel per session for guests.
- Ocean life: a small depth-zone catalog from the asset registry, randomly picked on pause and drawn at several distances. Placeholder art until final designs exist.
- Tree: side and isometric views, selectable in settings.
- A floating picture-in-picture timer, a screen wake lock while the site is the active tab (on by default), the switch to turn check-ins off, the low power and animation speed settings, downloaded-mode management, and automatic removal of modes unused for 30 days.
- No new data leaves the device; imported images and fonts stay on it.

### Release 3: Accounts

- The `api` package and database, with sign-up and sign-in through Supabase Auth, rate limits and CSRF defence.
- Google sign-in, isolated on the account page.
- Remote storage adapters and session sync. The server re-validates every segment using `core`.
- Statistics: totals by day, week, month and all time, streak, personal record, average session and a calendar heatmap. There are no public profiles.
- The `record.passed` event, shown as the personal record marker in every display mode.
- Data export, account deletion and settings sync. The one-time paid unlock, sold through a payment provider. Shareable result pages, each set to private or viewable by anyone with the link.

### Release 4: Widgets (accounts)

- The widget platform: sandboxed widget origin, message bridge, placement in the layout editor, and no-widget zones around the timer and buttons in every display mode.
- Integrations in three waves, all read-only at first. First: built-in widgets, a generic calendar-link widget (Apple Calendar, Canvas and most school systems), Google Calendar, Google Tasks and GitHub. Next: Microsoft Outlook, To Do and Teams, Todoist, TickTick, Notion, Slack status sync and official embeds. Later: Gmail, a Canvas developer key and Google Classroom.
- Interstellar distance accumulates across an account's sessions.
- Each integration gets its own round with a provider review: scopes, verification requirements, token handling and disconnect behaviour.

### Release 5: Sharing, awards and marketplace

- Image versions of shared results and dashboard stats.
- Awards: small badges for milestones and for permanent or limited-time challenges, shown in their own dashboard section. Limited-time challenges are defined on the server so they can change without a release.
- Marketplace: anyone can browse community-made CSS configs and install one for free. Publishing needs an account; a published config is public and shows its author's display name. The server re-checks every published config with the same rules as custom CSS, previews run in a sandboxed frame, configs can be reported and removed, and installing copies the config into the user's own custom CSS on their device only after a preview and a confirmation. Safe mode always undoes an installed config. Paid configs may come later.

### Release 6: Social (deferred, design first)

- Leaderboards, competitions and places.
- No code is written until two documents are approved: an integrity design covering how abandoned or faked time is excluded, for example through a report menu and automated flagging of implausible sessions, and a safety design covering minors and location data. Location will be used for logging sessions to places and for competitions; it is opt-in, recorded as a named place (a library or campus) rather than exact coordinates, never shown publicly at a finer level, and off by default for minors.
- The segment model and event bus are meant to carry these features without restructuring. Verification arrives here: a session counts toward competitions only if check-ins stayed on, and that marking is added to sessions in this release.

## Backlog (not yet approved)

Ideas raised during planning that the owner has not approved. None is built until the owner moves it into a release.

- Screen wake lock: moved to Release 2.
- Stream overlay link: a page with a transparent background that streaming software layers over a video.
- Blind mode: the time stays blurred, like a pause, until the session ends. Ambient modes would also need to freeze, since their visuals reveal the time.
- Paid marketplace configs, with payouts to their creators (after the free marketplace in Release 5).
- Live "people focusing now" counts for places and competitions (with or after the social release).

## Safety overviews

Every round ends with the round overview, and every release ends with the release review before anything deploys.

### Round overview

Save as `docs/safety/round-<release>.<round>.md` and answer every item, writing "none" where nothing applies.

1. **What changed**, in one paragraph.
2. **Data:** anything newly read, stored or sent, where it goes, and how long it is kept.
3. **Inputs:** every new user-controlled input and how it is validated.
4. **Dependencies:** each new one with its purpose, size, licence and pinned version.
5. **Security surface:** CSP or header changes, new storage keys, new endpoints, auth changes.
6. **Abuse cases** considered, with the defence for each.
7. **Tests** added for the items above.
8. **Open risks** and follow-ups.

### Release review

- [ ] Every round overview is re-read, and each open risk is closed or accepted in writing.
- [ ] The data inventory matches a live session: no third-party requests, no unexpected storage keys or cookies.
- [ ] Dependencies are audited for known vulnerabilities, unused packages are removed, and the lockfile is committed.
- [ ] The CSP and headers are verified on the deployed build, not only locally.
- [ ] The malicious-CSS corpus passes and safe mode works.
- [ ] The threat model is updated for the new features.
- [ ] Accessibility checks and performance budgets pass.
- [ ] From Release 3: auth flows, rate limits, session expiry, export and deletion are reviewed, and no secrets are in the repository.
- [ ] A rollback plan is written.
- [ ] The owner signs off.

## Working rules for Claude Code

- Follow the round order. Release 1's scope is frozen: new ideas go to a backlog until it ships. Do not build later-release features early, and never break an invariant to finish a round faster.
- Ask the owner before adding any runtime dependency. Justify each dev-only dependency in one line in the round overview.
- Pin dependency versions. Choose current stable releases at build time and verify them; do not rely on memory.
- Record every non-obvious choice in `docs/decisions.md` with the date and the reason.
- Write tests in the same round as the code. Engine logic is unit-tested with a fake clock; refresh, sleep and multi-tab behaviour get end-to-end tests.
- Never add telemetry, analytics, remote fonts or third-party scripts. Outside art and fonts must carry licenses that allow use in a public repository, and each source is recorded in the repository.
- Treat stored data as untrusted when reading it back, and validate it against the schema.
- End each round by writing the safety overview, then stop for owner review. Build every screen to match its frame in the design canvas, as set out under Design system; if a frame cannot be matched exactly, stop and ask. The canvas frames use per-frame JavaScript for their demos; the product does not copy that technique.

## Open decisions

The owner must settle each item before the round that depends on it.

- [ ] **Product name** (decided: elapsed, at elapsed.io; the brand module holds both).
- [ ] **Share feature:** decided as text and a link through the share sheet, shipping in Release 1; image versions are still to be designed (before Release 5). Also before Release 5: the license authors publish marketplace configs under (recommended: MIT), and how reports are reviewed.
- [ ] **Paid unlock:** decided as $5 through Stripe Checkout with Stripe Managed Payments, where Stripe is the merchant of record and handles sales tax, refunds and chargebacks. The terms must say that buyers under 18 need a parent or guardian's permission; legal review still to come (before Release 3).
- [ ] **Open-source license.** Decided: the code stays open source, accepting that paid features can be rebuilt. Decided: GPL-3.0.
- [ ] **Free history beyond 12 months:** decided: deleted. Lifetime totals, records and best streaks are kept.
- [ ] **Final assets:** ocean life catalog and art (before each ships; placeholders until then).
- [ ] **Browser support.** Decided: the last two versions of Chrome, Firefox, Safari and Edge.
- [ ] **Hosting** Cloudflare for the domain is decided. Supabase for the database and Cloudflare Turnstile for the CAPTCHA are decided; the rest of the infrastructure table is a recommendation. Still open: an email provider with a free tier that can grow or be swapped later (before Release 3).
- [ ] **Minimum age and legal documents**, drafted later. They must cover how widget data is handled and Google's API Services User Data Policy, including its Limited Use requirements. The privacy policy must explain the anonymous usage counts and how to switch them off. A short privacy page and terms must exist before Release 1's public launch, since Release 1 already counts usage and can send crash reports; the full documents follow before Release 3. Claude Code drafts the short versions in docs/legal/, built only from the privacy table and data inventory, and nothing is published until the owner approves. Decided: the terms are governed by California law, with Alameda County courts (humanbn is based in Castro Valley, California); the service is provided as is, without warranties, with liability limited to the amount the user paid; the privacy page discloses Cloudflare's brief processing of request details. Both short documents take effect on November 15, 2026, when they are published at elapsed.io/privacy and elapsed.io/terms alongside the "soon" page. The review should also confirm that no cookie banner is needed, since the only cookie is the strictly necessary sign-in cookie (before Release 3).
- [ ] **Day boundary for streaks.** Decided for now: 04:00 local time, so late-night sessions count toward the previous day. Revisit if international users join.

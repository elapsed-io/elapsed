# Safety overview: Release 2, round 2.14 (Seconds, settings and notices)

Date: 2026-11-25. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.14; plan version 13 (Settings catalog; answers 36 and 37).

## 1. What changed

- **Seconds always shown by default** (decision 413): the options read always, blur away, never. Settings become
  schema 4; a record older than schema 4 whose seconds still hold the old default (blur away) reads as always, and
  any other choice is kept.
- **The seconds tip** (decision 414): "seconds can fade out after a minute, for a calmer screen", with "change"
  (seconds to blur away, settings opened on that row, outlined) and dismiss, on the idle screen after the first
  completed session while seconds are still "always". The fullscreen tip keeps the idle screen before the first
  session; one pill at a time; a dismissed or acted-on tip never returns.
- **Settings open on display**, now the first category (decision 415), and **the panel slides** 24 px in from the
  right while fading in over 200 ms and out over 160 ms, transform and opacity only, the timer never moving while it
  does (decisions 416, 417).
- **The credits page in the chosen theme** and laid out like the privacy and terms pages (decision 418), through one
  small module of the site's own.
- **Every shared timer frame re-taken with seconds** (decision 419), and a hidden-tab test that depended on real time
  made independent of it (decision 420).

## 2. Data

- **The notices record gains one field**, `firstSession` (schema 2): whether a session has ended in this browser,
  never when or how many. It is written once, when the first session ends, and read on the idle screen. Like the
  rest of the record it stays in this browser's local storage, never syncs, is not part of a settings file and is
  removed by clear device data. Round 2.8's schema 1 still reads (as no session yet).
- **The notices store gains one id**, `seconds`, beside `fullscreen`.
- **Settings:** schema 4, one more migration rule, no new field.
- **The credits page reads** this browser's settings (to apply the theme) and writes nothing.

`docs/data-inventory.md` is updated.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| The notices record (`notices`) | Parsed as before: anything but `{schema: 2, dismissed: [ids], firstSession: boolean}` or round 2.8's `{schema: 1, dismissed: [ids]}`, with exactly those keys, known-shaped ids and at most 64 of them, reads as nothing dismissed and no session yet. A damaged record can only bring a tip back, never hide anything else or show a tip early (unit tests: wrong schema, extra keys, a non-boolean `firstSession`, a schema 1 record with the field, a refusing storage). |
| Stored settings (`settings`), on the app and now on the credits page | Read through the one settings store and its schema validation (field by field, unknown values to the defaults). On the credits page a damaged or unknown record shows the default theme, with no error (end-to-end tests: none, damaged JSON, an unknown theme with a malformed colour). |
| A notice's "change" | Each notice names its one setting and value in the site's own code (`NoticeChange`, typed so the value fits the setting); nothing from storage chooses what "change" sets. |

## 4. Dependencies

None added or removed.

## 5. Security surface

- **No new endpoint, header, permission or network request.**
- **One new script**, `src/credits/theme.ts`, built as its own chunk (0.29 KB gzipped, ceiling 0.5 KB), loaded by
  the credits page only, as `<script type="module" src>` from the site's own origin. The page keeps the site's
  Content Security Policy unchanged (`script-src 'self'`, `style-src 'self'`, no inline script or style): the theme
  goes in as a constructed stylesheet of custom properties built from the validated settings, and the end-to-end
  tests find no refusal in any theme.
- **The panel's motion** is the Web Animations API on the panel element: no style attribute or stylesheet is
  written, so Trusted Types and the CSP are untouched.

## 6. Abuse cases

- **A crafted `notices` record** can bring a tip back or show the seconds tip's moment as reached; it cannot change
  a setting (only "change", pressed by the person, does) or hide anything but the two tips.
- **A crafted `settings` record** on the credits page shows the default theme or a valid chosen one; colours pass
  the settings schema's `#rrggbb` check before they reach the stylesheet, so nothing else can be injected into it.
- **Tips as nagging:** each tip shows only on the idle screen, one at a time, and once acted on or dismissed never
  returns, so the site cannot be made to repeat one.

## 7. Tests

- **Results:** see the round summary in `docs/questions-overnight.md` for `npm run check` and the reference run in
  Chromium, Firefox and WebKit.
- **Unit tests:** the schema-4 migration (blur away before schema 4 reads as always; never, always and a schema-4
  blur away kept; leave fullscreen's rule unchanged); the notices record (schema 2 round trip, schema 1 read,
  `firstSession` set once and kept through a dismissal, every malformed shape read as nothing).
- **End-to-end tests:** `e2e/notices.spec.ts`: the fullscreen tip before the first session, the seconds tip after
  it (alone, though the fullscreen tip was never dismissed), matched to the "notice: seconds tip" frame and kept
  through a reload; without page fullscreen the seconds tip still comes; "change" sets blur away, opens settings on
  the outlined seconds row and never returns; the tip shows only while seconds are "always" and a dismissed one
  stays dismissed through another session and a reload; a fullscreen tip dismissed first leaves the seconds tip its
  moment. `e2e/settings.spec.ts`: settings open on display, first, with display mode at the top; the panel's slide
  and fade in and out (offsets, opacity, durations and curves) with the timer still beside it during both; with
  reduced motion it only fades; seconds "always" by default in the order always, blur away, never; four stored
  records migrated or kept. `e2e/credits.spec.ts`: the page in each of the ten themes and in colours of one's own,
  the default theme for missing, damaged or unknown settings, the legal pages' layout, at 1280 px and on a phone,
  with nothing refused. The shared timer frames with seconds (`e2e/frames.spec.ts`, `e2e/focus.spec.ts`).

## 8. Open risks and follow-ups

1. **A person who completed sessions in Release 1** has no `firstSession` yet, so the fullscreen tip still comes
   first for them (where it was not dismissed), and the seconds tip after their first session in Release 2: the
   site keeps no history before Release 3 to tell otherwise.
2. **The timer re-lays itself beside the panel** the moment the panel starts to open, and back once it has gone, as
   every settings frame places it (decision 416). It does not move while the panel moves. If the owner would rather
   the timer stayed centred under the panel, that is a change to the frames.

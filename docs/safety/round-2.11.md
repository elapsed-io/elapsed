# Safety overview: Release 2, round 2.11 (One design system)

Date: 2026-11-18. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.11; owner, round 2.11.

## 1. What changed

- **One design system:** one layout for the modes that show the time on its own (the time's size and gap from the
  shared tokens alone; ocean depth's and height's own values and the built-in recipes' time sizes removed; decision
  388); one layer order in tokens, used by every mode and screen, with no z-index in any mode's stylesheet (390); a
  frost under the held display (391); every colour, size, spacing and duration a mode held of its own moved to the
  config modules, with a plan audit that fails the build on a new one (392).
- **Interstellar:** one HYG sky everywhere, still and turning, the hand-entered catalog and the recipe format's
  starfield `view` field removed (389); the route drawn so it is always attached to Earth and the traveller (393);
  the results map filling the whole card with a faint star field kept off the route and bodies by halos (394);
  each landmark appearing with a slow fade (395).
- **Ocean depth and height in testing:** the theme's colours with no contrast switch, and the depth or altitude
  caption shown throughout (396).
- **Settings:** schema 3; "leave fullscreen" defaults to never, an older record still at the old default reading as
  never (397).
- **The credits page:** a static page at `/credits/`, built with the site, linked from the settings footer (398).

## 2. Data

Nothing new is collected, stored or sent. The `settings` record is now written as schema 3; the only change in what
it holds is the meaning of an old "leave fullscreen: on end" (read as never when the record is schema 1 or 2;
`docs/data-inventory.md` updated). The credits page stores nothing and runs no script.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| Stored settings (schema 1, 2 or 3) | As before: every field validated against its declaration, unknown ones dropped, an invalid one at its default; the one new rule only maps the old default of one choice to the new default. Unit tests cover each schema. |
| The build's sky images | As in round 2.10: made by the build from files in the repository (the recipe and the HYG data), SVG of `circle` elements with numeric attributes and a comment, served from the site's own origin as images, so nothing in them can run; the device checks each image's description (a URL string and finite numbers, the card's included) before placing it. The hand-entered catalog is gone. |
| The credits page | Built from the copy module only (the site's own strings); every string HTML-escaped; links to licence texts are fixed `https://` addresses in that module. |

## 4. Dependencies

None added, runtime or development; none removed. The credits page lists the licences of what the site already
ships (the fonts' SIL Open Font License, Tabler Icons' MIT licence, the HYG data's CC BY-SA 4.0), whose licence
files stay beside each work in the repository.

## 5. Security surface

- **One new page, `/credits/`:** static HTML and one stylesheet at fixed paths, no script, no form, no inline style
  (the Content Security Policy is unchanged and applies to it as to every path: `style-src 'self'`, `default-src
  'none'`, Trusted Types); it links out only to the licences' own sites, `rel="noopener noreferrer"`, and opens
  from the footer in a new tab like the footer's other pages. The service worker leaves it to the network (it is
  neither the app's page nor a hashed asset), so it is never served from an old cache in place of the app.
- **No new endpoint, header, permission or network request** from the app; the sky images are as in round 2.10.
- **DOM only, as before:** the new halos, the frost and the stand-in caption are made with `createElement`; no
  markup is parsed; inline style values are numbers, the site's own strings and the build's own hashed URLs.
- **Layer order** is enforced by the plan audit (no z-index in a mode's stylesheet; every other z-index a layer
  token), and the settings panel still sits after the whole view, so neither a mode nor custom CSS confined to the
  view can cover it (the view's own isolation, round 7, is unchanged).

## 6. Abuse cases

- **A crafted settings record** can at most choose among the declared values; the migration cannot produce a value
  outside them (unit tests).
- **A long session in interstellar** keeps the route attached at every moment (tested through the first minutes and
  across the replay); the slow fade adds four keyframes per landmark to a minute's glide, a bounded number.
- **Custom CSS** cannot lift a mode's art over a dialog more than before: the view is one stacking context under
  the settings panel, as in round 7, and the dialogs sit above the art within it by the layer tokens.

## 7. Tests

- **Results:** see the round summary in `docs/questions-overnight.md` for `npm run check` and the reference run in
  Chromium, Firefox and WebKit.
- **New unit tests:** the settings migration of "leave fullscreen" (each schema, each choice); the build's card sky
  from the HYG catalog; the plan audit's layer-order and no-literal rules.
- **New end-to-end tests:** `e2e/design-system.spec.ts` (the time, the gap and the buttons identical in every time
  mode, idle and running, at three window sizes; the buttons the same size in every mode; in every mode, nothing
  above check-in, pause or settings, and the frost on while held); `e2e/credits.spec.ts` (the footer link, every
  work and licence, the page's headers, no refusals); in `e2e/mode-switch.spec.ts`, ocean depth and height started
  in a dark and a light theme (the theme's background and colours, the caption's metres growing); in
  `e2e/interstellar.spec.ts`, the route's ends within 1 px of Earth and the traveller while running and through the
  replay, the bodies' slow fades, the halos, and one sky (shown from the start, turning while paused, stopping in
  place). Updated: the interstellar frames compared without stars, the results frame from the revised canvas frame,
  the height caption's tests (shown throughout while in testing), the settings seeding at the current schema.

## 8. Open risks and follow-ups

1. **Questions for the owner** (`docs/questions-overnight.md`, 32 to 34): whether the figure modes (ring, timeline,
   analog, the tree) should also take the shared time and gap, which would change their frames; the ocean and
   height "black screen", not reproduced here; the credits page's look, which has no frame.
2. **The HYG sky on a phone:** the strip is a 2,880 × 1,500 px SVG image decoded at the mode's start (before, only
   on the first pause); two copies share one decode. The performance tests of round 2.10 still pass with it.
3. **Rendering differences:** the frost's backdrop filter changes how pixels around the held display are drawn by
   1 to 2 levels (invisible, but not the frames' exact pixels), even at no opacity; so it is drawn only while the
   display is held and only in modes with art behind the time, and the plain-background frames stay exact.

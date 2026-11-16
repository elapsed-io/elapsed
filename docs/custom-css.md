# Custom CSS: class names and variables

The plan publishes stable, documented class names and CSS variables (Custom CSS safety, defence 8). You can
use them in **settings → advanced → custom css**, or in a browser extension that styles the site. This page
lists the ones that are stable from Release 1. A name that is not listed here may change in any release.

## How custom CSS is applied

- **Saved, then cleaned.** Typing changes nothing. **save** cleans the CSS, stores it on this device only
  (it never syncs or uploads), and applies it.
- **Cleaning removes:** `@import`, `@font-face`, `@namespace` and every other at-rule except `@media`,
  `@supports`, `@container`, `@layer`, `@keyframes`, `@scope` and `@starting-style`. It also removes every
  `url()` except a data image (PNG, JPEG, GIF, WebP or AVIF, up to 8 KB), the functions `image()`,
  `image-set()`, `cross-fade()`, `element()` and `src()`, and the properties `behavior` and
  `-moz-binding`. If nothing needs removing, your text is kept exactly as typed, comments included.
  Otherwise it is rebuilt from what remains, and the note under the editor says so.
- **Size:** at most 50 KB. Larger CSS is refused, not cut.
- **Scope:** every rule applies only inside the timer view, as if written inside `@scope (.view) { … }`,
  where `.view` is the wrapper around the timer view's root `.screen`. Write selectors as you would
  anywhere (`.screen[data-mode="ring"] .time`); `:scope` is the wrapper. Rules cannot reach the settings
  panel, and nothing in the timer view can be drawn over it. `:root`, `html` and `body` match nothing. To
  set a variable, set it on `.screen` or `:scope`.
- **Cascade:** your rules are in the `user` cascade layer, after `base`, `theme` and `mode`, so they win
  over the site's own rules without `!important`. (In cascade layers, `!important` works in reverse: an
  important rule in your layer loses to an important rule in an earlier one.)
- **Safe mode:** to load the site once without custom CSS, use **restart in safe mode** under advanced,
  or add `?safe` to the address. Your CSS stays saved, so you can fix it in the editor. The comma key opens
  settings even when your CSS hides the settings icon.

## CSS variables

Set them on `.screen` (or `:scope`). Colours are any CSS colour.

| Variable | What it controls |
| --- | --- |
| `--color-background` | The timer view's background |
| `--color-foreground` | The time, button text and other text |
| `--color-accent` | Focus in results, the ring, clock hands |
| `--color-muted` | Icons, labels and secondary text |
| `--color-faint` | Dividers and the ring track |
| `--color-track` | The settings panel and the results replay's tracks (outside the timer view, the panel keeps the theme's) |
| `--color-pause` | The pause and cancel buttons |
| `--color-end` | The end button |
| `--color-record` | The personal-record marker |
| `--font-family` | The font of the time and the timer view |
| `--font-stretch` | Its width (`92%` for the default font) |
| `--font-weight-time` | The time's weight (300) |
| `--font-weight-button` | Button text weight (500) |
| `--time-scale` | The time size setting as a factor (1 = 100%) |

The theme sets every colour variable from three colours: background, foreground and accent. If you change
only those three, the others no longer follow them. Set the others too, or change the theme colours under
appearance instead.

## Class names

| Class | What it is |
| --- | --- |
| `.screen` | The timer view's root. `data-mode` holds the display mode (`digits`, `ring`, `timeline`) |
| `.view` | Its wrapper (`:scope`). Its isolation, stacking level and display cannot be changed |
| `.screen--bare` | The timer view with its corner icons hidden (the ending countdown) |
| `.corner`, `.icon-button` | The settings and account icons in the corner |
| `.mode-root` | Where the display mode draws |
| `.time-stack`, `.time`, `.time--main` | The display and its time; `.time__colon` is each colon |
| `.time-stack__body` | Everything the display mode draws, which blurs while paused or waiting for a check-in |
| `.time--paused-for` | How long the session has been paused, while paused |
| `.check-in__text` | The check-in prompt |
| `.controls`, `.button` | The buttons under the time |
| `.button--primary`, `.button--secondary`, `.button--end` | Start, pause or resume; cancel (in the ending countdown); end |
| `.ring`, `.ring__track`, `.ring__rotor`, `.ring__tail`, `.ring__head` | The ring display mode; the rotor turns once a minute (`--ring-angle`), and the tail is `--ring-tail` degrees long |
| `.timeline`, `.timeline__track`, `.timeline__svg`, `.timeline__label` | The timeline display mode |
| `.ending`, `.ending__bar`, `.ending__fill`, `.ending__text` | The ending countdown |
| `.notice` | The session maximum notice |
| `.results`, `.results__time`, `.stats`, `.stat`, `.stat__label`, `.stat__value` | The results screen |
| `.results__graphic`, `.strip`, `.rings` | The results replay (strip or rings) |

## Examples

```css
/* A warmer time, slightly tighter */
.time {
  color: #f2c46b;
  letter-spacing: -0.02em;
}

/* A different accent, only while the ring is showing */
.screen[data-mode="ring"] {
  --color-accent: #4190d1;
}

/* No account icon */
.corner .icon-button:last-child {
  display: none;
}
```

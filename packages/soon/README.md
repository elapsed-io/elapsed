# The "soon" page

What elapsed.io shows until the public launch (plan, Release 1, round 8): the word "soon" under a small
"elapsed", drawn exactly as the canvas's "soon" frames, in the default theme matching the system's setting
(graphite when dark, paper when light). It is static: no scripts, no counting, no cookies, nothing from any
other address, and the same security headers as the app. It is its own small Cloudflare project, deployed
separately from the app; at launch the app takes over the domain.

| File | |
| --- | --- |
| `public/index.html` | The page. |
| `public/soon.css` | Its styles. Only the word scales with the window, as the timer does. |
| `public/soon.woff2` | The site's default font ("Timer Sans", a modified Archivo, OFL 1.1), cut down to the letters on the page: 2,620 bytes, SHA-256 `e258a26b0f555d183cc219b6868de044920e7f4cfe8efc26d60d54aa222bc308`. Rebuilt by `scripts/build_font.py`. |
| `public/OFL.txt` | The font's license, served beside it. |
| `public/icon.svg` | The app's placeholder icon, for the browser tab. |
| `public/_headers` | The Content Security Policy (no scripts at all) and the other security headers. |
| `wrangler.jsonc` | The Cloudflare project: static assets only, named `elapsed-soon`, on the custom domain `elapsed.io`. |

The browser tests (`packages/web/e2e/soon.spec.ts`) check the page against both frames pixel for pixel,
under its own headers, and check that it runs no script and requests nothing but its own files.

## Deploying (the owner runs this)

From this folder, signed in to the Cloudflare account that holds elapsed.io:

```bash
npx wrangler@4.162.0 deploy
```

This creates the `elapsed-soon` project and attaches `elapsed.io` to it as a custom domain. Nothing else
is needed: there is no build step and no secret. `www.elapsed.io` is not attached; add it in the
dashboard, or add a second route here, if it should show the page too.

## At launch

Remove the `elapsed.io` route from this project (or delete the project) in the Cloudflare dashboard, then
attach `elapsed.io` to the app's Worker (`packages/endpoint/wrangler.jsonc`), so the app takes over the
domain.

## Rebuilding the font

```bash
python3 -m venv .fontenv && .fontenv/bin/pip install -r ../web/scripts/font/requirements.txt
```

```bash
.fontenv/bin/python -I scripts/build_font.py --source ../web/src/assets/fonts/timer-sans.woff2 --out public/soon.woff2
```

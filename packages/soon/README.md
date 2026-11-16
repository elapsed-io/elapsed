# The "soon" page, privacy and terms

What elapsed.io shows until the public launch (plan, Release 1, round 8): the word "soon" under a small
"elapsed", with "privacy" and "terms" links below, drawn exactly as the canvas's "soon" frames, in the
default theme matching the system's setting (graphite when dark, paper when light). The privacy page and
terms are at elapsed.io/privacy and elapsed.io/terms, in the same style. Everything is static: no scripts,
no counting, no cookies, nothing from any other address, and the same security headers as the app. It is
its own small Cloudflare project, deployed separately from the app; at launch the app takes over the domain.

| File | |
| --- | --- |
| `public/index.html` | The "soon" page. |
| `public/soon.css` | Its styles. Only the word scales with the window, as the timer does. |
| `public/soon.woff2` | The site's default font ("Timer Sans", a modified Archivo, OFL 1.1), cut down to the letters on the page (3,736 bytes). |
| `public/privacy.html`, `public/terms.html` | The legal pages, written by `scripts/legal.ts` from `docs/legal/privacy.md` and `terms.md`. Edit those, not these. |
| `public/legal.css`, `public/legal.woff2` | Their styles, and the same font cut down to their characters (10,360 bytes). |
| `public/OFL.txt` | The font's license, served beside it. |
| `public/icon.svg` | The app's placeholder icon, for the browser tab. |
| `public/_headers` | The Content Security Policy (no scripts at all) and the other security headers, for every path. |
| `wrangler.jsonc` | The Cloudflare project: static assets only, named `elapsed-soon`, on the custom domain `elapsed.io`. |

`/privacy` serves `privacy.html` and `/terms` serves `terms.html` (Cloudflare's default HTML handling);
any other path shows the "soon" page. The browser tests (`packages/web/e2e/soon.spec.ts`) check the page
against both frames pixel for pixel, and every page under its own headers: no script, no cookie, nothing
requested but its own files, and the legal pages reflow at 320 px and 200 % zoom. A unit test fails if a
legal page differs from its source.

## Deploying (the owner runs this)

Step by step, for someone new to Cloudflare: `docs/deploy.md`, part 4. From the repository root, signed in
to the Cloudflare account that holds elapsed.io:

```bash
npm run deploy:soon
```

This creates the `elapsed-soon` project and attaches `elapsed.io` to it as a custom domain. There is no
build step and no secret.

### www.elapsed.io

A static-assets project cannot redirect by host name, so `www.elapsed.io` → `elapsed.io` is set up once in
the Cloudflare dashboard for the elapsed.io zone:

1. **DNS → Records:** add a proxied (orange cloud) record for `www`, for example `AAAA www 100::`. It only
   needs to exist so Cloudflare receives the requests; it is never reached.
2. **Rules → Redirect Rules → Create rule:** choose the template "Redirect from WWW to root", or by hand:
   when the hostname equals `www.elapsed.io`, redirect dynamically to
   `concat("https://elapsed.io", http.request.uri.path)`, status 301, preserving the query string.

Check with:

```bash
curl -sI https://www.elapsed.io/privacy
```

It should answer `301` with `location: https://elapsed.io/privacy`.

## At launch

Remove the `elapsed.io` route from this project (or delete the project) in the Cloudflare dashboard, then
attach `elapsed.io` to the app's Worker (`packages/endpoint/wrangler.jsonc`), so the app takes over the
domain. The privacy and terms pages move into the app before then, so they stay at the same addresses.

## Rebuilding the pages and fonts

After changing `docs/legal/privacy.md` or `terms.md`:

```bash
node scripts/legal.ts
```

After any page's text changes (the fonts hold only the characters the pages show):

```bash
python3 -m venv .fontenv && .fontenv/bin/pip install -r ../web/scripts/font/requirements.txt
```

```bash
.fontenv/bin/python -I scripts/build_font.py --source ../web/src/assets/fonts/timer-sans.woff2 --public public
```

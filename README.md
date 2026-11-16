# elapsed

A website that opens directly on a stopwatch for tracking focused work, at elapsed.io. The name, the
domain and all user-facing copy live in `packages/core/src/brand.ts`. The source lives at
https://github.com/elapsed-io/elapsed.

The build plan is `docs/plan.md`. It is the source of truth; its Architecture invariants, Principles and
Working rules apply to every change. The visual source of truth is the design canvas handed over with it.

## Layout

```text
packages/core   Pure TypeScript: config (every tunable number), brand (name and all copy), the
                session model and its validation, the settings schema, the crash report format,
                the event bus, and the timer engine with its single scheduler. Test helpers (a
                fake clock) at @stopwatch/core/testing. No DOM, no network.
packages/web    The site: index.html, styles, themes, icons, the self-hosted fonts, the settings
                panel, storage adapters, tab coordination, the service worker, build plugins, CI
                scripts and end-to-end tests.
packages/endpoint
                The one small endpoint: a Cloudflare Worker that keeps anonymous daily usage
                counts and opt-in crash reports in D1 (migrations/, wrangler.jsonc).
docs            plan.md, decisions.md, data-inventory.md, safety/ (one overview per round)
tooling         Lint safety rules and repository-wide tests.
```

## Commands

Requires Node 22.18 or later (CI uses the version in `.nvmrc`).

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run check
```

`npm run check` runs, in order: `typecheck`, `lint`, `test`, `check:contrast`, `build` and `check:size`.

```bash
npm run test:e2e
```

Display modes, themes and fonts are chosen in settings (the settings icon, or the comma key). Custom CSS is
under settings → advanced; its class names and variables are in `docs/custom-css.md`, and `?safe` in the
address loads the site once without it.

The end-to-end tests build the site and serve it with `vite preview`, which sends the same security
headers as production. To use an already installed Chromium instead of Playwright's download, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its path. The Vite dev server does not send the CSP.

The placeholder app icons in `packages/web/public/icons/` are drawn by a script; after changing it, run:

```bash
npm run icons -w @stopwatch/web
```

## Deployment

The owner runs every deploy; nothing deploys from CI. The app is one Cloudflare Worker
(`packages/endpoint/wrangler.jsonc`): it serves the build output (`packages/web/dist`, with its security
headers in `dist/_headers`) as static assets and runs only for `/api/`.

- **Private test run:** `npm run deploy:test` deploys the `test` environment, its own Worker and D1
  database on a workers.dev address behind Cloudflare Access. Every step is in `docs/test-run.md`.
- **Launch:** the production Worker takes elapsed.io from the soon page (`packages/soon`). Its first deploy
  creates the D1 database, puts its id in `wrangler.jsonc` and applies `packages/endpoint/migrations/`.
- **After every deploy:** `npm run check:deployed -- app|soon <address>` checks status codes, security
  headers and cookies against the build.
- **Undoing a deploy:** `docs/rollback.md`. To turn offline support off for everyone, publish
  `packages/web/public/sw-control.json` as `{"serviceWorker":"off"}`.
- **Before release:** `docs/device-checks.md` (real devices) and `docs/known-issues.md`.

## Licences

The code is GPL-3.0 (`LICENSE`). The default font is a modified Archivo under the SIL Open Font License
(`packages/web/src/assets/fonts/`). The settings and account icons are from Tabler Icons under MIT
(`packages/web/src/icons/`); the session maximum icon and the app icons are drawn for this project.

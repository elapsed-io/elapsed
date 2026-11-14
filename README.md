# stopwatch

A website that opens directly on a stopwatch for tracking focused work. The product name is not yet
chosen; it lives in `packages/core/src/brand.ts`.

The build plan is `docs/plan.md`. It is the source of truth; its Architecture invariants, Principles and
Working rules apply to every change. The visual source of truth is the design canvas handed over with it.

## Layout

```text
packages/core   Pure TypeScript: config (every tunable number), brand (name and all copy), and from
                round 2 the session model and timer engine. No DOM, no network.
packages/web    The site: index.html, styles, themes, icons, the self-hosted font, build plugins,
                CI scripts and end-to-end tests.
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

The end-to-end tests build the site and serve it with `vite preview`, which sends the same security
headers as production. To use an already installed Chromium instead of Playwright's download, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its path. The Vite dev server does not send the CSP.

## Deployment

The build output (`packages/web/dist`) is a static site for Cloudflare, with its security headers in
`dist/_headers`. Nothing is deployed yet.

## Licences

The code is GPL-3.0 (`LICENSE`). The default font is a modified Archivo under the SIL Open Font License
(`packages/web/src/assets/fonts/`). The icons are from Tabler Icons under MIT (`packages/web/src/icons/`).

# Legal pages

The short privacy page and terms the plan requires before Release 1's public launch (plan, Open decisions >
Minimum age and legal documents), approved by the owner on 2026-11-16 and effective November 15, 2026. They
are published with the "soon" page at elapsed.io/privacy and elapsed.io/terms.

- [`privacy.md`](privacy.md) and [`terms.md`](terms.md) are the source. Their pages,
  `packages/soon/public/privacy.html` and `terms.html`, are written from them by
  `packages/soon/scripts/legal.ts`; a test fails if a page and its source differ.
- They describe what is live (the "soon" page) and the Release 1 timer: anonymous usage counts and opt-in
  crash reports. The privacy page is updated before accounts arrive, and the full documents, covering
  accounts, widgets and payments, follow before Release 3.

After changing either source, regenerate the pages and their font:

```bash
node packages/soon/scripts/legal.ts
```

```bash
python3 -I packages/soon/scripts/build_font.py --source packages/web/src/assets/fonts/timer-sans.woff2 --public packages/soon/public
```

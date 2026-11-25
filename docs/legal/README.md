# Legal pages

The short privacy page and terms the plan requires before Release 1's public launch (plan, Open decisions >
Minimum age and legal documents), approved by the owner on 2026-11-16 and effective November 15, 2026. They
are published with the "soon" page at elapsed.io/privacy and elapsed.io/terms.

- [`privacy.md`](privacy.md) and [`terms.md`](terms.md) are the source. Their pages,
  `packages/soon/public/privacy.html` and `terms.html`, are written from them by
  `packages/soon/scripts/legal.ts`; a test fails if a page and its source differ.
- Since Release 2 (round 2.16) the app serves them too, at `/privacy` and `/terms`, written by its build
  (`packages/web/build/pages.ts`) through the same renderer, in the chosen theme. One source serves two editions:
  blocks between `<!-- soon only -->` and `<!-- end -->` are the soon page's alone, blocks between
  `<!-- app only -->` and `<!-- end -->` the app's (each marker a paragraph of its own). The app's edition
  describes the open timer and what Release 2 keeps on the device; it awaits the owner's final legal review,
  which also sets the effective date for the launch (decision 427).
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

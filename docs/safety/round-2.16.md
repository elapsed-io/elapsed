# Safety overview: Release 2, round 2.16 (Hardening, the launch list and the release review)

Date: 2026-11-25. Template: plan, Safety overviews > Round overview. Breakdown: `docs/plan-release-2.md`, round
2.16; the owner's answer 38 (Release 2 is the public launch on elapsed.io; Release 1's launch list applies in
full; the final legal review and making the repository public are the owner's). The release review that follows
this round is `docs/safety/release-2.md`.

## 1. What changed

- **The privacy page and terms are served by the app** at `/privacy` and `/terms` (decisions 426, 427), from the
  same sources as the soon page's (`docs/legal`), in an app edition that describes the open timer and what Release
  2 keeps on the device; the soon page's edition is unchanged. The three plain pages (credits, privacy, terms)
  share one stylesheet and one theme script; the settings footer links them on the site's own origin.
- **The source code link** is switched by one constant, `REPOSITORY_PUBLIC`, false until the owner confirms the
  repository is public (decision 428).
- **The launch steps** are written for the owner (`docs/deploy.md`, Part 7), with `npm run deploy:production`
  and a deployed-headers check that now covers the plain pages (decision 429).
- **The hardening pass** (decision 430): axe-core over analog, both tips and the plain pages; the long-run and
  hidden-tab tests over every standard mode; the device checklist's Release 2 checks; a secret scan and the
  dependency audit.

## 2. Data

No new data is stored, sent or received. The plain pages read this browser's settings (to apply the theme) and
write nothing. The privacy page's app edition now names the tips record (round 2.14) and the kept files of a chosen
display mode, both already in `docs/data-inventory.md`.

## 3. Inputs

| What | How it is checked |
| --- | --- |
| `docs/legal/*.md`, at build time | The renderer accepts a small part of Markdown, escapes every character it does not produce itself, and rejects unbalanced, nested or inline edition markers (unit tests). The app's pages hold no script but the site's own theme module. |
| Stored settings on the plain pages | Read through the settings store's validation, as on the credits page since round 2.14; a damaged record shows the default theme (end-to-end tests). |

## 4. Dependencies

None added or removed. `npm audit` finds 0 vulnerabilities; registry signatures verify (53 packages with
attestations).

## 5. Security surface

- **Two more static pages** on the site's own origin, under the site's CSP and headers (the end-to-end test reads
  them from the served responses): no inline script or style, the one theme module (`page-theme`, 0.29 KB), the
  site's stylesheet `pages.css`.
- **The settings footer's privacy and terms links** now stay on the site's origin (`/privacy`, `/terms`), so no
  copy of the site sends a visitor to another one.
- **No configuration attaches elapsed.io to the app.** The production deploy script exists for the owner's launch;
  it runs the local Workers check first, and a repository test pins its Wrangler version and that only it omits the
  test environment.

## 6. Abuse cases

- **A crafted `settings` record** on a legal page can only choose one of the validated themes or colours.
- **A typo in an edition marker** fails the build's renderer (and its unit test), so the app can never publish the
  soon page's wording, or the soon page the app's, by accident.
- **The source code link** cannot appear before the owner flips one reviewed constant.

## 7. Tests

- **Results:** see the round summary in `docs/questions-overnight.md` for `npm run check` and the reference run in
  Chromium, Firefox and WebKit.
- **Unit tests:** the legal editions (`packages/soon/scripts/legal.test.ts`: both editions from one source, broken
  markers refused, the app's edition free of the soon page's wording, the soon page's unchanged); the footer links
  and the repository switch (`packages/core/src/brand.test.ts`); the deploy scripts (`tooling/repository-text.test.ts`).
- **End-to-end tests:** `e2e/site-pages.spec.ts` (each page served with the site's CSP and Permissions-Policy, its
  headings exactly the app edition's, the footer with the current page marked; the privacy page's Release 2 lines;
  the chosen theme; reflow at 320 px and 200 % zoom; the settings footer's links and no source code link);
  `e2e/accessibility.spec.ts` (axe over analog, both tips, and the three pages in a dark and a light theme);
  `e2e/performance.spec.ts` (every standard mode over seven hours and in a hidden tab).

## 8. Open risks and follow-ups

1. **The app edition's wording and date** await the owner's final legal review (decision 427).
2. **The deployed checks** (headers on elapsed.io, production outside Access, the test build inside it) can only
   run once the owner has launched (`docs/deploy.md`, Part 7, steps 5 and 6).
3. **GitHub's own secret scanning** cannot run until the owner turns it on (`docs/deploy.md`, Part 7, C, right after the repository is made public); until
   then the repository's pattern test and the local scan stand in.

## Revision, 2026-11-25 (plan version 14)

- **The owner's launch tasks in the plan's order** (decision 447): the legal review with the effective date set to
  the launch day, the repository public, secret scanning and push protection right after, the source code link, the
  device checks, then the deploy and sign-off. `docs/deploy.md`, Part 7, has the first five as A to E before the
  deploy, and a sign-off step; `docs/release-readiness.md` (section 4) and `docs/safety/release-2.md` (part E) list
  them the same way.
- **The full git history scanned for secrets** (decision 446): every blob, path and commit message reachable from
  any of the remote's 11 refs (branches and pull request refs), 98 commits and 1,838 blobs. No key, token, password
  or private key was ever committed. The private admin address is in no file or message, but is the author address
  of three merge commits made on GitHub's website; question 41 asks the owner how to handle it before the repository
  is made public. The scan ran locally; nothing was sent to a service.
- **The release review** (`docs/safety/release-2.md`) is revised: question 40's risk closed (decision 444), the
  secrets item answered from the full history, the six tasks in order, questions 13 to 22 and 28 to 33 kept as built
  until answered.
- **Data, inputs, dependencies, security surface:** unchanged by this revision. Open risk 3 above now reads: GitHub's
  scanner runs once the owner switches it on right after making the repository public (task 3).
- **Tests:** the reference run in Chromium, Firefox and WebKit and `npm run check` (results in the morning summary,
  `docs/questions-overnight.md`).

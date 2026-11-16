# The private test run

Release 1 ends with a private test run (plan, Release 1, round 8): a handful of friends use the site on
their own devices for about a week, and their problems are fixed before the public launch. The app runs
on its own workers.dev address behind Cloudflare Access, so only invited email addresses can open it.
elapsed.io keeps showing the "soon" page; the app does not touch the domain until launch.

The owner runs every step that touches Cloudflare. Nothing here is automated, and nothing deploys from CI.
Commands run from the repository root, on the commit that passed CI. `docs/deploy.md` walks through every
Cloudflare step for someone new to Cloudflare; this page is the test run's checklist around it.

Feedback from testers goes to **support@elapsed.io**.

## 1. Before deploying

```bash
npm ci
```

```bash
npm run check
```

```bash
npm run test:e2e
```

Confirm that the GitHub Actions run for the same commit passed in all three browsers.

## 2. The test database (once)

`docs/deploy.md`, part 2, steps 2 and 3: create `elapsed-test`, put its id under `env.test` in
`packages/endpoint/wrangler.jsonc`, and create its tables. The test run has its own database, so testers'
counts and crash reports never mix with the real site's.

## 3. Deploy

`docs/deploy.md`, part 2, step 4:

```bash
npm run deploy:test
```

It deploys the `elapsed-test` Worker (`env.test` in `packages/endpoint/wrangler.jsonc`) to
`https://elapsed-test.<your subdomain>.workers.dev`. Every later deploy is the same command.

## 4. Cloudflare Access

`docs/deploy.md`, part 3, steps 1 to 5, straight after the first deploy and before sharing the address: a
self-hosted application allowing only the testers' emails (one-time PIN, sessions of a week), and three
bypass applications for `api/`, `manifest.webmanifest` and `icons/`, which browsers and the site fetch
without cookies. Check from a private window that only invited emails get in.

## 5. Check the deployed headers

`docs/deploy.md`, part 3, step 6, with a service token:

```bash
CF_ACCESS_CLIENT_ID=<client id> CF_ACCESS_CLIENT_SECRET=<client secret> npm run check:deployed -- app https://elapsed-test.<your subdomain>.workers.dev
```

Without a token, the same can be checked by hand: sign in, open the browser's developer tools → Network,
reload, and compare the page's response headers with `packages/web/dist/_headers`. The soon site is checked
without a token:

```bash
npm run check:deployed -- soon https://elapsed.io
```

## 6. Invite the testers

Send each tester the address and something like this (edit freely):

> Thanks for trying elapsed, a stopwatch for focused work. Open the link on whichever devices you use for
> work or study, sign in with this email address (Cloudflare sends you a one-time code), and use it for real
> work for a week: start, pause, end, try ring and timeline, and look through settings. Adding it to your home
> screen and turning on notifications are worth a try too.
>
> Please send anything that looks wrong, confusing or slow to support@elapsed.io, with your device and
> browser, and a screenshot if you can.
>
> What is collected: the site keeps your sessions and settings on your device only. It counts visits and
> sessions as anonymous daily totals (you can switch that off in settings → privacy and data), and it
> sends crash reports only if you switch them on. Because this test is private, Cloudflare Access keeps your
> email address on the invite list, sends the sign-in code to it, logs each sign-in, and stores a sign-in
> cookie on this test address. That stops when the test ends. The privacy page is at
> https://elapsed.io/privacy.

## 7. During the week

- Read feedback at support@elapsed.io; known limits are in `docs/known-issues.md`, so testers need not
  report those twice.
- Crash reports (only from testers who switched them on), newest first:

  ```bash
  npx --yes wrangler@4.162.0 d1 execute elapsed-test --remote --env test --config packages/endpoint/wrangler.jsonc --command "SELECT day, version, browser, browser_version, message FROM crash_reports ORDER BY id DESC LIMIT 20"
  ```

- A fix is a new commit, CI, then step 3 again. Testers get it on their next visit (the service worker
  checks for a new version on every load).
- Real-device checks (`docs/device-checks.md`) are done during the week, on testers' devices where possible.

## 8. After the test run

1. Zero Trust → Access → Applications: delete the four "elapsed test run" applications and any service
   token. Access's sign-in logs are kept by Cloudflare for its own retention period.
2. Delete the test Worker and its database:

   ```bash
   npx --yes wrangler@4.162.0 delete --env test --config packages/endpoint/wrangler.jsonc
   ```

   ```bash
   npx --yes wrangler@4.162.0 d1 delete elapsed-test
   ```

3. Remove testers' email addresses from wherever else they were kept for the invitation.

If something goes wrong at any point, `docs/rollback.md` says how to undo a deploy.

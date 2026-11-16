# The private test run

Release 1 ends with a private test run (plan, Release 1, round 8): a handful of friends use the site on
their own devices for about a week, and their problems are fixed before the public launch. The app runs
on its own workers.dev address behind Cloudflare Access, so only invited email addresses can open it.
elapsed.io keeps showing the "soon" page; the app does not touch the domain until launch.

The owner runs every step that touches Cloudflare. Nothing here is automated, and nothing deploys from CI.
Commands run from the repository root, on the commit that passed CI.

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

Optional: Wrangler sends anonymous usage data to Cloudflare. To turn that off on your machine:

```bash
npx --yes wrangler@4.162.0 telemetry disable
```

## 2. The test database (once)

The test run has its own D1 database, so testers' counts and crash reports never mix with the real site's.

```bash
npx --yes wrangler@4.162.0 d1 create elapsed-test
```

Put the `database_id` it prints into `packages/endpoint/wrangler.jsonc`, under `env.test` (the production
database above it stays a placeholder until launch). The id is not a secret. Then create the tables:

```bash
npx --yes wrangler@4.162.0 d1 migrations apply elapsed-test --remote --env test --config packages/endpoint/wrangler.jsonc
```

## 3. Deploy

```bash
npm run deploy:test
```

This builds the site and deploys the `elapsed-test` Worker (`env.test` in `packages/endpoint/wrangler.jsonc`):
the built site as static files with their `_headers`, and the Worker for `/api/` only. Wrangler prints
the address, `https://elapsed-test.<your subdomain>.workers.dev`. Every later deploy is the same command.

## 4. Cloudflare Access

Do this straight after the first deploy, before sharing the address.

1. Cloudflare dashboard → Zero Trust → Settings → Authentication: make sure **One-time PIN** is a login
   method. Testers type their email and receive a code; no account or password is needed.
2. Zero Trust → Access → Applications → Add an application → Self-hosted. Name it "elapsed test run",
   with the domain `elapsed-test.<your subdomain>.workers.dev` and no path. Add a policy:
   - action **Allow**, include **Emails**: each tester's address, and your own;
   - session duration: 1 week, so testers sign in about once for the whole run.
3. Add three more self-hosted applications for the same domain, each with a policy of action **Bypass**,
   include **Everyone**, and these paths:
   - `api/` (usage counts and crash reports),
   - `manifest.webmanifest`,
   - `icons/`.

   The site sends counts and crash reports without cookies, by design, and browsers fetch the manifest
   and its icons without cookies too; without these rules Access would answer them with its sign-in page,
   so counts and crash reports would be lost and installing to a home screen would fail. Nothing behind
   them is private: the counting endpoint is public at launch too, and the manifest and icons are files.
4. Check from a private window: the address shows Access's sign-in; an uninvited email gets no code;
   an invited one gets in. Workers & Pages → `elapsed-test` → Settings → Domains & Routes should show the
   workers.dev address as protected (Cloudflare also offers one-click protection there, which covers the
   whole Worker; the applications above are used instead because they allow the bypass paths).

## 5. Check the deployed headers

The plan's release review asks for the CSP and headers to be checked on the deployed build. For a script
to pass Access, create a service token (Zero Trust → Access → Service credentials → Service Tokens), add a
policy with action **Service Auth** that includes it to the "elapsed test run" application, and run:

```bash
npm run build
```

```bash
CF_ACCESS_CLIENT_ID=<client id> CF_ACCESS_CLIENT_SECRET=<client secret> npm run check:deployed -- app https://elapsed-test.<your subdomain>.workers.dev
```

It checks the page, a script, a stylesheet, the service worker, the kill switch, the manifest, an icon and
the Worker, against `packages/web/dist/_headers`; it also checks that the bypassed paths answer without
signing in, and that nothing sets a cookie except Access's own. Delete the service token afterwards (or
keep it only for the test run). Without a token, the same can be checked by hand: sign in, open the
browser's developer tools → Network, reload, and compare the page's response headers with
`packages/web/dist/_headers`.

The soon site is checked the same way, without a token:

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

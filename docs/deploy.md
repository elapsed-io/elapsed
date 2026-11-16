# Deploying elapsed

A step-by-step guide for someone who has never used Cloudflare. It covers the one-time setup, deploying
the Release 1 test build to its workers.dev address, putting Cloudflare Access in front of it so only your
testers can open it, deploying the "soon" page to elapsed.io, and rolling back.

The owner runs every deploy. Nothing deploys from CI, and nothing here is automated.

## What goes where

| What | Cloudflare Worker | Address | Who can open it |
| --- | --- | --- | --- |
| The Release 1 test build (the app) | `elapsed-test` | `https://elapsed-test.<your subdomain>.workers.dev` | Only the testers' email addresses (Cloudflare Access) |
| The "soon" page, privacy and terms | `elapsed-soon` | `https://elapsed.io` | Everyone |

Until the public launch, **the app never touches elapsed.io**: only `npm run deploy:test` deploys the app,
and it deploys to the workers.dev address. elapsed.io keeps showing the soon page.

### Words you will meet

- **Cloudflare dashboard:** the website at https://dash.cloudflare.com where everything is set up.
- **Worker:** a small program Cloudflare runs on its servers. Both projects are Workers; the app's also
  serves the built site as static files, and the soon page is static files only.
- **workers.dev:** a free address Cloudflare gives every account, `<name>.<your subdomain>.workers.dev`.
- **D1:** Cloudflare's database. The app's counting endpoint keeps its daily totals and crash reports there.
- **Wrangler:** Cloudflare's command-line tool. The commands below run a pinned version of it through
  `npx`, which downloads it on first use, so there is nothing to install.
- **Zero Trust and Access:** the part of Cloudflare that puts a sign-in page in front of an address.

Commands run in a terminal, from the repository's root folder unless a step says otherwise. Copy each one
exactly. Dashboard menu names below were correct when written; Cloudflare renames things from time to
time, and the dashboard's search box finds any page by name.

## Part 1. One-time setup

### 1. A Cloudflare account

1. Sign up at https://dash.cloudflare.com/sign-up with the private admin address, the one that owns every
   backend service account. (It is never written in the repository or on the site.)
2. Confirm the email Cloudflare sends.
3. Turn on two-factor authentication: the person icon at the top right → Profile → Authentication →
   Two-Factor Authentication. Keep the backup codes somewhere safe and offline.

### 2. elapsed.io in that account

The soon page can only use elapsed.io if the domain is in the same account.

- **If you bought elapsed.io through Cloudflare:** it is already there. Skip to step 3.
- **If you bought it elsewhere:** in the dashboard, choose **Add a domain** (or "Add a site"), type
  `elapsed.io`, and pick the **Free** plan. Cloudflare shows two nameservers (like
  `xxx.ns.cloudflare.com`). Sign in at the company you bought the domain from, find the domain's
  nameserver setting, and replace its nameservers with Cloudflare's two. It can take from minutes to a day;
  the domain's overview page in Cloudflare says **Active** when it is done, and Cloudflare emails you.

### 3. Your workers.dev subdomain

In the dashboard, open **Workers & Pages** (under "Compute"). The account's workers.dev subdomain is shown
on that page (for example `yourname.workers.dev`); if none is set, Cloudflare asks you to choose one. The
test build's address will be `elapsed-test.<that subdomain>.workers.dev`. Testers see it, so pick
something you are happy to share.

### 4. The tools on your computer

1. **Git:** on a Mac, run `git --version` in Terminal; if it is missing, macOS offers to install it.
2. **Node.js 26.13.1**, exactly: the repository refuses any other version. Install it from
   https://nodejs.org/en/download (choose version 26.13.1), or with a version manager such as `nvm`, which
   reads the version from the repository's `.nvmrc`. Check:

   ```bash
   node --version
   ```

   It must print `v26.13.1`.
3. **The repository:**

   ```bash
   git clone https://github.com/elapsed-io/elapsed.git
   ```

   ```bash
   cd elapsed
   ```

### 5. Sign Wrangler in to Cloudflare

```bash
npx --yes wrangler@4.162.0 login --use-keyring
```

A browser window opens and asks you to allow Wrangler access to your Cloudflare account; allow it.
`--use-keyring` keeps the sign-in in your Mac's keychain instead of a plain file. Check which account it
signed in to:

```bash
npx --yes wrangler@4.162.0 whoami
```

Optional: Wrangler sends anonymous usage data to Cloudflare. To turn that off on your computer:

```bash
npx --yes wrangler@4.162.0 telemetry disable
```

## Part 2. Deploy the Release 1 test build

### 1. Get the build that passed its checks

Release 1 lives on the branch `claude/website-foundations-r1-krnpbp`.

```bash
git switch claude/website-foundations-r1-krnpbp
```

```bash
git pull
```

On GitHub, open the repository's **Actions** tab and check that the run for the newest commit on that
branch passed (a green tick) in all three browsers. Then install exactly the locked packages and run the
checks on your computer:

```bash
npm ci
```

```bash
npm run check
```

`npm run check` must end without errors. Optionally, run the browser tests as CI does (needs Docker
Desktop running):

```bash
npm run test:e2e:docker
```

### 2. Create the test database (first time only)

The test run has its own database, so testers' counts and crash reports never mix with the real site's.

```bash
npx --yes wrangler@4.162.0 d1 create elapsed-test
```

It prints a `database_id` (a long id like `1a2b3c4d-…`). If Wrangler offers to add it to a configuration
file for you, decline. Open `packages/endpoint/wrangler.jsonc` in a text editor, find the `"test"` section
near the bottom, and replace the zeros in its `database_id` with the printed id:

```jsonc
          "database_name": "elapsed-test",
          // Filled in when the test database is created (docs/deploy.md, part 2, step 2).
          "database_id": "<the id it printed>",
```

Change only the one under `"test"`; the one near the top is the production database, which stays a
placeholder until launch. The id is not a secret. Save the file and commit it, so every later deploy uses
it:

```bash
git commit -am "Test database id"
```

```bash
git push
```

### 3. Create the database's tables (first time only)

```bash
npx --yes wrangler@4.162.0 d1 migrations apply elapsed-test --remote --env test --config packages/endpoint/wrangler.jsonc
```

Answer yes when it asks to apply the migrations. It should report both migrations as applied.

### 4. Deploy

```bash
npm run deploy:test
```

This builds the site and deploys the `elapsed-test` Worker: the built site as static files with their
security headers, and the counting endpoint for `/api/`. At the end Wrangler prints the address,
`https://elapsed-test.<your subdomain>.workers.dev`.

**Do not share the address yet.** Until Part 3 is done, anyone who guesses it can open it.

Every later deploy of the test build is steps 1 and 4 again: get the newest passing commit, then
`npm run deploy:test`. Testers get the new version the next time they open the site.

## Part 3. Cloudflare Access for your testers

Do this straight after the first deploy.

### 1. Open Zero Trust (first time only)

In the dashboard, open **Zero Trust**. The first time, it asks for a **team name** (it becomes part of the
sign-in page's address, `<team name>.cloudflareaccess.com`, which testers see) and a plan: choose the
**Free** plan, which covers up to 50 people. It may ask for a payment method even for the free plan.

### 2. Let testers sign in with a code

Zero Trust → **Settings** → **Authentication** → Login methods: make sure **One-time PIN** is listed (add it
if not). Testers then type their email and receive a sign-in code; they need no account or password.

### 3. Protect the test address

Zero Trust → **Access** → **Applications** → **Add an application** → **Self-hosted**.

- Application name: `elapsed test run`.
- Domain: `elapsed-test.<your subdomain>.workers.dev`, with no path.
- Session duration: **1 week**, so testers sign in about once for the whole run.
- Add a policy: name `testers`, action **Allow**, and a rule **Include → Emails** listing each tester's
  address and your own.

Save the application.

### 4. Let the public parts through

The site sends usage counts and crash reports without cookies (by design), and browsers fetch the web app
manifest and its icons without cookies too. Behind Access those would get the sign-in page instead, so
counts and crash reports would be lost and adding the site to a home screen would fail. Nothing behind
them is private.

Add three more self-hosted applications, exactly as in step 3 but each with a path, and each with one
policy of action **Bypass**, rule **Include → Everyone**:

| Application name | Domain | Path |
| --- | --- | --- |
| `elapsed test run: api` | `elapsed-test.<your subdomain>.workers.dev` | `api/` |
| `elapsed test run: manifest` | `elapsed-test.<your subdomain>.workers.dev` | `manifest.webmanifest` |
| `elapsed test run: icons` | `elapsed-test.<your subdomain>.workers.dev` | `icons/` |

(The Worker's own settings page also offers a one-click Access switch. It protects the whole address with
no exceptions, so use the applications above instead.)

### 5. Check it from a private window

1. Open the test address in a private (incognito) window: Access's sign-in page appears instead of the site.
2. Type an email that is not on the list: no code arrives.
3. Type an invited email, enter the code: the site opens.

### 6. Check the deployed security headers

A script compares every response with the headers the build was meant to send. To get past Access it
needs a service token:

1. Zero Trust → Access → **Service credentials** → **Service Tokens** → Create. Copy the Client ID and
   Client Secret (the secret is shown once).
2. Open the `elapsed test run` application → Policies → add a policy with action **Service Auth** that
   includes that service token.
3. Run, with the build you deployed still in place:

   ```bash
   npm run build
   ```

   ```bash
   CF_ACCESS_CLIENT_ID=<client id> CF_ACCESS_CLIENT_SECRET=<client secret> npm run check:deployed -- app https://elapsed-test.<your subdomain>.workers.dev
   ```

   It checks the page, a script, a stylesheet, the service worker, the offline kill switch, the manifest,
   an icon and the counting endpoint; that the three bypassed paths answer without signing in; and that
   nothing sets a cookie except Access's own. It must report no failures.
4. Delete the service token afterwards, or keep it only until the test run ends.

### 7. Invite the testers

Send each tester the address with the invitation in `docs/test-run.md`, step 6, which also says what Access
collects. To add or remove a tester later, edit the `testers` policy's email list (step 3); a removed
tester is shut out once their sign-in expires.

## Part 4. Deploy the soon page to elapsed.io

This puts the "soon" page, the privacy page and the terms on elapsed.io. It needs Part 1 only.

### 1. Deploy

```bash
npm run deploy:soon
```

This creates the `elapsed-soon` Worker and attaches elapsed.io to it as a custom domain; Cloudflare creates
the domain's address records itself. There is no build step and no secret.

If Wrangler reports that a DNS record already exists for elapsed.io (often the parking page of the company
you bought the domain from), open the dashboard → elapsed.io → **DNS** → **Records**, delete the records
named `elapsed.io` (or `@`) of type A, AAAA or CNAME, and run `npm run deploy:soon` again. Leave any MX and
TXT records alone: they are for email.

### 2. Send www.elapsed.io to elapsed.io (first time only)

1. Dashboard → elapsed.io → **DNS** → **Records** → Add record: type `AAAA`, name `www`, IPv6 address
   `100::`, proxy status **Proxied** (orange cloud). It only needs to exist so Cloudflare receives the
   requests; it is never reached.
2. Dashboard → elapsed.io → **Rules** → **Redirect Rules** → Create rule: choose the template **Redirect
   from WWW to root**. If there is no template: when the hostname equals `www.elapsed.io`, redirect
   dynamically to `concat("https://elapsed.io", http.request.uri.path)`, status 301, preserving the query
   string.

### 3. Check it

Open https://elapsed.io, https://elapsed.io/privacy and https://elapsed.io/terms. Then:

```bash
npm run check:deployed -- soon https://elapsed.io
```

It must report no failures.

```bash
curl -sI https://www.elapsed.io/privacy
```

It must answer `301` with `location: https://elapsed.io/privacy`.

Later changes to the soon page, privacy or terms are the same `npm run deploy:soon`.

## Part 5. Rolling back

A rollback puts the previous version back within seconds. It is a stopgap: afterwards, fix the problem in a
new commit, let CI pass, and deploy again. `docs/rollback.md` has the details behind each step.

### The test build

1. List the recent versions and see which one is live:

   ```bash
   npx --yes wrangler@4.162.0 deployments list --env test --config packages/endpoint/wrangler.jsonc
   ```

2. Go back to the version before the current one (or put a version id from the list after `rollback`):

   ```bash
   npx --yes wrangler@4.162.0 rollback --env test --config packages/endpoint/wrangler.jsonc --message "why"
   ```

3. Open the site in a private window, and run the header check (Part 3, step 6).

The database is not rolled back with the Worker; Release 1 never changes its tables.

### When visitors' offline copies are the problem

If a bad build left devices with a broken offline copy, switch offline support off for everyone: set
`packages/web/public/sw-control.json` to `{"serviceWorker":"off"}`, commit, and run `npm run deploy:test`.
Each device drops its offline copy on its next visit and the site keeps working online. Set it back to
`{"serviceWorker":"on"}` and deploy again once fixed.

### The soon page

```bash
npx --yes wrangler@4.162.0 deployments list --config packages/soon/wrangler.jsonc
```

```bash
npx --yes wrangler@4.162.0 rollback --config packages/soon/wrangler.jsonc --message "why"
```

## Part 6. After the test run

`docs/test-run.md`, step 8: delete the four Access applications and any service token, then the test Worker
and its database.

## What never to do before launch

- Never add elapsed.io (or any other domain or route) to `packages/endpoint/wrangler.jsonc`, and never
  attach a domain to `elapsed-test` in the dashboard.
- Never deploy the app without `--env test`; use `npm run deploy:test`, which always includes it.
- Never put the private admin address, an API token or a service token's secret in a file in the
  repository. The repository is public.

# Rollback plan

How to undo a bad deploy (plan, Release review: "a rollback plan is written"). The owner runs every step;
`docs/deploy.md`, part 5, is the short version.
Commands run from the repository root with the pinned Wrangler, `npx --yes wrangler@4.162.0`.

## What a deploy is

- **The app** is one Cloudflare Worker: the built site as static files (with `_headers`) and the script
  for `/api/`. Each deploy is a version holding both, so rolling back the Worker rolls back the site's
  files too. The test run deploys `elapsed-test` (`--env test`); at launch it is `elapsed`.
- **The soon page** is its own static Worker, `elapsed-soon` (`packages/soon`).
- **The database** (D1) is not part of a version. A rollback leaves its tables and rows as they are.
- **Visitors' devices** may hold the site's files in the service worker's cache. They are replaced on
  the next visit after a rollback, because the worker checks `/sw.js` on every load and any change
  installs the previous files.

## The app: back to the previous version

1. See the recent versions and which one is live:

   ```bash
   npx --yes wrangler@4.162.0 deployments list --env test --config packages/endpoint/wrangler.jsonc
   ```

2. Roll back to the one before (or name a version id from the list):

   ```bash
   npx --yes wrangler@4.162.0 rollback --env test --config packages/endpoint/wrangler.jsonc --message "why"
   ```

   It takes effect within seconds. Drop `--env test` for the production Worker after launch.

3. Check it: open the site in a private window, then run the header check (`docs/deploy.md`, part 3, step 6).

4. Fix forward: revert or fix the commit, let CI pass, and deploy again. A rollback is a stopgap, not a
   new state of the repository.

## When the offline cache itself is the problem

If a bad build left visitors' devices with a broken cache (pages that load stale files, or a service
worker that misbehaves), switch offline support off for everyone:

1. Set `packages/web/public/sw-control.json` to `{"serviceWorker":"off"}`, commit, and deploy.
2. On each device's next visit, the page reads the switch (never cached), unregisters the worker and
   empties its caches. The site keeps working online.
3. Once fixed, set it back to `{"serviceWorker":"on"}` and deploy.

## The soon page

```bash
npx --yes wrangler@4.162.0 deployments list --config packages/soon/wrangler.jsonc
```

```bash
npx --yes wrangler@4.162.0 rollback --config packages/soon/wrangler.jsonc --message "why"
```

## The database

Release 1's two migrations only add tables, and no deploy so far changes them. A future migration that
changes or removes data must say in its own file how to undo it, and the owner exports the database first:

```bash
npx --yes wrangler@4.162.0 d1 export elapsed --remote --output backup.sql --config packages/endpoint/wrangler.jsonc
```

(Use `elapsed-test` with `--env test` during the test run.) D1 can also restore a database to any minute
of the last 7 days on the free plan (30 on a paid one) with Time Travel (`wrangler d1 time-travel restore`);
counts and crash reports are the only data it holds, and neither describes anyone.

## At launch: the domain

At launch, elapsed.io moves from the soon page's Worker to the app's. If the launch has to be undone,
attach elapsed.io to `elapsed-soon` again (Workers & Pages → `elapsed-soon` → Settings → Domains & Routes →
Add → Custom domain), which takes the domain back from the app. The soon page's own configuration
(`packages/soon/wrangler.jsonc`) still names elapsed.io, so `npm run deploy:soon` does the same (Wrangler
asks before moving a domain from another Worker).

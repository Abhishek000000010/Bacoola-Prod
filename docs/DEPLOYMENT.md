# Bacoola — Deployment Guide & Incident Log

_Last updated: 2026-07-26_

Everything in this file was verified against the running production system on
2026-07-26 unless explicitly marked otherwise. Where something is a guess, it
says so.

**Read section 2 (Deployment topology) and section 3 (Invariants) before
changing anything about how this project deploys.** Sections 4-7 are the four
real production failures we hit, each with the symptom, the actual root cause,
and the fix. Section 8 is a diagnostic playbook for future problems.

---

## 1. TL;DR for whoever picks this up next

Four separate production bugs, all with the same shape: **the code was correct
and the build succeeded, but production ran something different from what was
built.**

| # | Symptom | Real cause | Fix |
|---|---|---|---|
| 4 | Custom admin widgets & CMS invisible in prod, fine locally | A stale, git-committed `public/admin` folder shadowed the freshly built admin | Untrack it + run `medusa start` from `.medusa/server` |
| 5 | Product/category pages 500 in prod, fine locally | `searchParams` read on an ISR-configured route → `DYNAMIC_SERVER_USAGE` | `export const dynamic = "force-dynamic"` |
| 6 | Shiprocket stopped receiving orders | Server moved to `.medusa/server`, whose separate `node_modules` had an unpatched plugin | Patch script now walks every `node_modules` |
| 7 | Backend crashed on boot (outage) | Deleted `public/admin` before the start command was moved | Reverted, fixed properly, re-applied |

**The recurring lesson:** a green build log proves the build ran. It does not
prove production is running that build's output. Always verify at the artifact
level — what file did the browser actually download, which `node_modules` did
the server actually resolve.

---

## 2. Deployment topology

> ⚠️ **Two stacks exist as of 2026-08-02.** The OLD one below is described for
> reference; the NEW all-Singapore stack is what is being moved to. Full detail
> and the remaining steps live in `SINGAPORE-MIGRATION-2026-08-01.md`.

**NEW — Singapore (deploy from here)**

```
Repo: https://github.com/Abhishek000000010/Bacoola-Prod   (remote `prod`, branch: main)

apps/backend/     Medusa v2 + admin  ──deploys to──►  Render (Singapore)
                                                      https://bacoola-prod.onrender.com
                                                      service srv-d9mrmfijnfac739qcnsg

apps/storefront/  Next.js 15         ──deploys to──►  Render (Singapore)
                                                      https://bacoola-storefront.onrender.com

Database:         Neon PostgreSQL, Singapore (SHARED — see warning below)
Redis:            Upstash, Singapore (TLS-only — see "Redis" below)
```

Both Render services are on the **Free** instance type: 0.1 CPU, 512 MB, spins
down after ~15 min idle. That is the current performance ceiling — see
`PERFORMANCE-FIXES-2026-08-02.md` §6.

**OLD — Oregon/Vercel (still up, `origin`, do not deploy to it)**

```
Repo: https://github.com/Abhishek000000010/Bacoola   (remote `origin`, branch: main)

apps/backend/     Medusa v2 + admin  ──deploys to──►  Render (Oregon)
                                                      https://bacoola.onrender.com
                                                      service srv-d9b6dal8nd3s73a90cfg

apps/storefront/  Next.js 15         ──deploys to──►  Vercel
                                                      https://bacoola-storefront.vercel.app
```

⚠️ `git push origin main` deploys to the OLD production. Push to **`prod`**.

### Redis (Upstash)

Redis is **not** self-hosted and there is no Docker anywhere in this project.
`apps/backend/medusa-config.ts` registers four modules — cache, event bus,
workflow engine, and distributed locking — but **only when `REDIS_URL` is set**.
With it unset, Medusa falls back to in-memory implementations: the backend still
boots, but queued jobs are lost on restart and locking is per-process, which is
not safe for production.

- Provision at <https://console.upstash.com>. Use a **separate database per
  environment**, or set `REDIS_NAMESPACE` per environment so cache keys and the
  BullMQ queue name don't collide.
- Pick the region closest to the Render service to keep round-trips cheap.
- The URL is TLS: `rediss://default:<TOKEN>@<host>.upstash.io:6379` — note the
  double `s`. A `redis://` URL will fail to connect.
- Set `REDIS_URL` in the Render dashboard under **Environment**. Like the
  build/start commands, it is not in the repo.
- The workflow engine uses BullMQ, which holds blocking connections and polls.
  On Upstash that consumes command quota continuously even at idle — watch the
  usage graph after enabling, and expect the free tier to be tight.

Both hosts **auto-deploy on push to `main`**. There is no CI, no staging
environment, and no `.github/workflows`. A push to `main` goes straight to
production on both services.

### Render settings (backend) — current, working values

These live in the Render dashboard under **Settings → Build & Deploy**. They are
**not** in the repo, so they are invisible to `git` and easy to forget.

**Build Command (NEW Singapore service):**
```
bash scripts/render-build.sh
```

That script runs the **same four steps** as the inline command below — the
invariants in section 3 all still hold — but throttles the `.medusa/server`
install (`--maxsockets=3 --fetch-retries=10 --prefer-offline`). Without the
throttle, Render's Singapore build IPs get **npm 429 Too Many Requests**: that
install has no lockfile, so npm fetches metadata for ~1,900 packages in one
burst. The old Oregon service's IPs were not rate-limited, which is why the same
code built fine there. If it 429s again, drop `--maxsockets` to `1`.

**Build Command (OLD Oregon service — the equivalent inline form):**
```
npm install && npm run build -w @dtc/backend && (cd apps/backend/.medusa/server && npm install --legacy-peer-deps) && node scripts/patch-shiprocket-skip-awb.cjs
```

**Start Command (both):**
```
cd apps/backend/.medusa/server && npm run start
```

Every part of those lines is load-bearing. Section 3 explains why.

**Storefront service (Singapore) — Build & Start:**
```
npm install && npm run build -w @dtc/storefront
cd apps/storefront && npx next start -p $PORT
```

The `-p $PORT` is mandatory: the workspace's `start` script hardcodes
`next start -p 8000`, and without the override Render's health checks never
reach it. Root Directory must stay **blank** — both the `-w` build and the root
`postinstall` patch script resolve from the repo root. Env vars for this service
are listed in `SINGAPORE-MIGRATION-2026-08-01.md`; note that every
`NEXT_PUBLIC_*` is inlined at build time, so changing one needs a redeploy, not
a restart.

Other Render facts:
- Node version pinned to 20 via the `NODE_VERSION` env var
- Free instance — **spins down when idle**, so the first request after a quiet
  period can take 50+ seconds. This is not a bug.
- Backend build + deploy takes roughly 4-6 minutes on Oregon; the throttled
  Singapore build is slower (~30-45 min). The storefront builds in ~4 minutes.

### ⚠️ The database is shared and is not local

`DATABASE_URL` points at Neon cloud Postgres. **Another developer uses the same
database.** Any destructive action hits their environment too. Ask before
running anything that writes or deletes. Read-only queries are fine.

---

## 3. Invariants — do not break these

These are the non-obvious rules that production depends on. Each one caused a
real outage or silent failure when violated.

### 3.1 `medusa start` must run from `apps/backend/.medusa/server`

This is the single most important fact in this document.

`medusa build` and `medusa start` disagree about where the admin dashboard
lives:

| Command | Path it uses | Source of truth |
|---|---|---|
| `medusa build` **writes** to | `.medusa/server/public/admin` | `@medusajs/framework/dist/build-tools/compiler.js` |
| `medusa start` **reads** from | `<cwd>/public/admin` | `ADMIN_RELATIVE_OUTPUT_DIR` in `@medusajs/medusa/dist/utils/admin-consts.js` |

They only line up if the server's working directory **is** `.medusa/server`.
This is Medusa's documented production flow
([docs](https://docs.medusajs.com/learn/build)):

> After building, `cd .medusa/server && npm install`, then `npm run start` — and
> you must repeat this every build, because `.medusa/server` is recreated each time.

If you run `medusa start` from `apps/backend` instead, it looks in
`apps/backend/public/admin` — a directory the build never writes to. It will
either serve whatever stale files happen to be sitting there (section 4) or
crash on boot with `Could not find index.html in the admin build directory`
(section 7).

### 3.2 `.medusa/server` gets its own `node_modules` — patches must reach it

Because of 3.1, the production server resolves packages from
`apps/backend/.medusa/server/node_modules`, **not** the repo root. That
directory is created by its own `npm install` and starts out completely
unpatched.

The root `package.json` has `"postinstall": "node scripts/patch-shiprocket-skip-awb.cjs"`,
but that hook:
- runs during the **first** install, before `medusa build` has created
  `.medusa/server` — so there is nothing to patch yet, and it silently skips
- does **not** run for the second install, because
  `.medusa/server/package.json` (derived from `apps/backend/package.json`) has
  no `postinstall` of its own

That is why the build command calls the patch script **explicitly at the end**,
after both installs. Remove that trailing
`&& node scripts/patch-shiprocket-skip-awb.cjs` and Shiprocket silently breaks
again (section 6).

The script itself is idempotent and safe to run repeatedly; it walks all three
possible `node_modules` locations and skips any that are absent or already
patched.

### 3.3 `--legacy-peer-deps` is required for the `.medusa/server` install

The Shiprocket plugin declares a peer dependency on
`@medusajs/framework@2.12.4`; the project runs `2.17.2`. The root install
tolerates this because it resolves against the committed lockfile, but
`.medusa/server` has no lockfile and npm does a strict resolve from scratch,
failing with `ERESOLVE unable to resolve dependency tree`.

The flag is safe here: that exact plugin + framework combination has been
running in production successfully all along, so the declared peer range is
simply stale, not a genuine incompatibility.

### 3.4 Never commit generated build output

`apps/backend/public/admin/` was committed at the initial scaffold commit
(`966fd3a`) and then sat frozen for months while silently overriding every
subsequent deploy. It is now in `apps/backend/.gitignore`.

Generated directories that must stay untracked: `.medusa/`, `dist/`, `build/`,
`public/admin/`, `.next/`.

### 3.5 Don't run `medusa build` or `next build` while a dev server is running

Both wipe the directory the running dev server is using and kill it. If a local
page suddenly 500s with `ECONNREFUSED`, this is usually why. Restart via the
`.claude/launch.json` configs (`backend` → 9000, `storefront` → 8000).

---

## 4. Incident: custom admin widgets and CMS invisible in production

**Fixed in `4681334`** (plus the Render start-command change).

### Symptom

The variant image-ordering widget and the Landing Pages CMS worked perfectly at
`localhost:9000/app`, but on `bacoola.onrender.com/app` they did not exist. No
error, no broken layout — the pages rendered normally, just without those
sections. "Clear cache and redeploy" changed nothing.

### How it was diagnosed

Each step ruled out a whole class of cause, which is why this is worth copying:

1. **Was Render on the right commit?** The deploy page showed `f903c5b` — the
   exact tip of `origin/main`. ✅ Not a stale-commit problem.
2. **Did the admin actually rebuild?** The build log showed
   `Removing existing ".medusa/server" folder` then
   `Frontend build completed successfully (15.04s)`. ✅ Not a stale-cache problem.
3. **Did the widget crash at runtime?** DevTools console with all log levels
   shown was clean; the Issues panel said "No issues detected". ✅ Not a runtime
   error.
4. **Was the code even in the browser?** DevTools → Sources → `Ctrl+Shift+F` →
   search `Image order` → **no matches**. Also no matches for
   `Bulk delete variants` or `Landing Pages`. ❌ **The code was never shipped.**

That last step turned a vague "it doesn't work" into a precise fact: the
browser never received the widget's code at all.

### Root cause

Two compounding problems:

1. `medusa start` was being run from `apps/backend`, so it served
   `apps/backend/public/admin` (violating invariant 3.1).
2. That directory contained a **git-committed snapshot** of a built admin
   bundle from commit `966fd3a` — the initial scaffold, predating both the
   landing-pages CMS and the image-order widget.

**The proof it was that folder, not a fresh build:** Render's runtime logs
showed requests for `/app/assets/alert-B4wOF0E8.js` and
`/app/assets/Inter-Regular-CKBOXRQ3-DYjygwQm.ttf`. Those exact hashed filenames
existed in the committed folder. Vite derives those hashes from file content —
three exact matches is not coincidence.

So every deploy dutifully built a correct, up-to-date admin into
`.medusa/server/public/admin`, then served a months-old snapshot from somewhere
else entirely.

### Fix

1. Point the Render start command at `.medusa/server` (invariant 3.1)
2. `git rm -r --cached apps/backend/public/admin` and add it to `.gitignore`

**Order matters.** Doing step 2 without step 1 takes production down — see
section 7.

---

## 5. Incident: storefront 500s on product, category, and collection pages

**Fixed in `27ae5dd`.**

### Symptom

`Application error: a server-side exception has occurred` with a digest, on:
- any product detail page, e.g. `/in/products/<handle>?v_id=variant_...`
- any category page
- search result navigation

Home and `/store` worked fine. Everything worked locally in `next dev`.

### How it was diagnosed

The browser only shows a digest, never the real error. The actual message is in
**Vercel → your project → Logs** (filter by the failing path). That revealed:

```
Error: An error occurred in the Server Components render...
{ digest: "DYNAMIC_SERVER_USAGE", page: "/in/products/women-for-younew-v2-essential-2" }
```

`DYNAMIC_SERVER_USAGE` is a specific, documented Next.js signal — not a generic
crash. It means: *this route tried to render statically but touched a
request-time API.*

### Root cause

An earlier fix for Vercel's 45-minute build timeout (`b84a84c`) gave these three
routes:

```js
export const revalidate = 3600
export async function generateStaticParams() { return [] }
```

That combination tells Next to attempt a static shell and cache it (ISR). But
all three routes read `searchParams`:

- `products/[handle]` reads `v_id`
- `categories/[...category]` and `collections/[handle]` read `sortBy`, `page`,
  `optionValueIds`

`searchParams` is inherently request-time data. Reading it during the static
render attempt raised the bailout signal, which crashed the request instead of
falling back to dynamic rendering.

**Why only in production:** `next dev` renders every request dynamically. The
static-shell pass that triggers this only happens in a production build. This is
the general reason "works locally, breaks on Vercel" happens.

### Fix

Replace `revalidate` with an explicit opt-out of static rendering:

```js
export const dynamic = "force-dynamic"
```

Applied to all three route files. `generateStaticParams` still returns `[]`, so
**build time is unaffected** — nothing was being prerendered either way, and the
original build-timeout fix is preserved.

This matches how `/store` and `/search` already worked (no `revalidate`, no
`generateStaticParams`) — which is exactly why those two never broke.

### Also fixed in the same area (`4a29ec1`)

- `products/[handle]/page.tsx` called `getImagesForVariant(pricedProduct, ...)`
  *before* its `if (!pricedProduct) notFound()` check, so a lookup miss threw a
  `TypeError` instead of returning a clean 404.
- `categories` and `collections` page components fetched with no `try/catch`
  (only `generateMetadata` had one), so a backend fetch failure crashed rather
  than showing a not-found page.

### Verification

```bash
for url in "/in" "/in/store" "/in/categories/women-clothing-v2" \
           "/in/products/women-for-younew-v2-essential-2?v_id=variant_01KXN8VZS1S98KD0AGYYB6Y3CF" \
           "/in/search"; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "https://bacoola-storefront.vercel.app$url")  $url"
done
```
All returned `200`.

---

## 6. Incident: Shiprocket stopped receiving orders

**Fixed in `dcc38f0`** (plus the Render build-command change).

### Symptom

Checkout completed and orders were created, but nothing appeared in the
Shiprocket dashboard. No visible error anywhere in the UI — the customer paid,
the order looked complete, and only Shiprocket was missing.

### How it was diagnosed

`src/subscribers/auto-fulfill-order.ts` deliberately records failures onto the
order instead of only logging them, precisely for this situation. A read-only
query against the orders table exposed it instantly:

```
#40  metadata: {"auto_fulfill_error":"Billing Phone must be 10 digits, got 12: +919373105785", ...}
#39  metadata: {"auto_fulfill_error":"Billing Phone must be 10 digits, got 12: +919373105785", ...}
#38  metadata: {"auto_fulfill_error":null,"auto_fulfill_failed_at":null}   ← succeeded
```

The `null` on #38 and every earlier order dated the regression precisely: it
began between order #38 and #39, which bracketed the deploy that moved the start
command.

### Root cause

A regression introduced by the section 4 fix. Moving `medusa start` into
`.medusa/server` changed which `node_modules` the server resolves from
(invariant 3.2). That directory's fresh `npm install` produced an **unpatched**
copy of the Shiprocket plugin.

Both patches were silently lost:
- **phone normalisation** — strips `+91`, so Indian numbers pass Shiprocket's
  strict 10-digit check. Without it, *every* order fails.
- **`SHIPROCKET_SKIP_AWB`** — stops after creating the (free) order instead of
  attempting AWB assignment, which requires a funded wallet.

The patch script had a hardcoded `root = path.join(__dirname, "..", "node_modules")`,
so it only ever touched the repo root — never the copy actually being used.

### Fix

`scripts/patch-shiprocket-skip-awb.cjs` now iterates over every location the
plugin can be installed:

```js
const roots = [
  path.join(repo, "node_modules"),
  path.join(repo, "apps", "backend", "node_modules"),
  path.join(repo, "apps", "backend", ".medusa", "server", "node_modules"),
];
```

Missing locations are skipped silently; already-patched files are left alone.

The build command must also **call the script explicitly after both installs** —
see invariant 3.2 for why `postinstall` alone is not enough.

### Verifying it worked

The build log must contain these two lines mentioning `.medusa/server`:

```
[patch-shiprocket] applied SHIPROCKET_SKIP_AWB early-return in .../.medusa/server/node_modules
[patch-shiprocket] applied phone country-code normalisation in .../.medusa/server/node_modules
```

If those lines are missing, the patch did not reach the copy that matters and
Shiprocket will keep failing.

Then place a test order and confirm `auto_fulfill_error` is `null` (query in
section 8.4).

### Note on `SHIPROCKET_SKIP_AWB`

This is currently `"true"` because the Shiprocket wallet is unfunded. Orders
appear under "New Orders" with no tracking number. **This is expected, not a
failure.** Order creation is free; AWB assignment needs a funded wallet.

---

## 7. Incident: backend outage from removing `public/admin` too early

**Caused by `241f11b`, reverted in `cb3b18b`, redone safely in `4681334`.**

Worth documenting because the fix looked obviously safe and was not.

### What happened

`apps/backend/public/admin` was deleted and untracked (a correct change) **while
the start command was still running from `apps/backend`**. With the stale folder
gone and the start command still looking at that path, there was nothing to
serve. The server refused to boot:

```
Error starting server: Could not find index.html in the admin build directory.
Make sure to run 'medusa build' before starting the server.
npm error command sh -c medusa start
==> Exited with status 1
```

The stale folder — the very thing causing the original bug — was simultaneously
the only thing letting the server start.

### Recovery

`git revert` + push restored service in one deploy. Then the start command was
moved to `.medusa/server` **first**, verified working, and only then was the
folder removed.

### Lesson

When a fix removes something, check what currently depends on it — including
things that depend on it only by accident. Sequence changes so production is
never in the gap between "old thing removed" and "new thing wired up."

---

## 8. Diagnostic playbook

### 8.1 Golden rule

**A successful build log does not mean production is running that build.**

Three of the four incidents above had perfectly clean, successful build logs.
Verify at the artifact level:
- *Which file did the browser actually download?* (DevTools → Sources search)
- *Which `node_modules` did the server actually resolve?* (paths in startup logs)
- *Which commit is deployed?* (host dashboard, compare to `git rev-parse HEAD`)

### 8.2 "My admin change isn't showing in production"

1. Confirm the deployed commit matches `origin/main` (Render → Deploys).
2. Hard refresh (`Ctrl+Shift+R`) to rule out browser caching.
3. Navigate to the *exact* screen the widget's `zone` targets. A widget with
   `zone: "product_variant.details.after"` only appears on a single variant's
   page (`/app/products/{id}/variants/{variant_id}`), not the product page.
4. DevTools → Console (set to **All levels**) — any errors?
5. **DevTools → Sources → `Ctrl+Shift+F` → search for literal text from your
   widget** (e.g. a heading string).
   - **No matches** → the code was never shipped. Check invariants 3.1 and 3.4.
   - **Matches** → the code shipped but isn't rendering. Check the widget's
     `zone` value and its early-return conditions (e.g. this repo's widget
     returns `null` when it can't read route params).

### 8.3 "A storefront page 500s in production but works locally"

1. Get the real error from **Vercel → Logs**, filtered to the failing path. The
   browser digest alone is useless.
2. Match the digest:
   - `DYNAMIC_SERVER_USAGE` → a request-time API (`searchParams`, `cookies()`,
     `headers()`) used on a route configured for static/ISR. Fix with
     `export const dynamic = "force-dynamic"` (section 5).
   - A missing-Suspense error → a client component calling `useSearchParams()`
     with no `<Suspense>` boundary above it.
3. Remember `next dev` renders everything dynamically. Production-only failures
   almost always come from the static/prerender pass that dev never runs.

### 8.4 "Orders aren't reaching Shiprocket"

Check the recorded reason first — the subscriber writes it onto the order:

```sql
SELECT display_id, created_at, metadata
FROM "order"
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

- `auto_fulfill_error` is `null` → fulfillment succeeded; the problem is
  elsewhere (check the Shiprocket dashboard itself).
- `"...must be 10 digits..."` → the phone patch isn't applied. See section 6.
- Any other message → that is the literal error from the fulfillment workflow.

Compare timestamps against recent deploys — a clean run followed by failures
immediately after a deploy points straight at that deploy.

To run a read-only query (`pg` is at the repo root, so `NODE_PATH` is needed if
your script lives elsewhere):

```bash
NODE_PATH="C:/Projects/bacoola-2/node_modules" node your-readonly-script.js
```

### 8.5 "The Render build fails with ERESOLVE"

Peer-dependency conflict during the `.medusa/server` install. Confirm
`--legacy-peer-deps` is still present in the build command (invariant 3.3).

### 8.6 Where to find the logs

| What | Where |
|---|---|
| Backend build output (`medusa build`, patch script) | Render → Deploys → click a deploy → widen the time range to before startup |
| Backend runtime (requests, errors) | Render → Logs |
| Storefront build | Vercel → Deployments → click a deployment |
| Storefront runtime errors (real messages behind digests) | **Vercel → Logs** ← the one people miss |
| What the browser actually loaded | DevTools → Sources / Network |

Note the Render distinction: the JSON `{"level":"http",...}` lines are *runtime*
request logs from after boot. The build output (`Compiling frontend source...`,
`[patch-shiprocket] applied ...`) appears **earlier**, so widen the time range
to see it.

---

## 9. Known-good deployment checklist

After any change to build/start configuration, verify all four:

- [ ] **Render deploy is Live** on the expected commit
- [ ] **Build log contains both `[patch-shiprocket] applied ... .medusa/server`
      lines** — otherwise Shiprocket is broken
- [ ] **Admin customisations render** — open a variant page, confirm "Image
      order"; confirm "Landing Pages" in the left nav
- [ ] **Storefront routes return 200** — run the curl loop from section 5

---

## 10. Still open / not done

- **Landing-pages CMS content no longer renders on category pages.** Commit
  `1121a27` ("pull requested UI and frontend changes from second branch")
  removed the `<LandingRenderer>` block from
  `apps/storefront/src/modules/categories/templates/index.tsx` during the
  listing redesign. The imports (`LandingRenderer`, `getLandingSections`,
  `EDITORIAL_CATEGORIES`) are still there but unused. Restoring it is a design
  decision: bring back the old full-page editorial layout, or integrate the CMS
  sections into the new listing layout. **Not a deployment bug** — the CMS admin
  works and the data is intact; the storefront simply stopped rendering it.
- **Orders #39 and #40** failed to reach Shiprocket during the section 6
  regression. They are still in the database with the reason recorded and need
  re-fulfilling from the admin once the patch is confirmed live.
- Render's build/start commands live only in the dashboard. If that service is
  ever recreated, this file is the only record of them — section 2.

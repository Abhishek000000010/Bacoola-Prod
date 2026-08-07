# Bacoola — Singapore migration handoff (2026-08-01)

**Purpose:** context handoff for a fresh session. We are moving the production
stack to Singapore (co-located with the Neon DB) using a brand-new repo and
brand-new Render services, running in parallel with the old prod so nothing
breaks. This file records what is done, how each problem was solved, and the
exact remaining steps.

Read `docs/DEPLOYMENT.md` (topology + invariants) and
`docs/PERFORMANCE-FIXES-2026-08-01.md` (why Singapore) alongside this.

---

## TL;DR — where we are right now

- ✅ **New repo** `Bacoola-Prod` created and everything pushed.
- ✅ **Backend** deployed to **Render Singapore** and is **LIVE** at
  `https://bacoola-prod.onrender.com` (verified `/health` and `/app` → 200).
- ✅ **Redis** = new **Upstash Singapore** database, wired into the backend.
- ✅ **Neon DB** left as-is (already Singapore; no migration — same DB as old prod).
- ✅ **Storefront** deployed as a second Render Singapore web service and is
  **LIVE** at `https://bacoola-storefront.onrender.com` (2026-08-02).
- 🔴 **BLOCKER — backend CORS was never updated.** Browser→backend calls from the
  storefront are blocked. See "Open — CORS" below. Do this first.
- ⏳ Then: webhooks, full checkout test, paid tier.

> **All-Singapore stack is complete** (storefront + backend + Redis + DB), and
> the region latency problem it was meant to solve *is* solved — the backend
> answers a light request in ~160 ms. What remains slow is compute, not
> distance: both services run on Render **Free = 0.1 CPU**. See
> `PERFORMANCE-FIXES-2026-08-02.md` for the measurements.

---

## Repos & remotes

| Remote | URL | Notes |
|---|---|---|
| `origin` | `github.com/Abhishek000000010/Bacoola.git` | OLD prod — **untouched** |
| `prod`   | `github.com/Abhishek000000010/Bacoola-Prod.git` | NEW — deploy from here |
| `friend` | `github.com/Jivesh-lab/Ecommerce_Platform.git` | unrelated |

Branch: `main`. Latest commits on `prod`:
- `0bf1ecb` build(render): throttled build script to dodge npm 429
- `6fd43b5` fix(backend): type import-mango images array (TS build fix)
- `58e61c0` chore: production snapshot for Bacoola-Prod

Secrets are **not** in the repo (`.env` gitignored; only `.env.template` committed).

---

## Backend — DONE (Render, Singapore, LIVE)

- **Service name:** `Bacoola-Prod`  |  **Service ID:** `srv-d9mrmfijnfac739qcnsg`
- **URL:** `https://bacoola-prod.onrender.com`
- **Region:** Singapore  |  **Instance:** Free  |  **Branch:** `main`
- **Build Command:** `bash scripts/render-build.sh`  ← changed from the inline command
- **Start Command:** `cd apps/backend/.medusa/server && npm run start` (unchanged)
- **Env vars set:** `DATABASE_URL` (Neon Singapore, same as old prod), `REDIS_URL`
  (new Upstash Singapore), `STORE_CORS`, `ADMIN_CORS`
  (`https://bacoola-prod.onrender.com`), `AUTH_CORS`, all `CLOUDINARY_*`,
  `RAZORPAY_*`, `SHIPROCKET_*`, `JWT_SECRET`, `COOKIE_SECRET`,
  `AUTH_MFA_ENCRYPTION_KEY`, `NODE_VERSION=20`, `NPM_CONFIG_PRODUCTION=false`,
  plus npm-resilience vars (`NPM_CONFIG_PREFER_OFFLINE=true`,
  `NPM_CONFIG_FETCH_RETRIES`, `NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_FUND=false`).

### Two build failures we hit and fixed

1. **TS build error** — `apps/backend/src/scripts/import-mango.ts` had
   `const images = []` (inferred `never[]`), so `images.push({url})` failed
   TS2345 and killed `medusa build`. This WIP script never existed in old prod,
   so it only broke in the fresh repo. **Fix:** `const images: { url: string }[] = []`
   (commit `6fd43b5`).

2. **npm 429 Too Many Requests** — the `.medusa/server` install has **no
   lockfile**, so npm fetched metadata for ~1,900 packages in one burst and
   Render's **Singapore build IPs** got rate-limited (the old Oregon service's
   IPs weren't, which is why it "just worked" before — same code, different
   build network). **Fix:** moved the build into `scripts/render-build.sh`,
   which runs the `.medusa/server` install *gently*:
   `npm install --legacy-peer-deps --maxsockets=3 --fetch-retries=10 --prefer-offline --no-audit --no-fund`.
   The script does the **same 4 steps** as the documented build command (so all
   DEPLOYMENT.md §3 invariants hold — start from `.medusa/server`,
   `--legacy-peer-deps`, patch script at the end) — it only adds the throttle.
   Result: build went from 429-failing → **Live**. Build is slow (~30–45 min on
   Free) but reliable. If it ever 429s again, drop `--maxsockets` to `1` in the
   script and push.

### Redis (Upstash Singapore) — DONE

- New DB host: `mint-dane-100458.upstash.io`
- `REDIS_URL = rediss://default:<TOKEN>@mint-dane-100458.upstash.io:6379`
  (**`rediss://`** with double-s — TLS; a `redis://` URL fails). Token is in the
  backend's Render env, not here.

---

## Storefront decision — Render Singapore, NOT Vercel

Vercel **Hobby (free)** locks serverless functions to **Washington DC** — no
Singapore option (only **Pro, $20/mo**, unlocks `sin1`). The storefront's
shopping pages are **`force-dynamic` (SSR on every request)**, so Vercel's
global CDN doesn't help them — the function's location is what matters. Vercel-US
→ Singapore backend (~7 calls/page) would add ~1.5s/page.

**Chosen:** deploy the Next.js storefront as a **second Render web service in
Singapore**, next to the backend. Same region → SSR↔backend is ~1–2 ms (Render
private network) — faster than even Vercel Pro, and **free**. Completes the
all-Singapore stack (storefront + backend + Redis + DB all in Singapore).

Trade-off: Render Free cold-starts (~50s idle). Fine to validate; move to
**Starter ($7/mo)** per service before real traffic.

---

## Storefront — DONE (Render, Singapore, LIVE)

- **URL:** `https://bacoola-storefront.onrender.com`
- **Region:** Singapore | **Instance:** Free | **Branch:** `main`

| Field | Value used |
|---|---|
| Root Directory | **blank** (the `-w` build and the root `postinstall` patch both need repo root) |
| Language | Node |
| Build Command | `npm install && npm run build -w @dtc/storefront` |
| Start Command | `cd apps/storefront && npx next start -p $PORT` |

**Port gotcha (critical):** the storefront's `start` script hardcodes
`next start -p 8000`, but Render assigns its own `$PORT`. The Start Command above
overrides it — without `-p $PORT` the service is unreachable and fails health
checks. Workspace name is `@dtc/storefront`; build script is `next build`.

The build took ~4 minutes and did **not** run out of memory on the 512 MB Free
instance — worth knowing, because `next build` on this storefront is close
enough to the ceiling to be a real risk. It also hit **no npm 429**: unlike the
backend's `.medusa/server` install, this one resolves from the root
`package-lock.json` instead of fetching metadata for ~1,900 packages.

### Storefront env vars — the full set actually used

| Key | Value |
|---|---|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_370c1ad4670bf6fd7beb743340f3d06d7e54d6754fa1092282f1330320f3038d` (same key works — same Neon DB) |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://bacoola-prod.onrender.com` |
| `NEXT_PUBLIC_DEFAULT_REGION` | `in` (store uses `/in/...`; the code default is `dk`) |
| `NEXT_PUBLIC_BASE_URL` | `https://bacoola-storefront.onrender.com` |
| `NEXT_PUBLIC_SHOP_NAME` | `Bacoola` |
| `NEXT_PUBLIC_RAZORPAY_KEY` | **currently the test key** — see warning below |
| `NODE_VERSION` | `20` |
| `NPM_CONFIG_PRODUCTION` | `false` (so devDeps install for `next build`) |

**Two traps this list exists to prevent:**

1. **`NEXT_PUBLIC_RAZORPAY_KEY` fails silently.** Leave it unset and
   `razorpay-payment-button.tsx` falls back to `rzp_test_T6Dp9BJO5sSWlW` with no
   error — checkout opens in **test mode and takes no real money**. It must also
   *match* the backend's `RAZORPAY_KEY_ID`, because the backend creates the order
   with its own pair; a test key against a live order id is rejected outright.
   ⚠️ **Both sides are on test keys today.** Swap both to live before real
   traffic — and the storefront needs a **full rebuild**, not a restart.
2. **Never set `NODE_ENV`.** Next sets it itself, and `NODE_ENV=production` makes
   npm skip devDependencies — `next`, `typescript`, `tailwindcss` and
   `autoprefixer` all live there, so the build dies on a missing binary. That is
   what `NPM_CONFIG_PRODUCTION=false` is guarding.

Every `NEXT_PUBLIC_*` is **inlined at build time**. Changing one requires
*Manual Deploy → Deploy latest commit*; a restart will not pick it up. And the
build hard-fails in the first second without
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, because `next.config.js` calls
`check-env-variables.js`, which `process.exit(1)`s.

Not needed, deliberately: `NEXT_PUBLIC_STRIPE_KEY` and
`NEXT_PUBLIC_MEDUSA_PAYMENTS_*` (Stripe wrapper is null without a key and only
renders for Stripe-like providers), `MEDUSA_CLOUD_S3_*` (images are Cloudinary),
`NEXT_PUBLIC_VERCEL_URL` (only read by `next-sitemap.js`, and there is no
`postbuild` script — dead config).

---

## 🔴 Open — CORS is still not configured (do this first)

Confirmed broken on the live site 2026-08-02. From a browser on
`https://bacoola-storefront.onrender.com`:

```js
fetch("https://bacoola-prod.onrender.com/store/regions", { headers: { "x-publishable-api-key": "pk_..." } })
// TypeError: Failed to fetch
```

The backend returns **no `access-control-allow-origin`** for that origin — its
`STORE_CORS`/`AUTH_CORS` still reference `*.vercel.app` from the old prod setup.

**Why the site still looks fine:** page rendering is server-side, and SSR is not
subject to CORS. Only calls the *browser* makes directly to the backend fail —
the category filter drawer's options fetch is confirmed broken. Assume anything
client-side that talks to the backend is also affected until tested.

**Fix** (backend Render env, then redeploy the backend):

- `STORE_CORS` → add `https://bacoola-storefront.onrender.com`
- `AUTH_CORS` → add `https://bacoola-storefront.onrender.com`

Re-verify with the `fetch` above, or:
`curl -i -X OPTIONS https://bacoola-prod.onrender.com/store/regions -H "Origin: https://bacoola-storefront.onrender.com" -H "Access-Control-Request-Method: GET"`
— an `access-control-allow-origin` header in the response means it is fixed.

---

## Remaining after CORS

1. **Point webhooks at the new backend** `https://bacoola-prod.onrender.com`:
   - Razorpay webhook URL
   - Shiprocket status webhook (if configured)
   - Note both sides are on **Razorpay test keys** today, and test-mode webhooks
     are configured separately from live ones in the Razorpay dashboard.
2. **Full smoke test:** browse → add to cart → checkout → place a test order →
   confirm it reaches Shiprocket. Verify `order.metadata.auto_fulfill_error` is
   `null` (see DEPLOYMENT.md §8.4). Also confirm the two
   `[patch-shiprocket] applied … .medusa/server` lines appeared in the backend
   build log.
3. **Before real traffic:** bump both services to **Starter ($7/mo)**. This is no
   longer a guess — measurement shows Free's **0.1 CPU** serialises requests
   (4 concurrent visitors take 4× as long as 1) and spins down after ~15 min idle.
   See `PERFORMANCE-FIXES-2026-08-02.md`. Render bills per second, so this can be
   tested for pennies and reverted. (Neon also auto-suspends on free — first hit
   after idle is slow. Neon paid ≈ $19/mo worst case, **not** ₹7,000 — it bills
   active compute, min 0.25 CU, auto-suspends.)

---

## Other context / decisions

- **Keep Neon.** Once backend is in Singapore, backend↔Neon is ~1–2 ms — the
  original perf problem is solved. No reason to change DB provider except cost;
  if ever needed, Render Postgres (same region, ~$6/mo) is the best target, done
  as a *separate* step (it requires a real data migration, unlike this move).
  ⚠️ Neon is **shared with another developer** — tell them before any switchover.
- **Carousel arrows** (perf work): **verified working** by the user — no revert.
- **Checkout state/city dropdowns:** still **unverified** — log in, go to
  checkout, pick a state, cities should load. ⚠️ This is a *client-side* fetch,
  so it may well be failing for the CORS reason above rather than any bug of its
  own. Test it again after CORS is fixed before investigating further.
- **Keep-alive pingers were considered and rejected.** An external pinger every
  10 min does stop the 15-minute spin-down, but it does not touch the 0.1 CPU
  limit, and keeping *two* free services awake 24/7 (~1,460 instance-hours)
  blows through Render's ~750 free instance-hours/month — the services get
  suspended mid-month. Neon's free tier meters compute-hours (~190/month) and
  would be exhausted in about a week. If one is set up anyway, ping
  `https://bacoola-prod.onrender.com/health` (200, 2 bytes) and
  `https://bacoola-storefront.onrender.com/images/bacoola-logo.png` (static, no
  SSR) — **not** the storefront root, which 307-redirects to `/in` and would
  render the full homepage on every ping. Verify the current limits on Render's
  and Neon's pricing pages; they change.
- Local dev still runs against local Postgres (`127.0.0.1:5432/bacoola`), not
  Neon — see `docs/PERFORMANCE-FIXES-2026-08-01.md` §2. Run `npm run dev` from
  repo root for normal dev.
- `docs/DEPLOYMENT.md` §2 still documents the OLD inline build command as the
  source of truth — should be updated to point at `scripts/render-build.sh`.

# Bacoola — Hostinger VPS deployment (log + runbook)

_Deployed 2026-08-12. Written for someone (including future-you) who has
forgotten every detail and needs to pick this up cold._

Companion to `docs/VPS-DEPLOYMENT-PLAN.md` (the original plan — now partly
superseded), `docs/DEPLOYMENT.md` (Render topology + the invariants that still
apply), and `docs/SINGAPORE-MIGRATION-2026-08-01.md`.

**Status: the stack is LIVE on the VPS at `http://200.234.34.214` and works.**
What remains is HTTPS, backups, and Redis — see §9.

---

## 1. TL;DR — where things stand

| Thing | State |
|---|---|
| Storefront | ✅ live, `http://200.234.34.214` (port 80) |
| Backend + admin | ✅ live, `http://200.234.34.214:9000`, admin at `/app` |
| Admin login | ✅ verified working (needed a cookie fix — §6.1) |
| PostgreSQL 18 | ✅ in a container, 755 products restored, `ANALYZE` run |
| Redis 7 | ✅ container running, capped at 512 MB — **but the app still ignores it** (§9.3) |
| Cart / add-to-bag | ⚠️ fix built and deployed, **final browser test never confirmed** (§6.2) |
| HTTPS | ❌ not yet — no domain pointed at the server yet (§9.1) |
| Backups | ❌ **none. The database exists on one machine only.** (§9.2) |
| Render deployment | still live and untouched; nothing has been cut over |

The old Render deployment is **still running**. Nothing about it was changed
except that pushing to `prod` triggers its usual auto-deploy. There is no
cutover yet, and no DNS points anywhere.

---

## 2. The server

| | |
|---|---|
| Provider | Hostinger, plan **KVM 1** |
| Hostname | `srv1898386.hstgr.cloud` |
| **IP** | **`200.234.34.214`** |
| Location | **Mumbai, India** — closest to the customers |
| OS | Ubuntu 24.04.4 LTS |
| CPU / RAM / disk | 1 vCPU / 3.8 GB / 48 GB (46 GB free at setup) |
| Swap | 2 GB, added by us (§4.1) |
| Docker | 29.7.2 — **came preinstalled** on the Hostinger image |
| Plan expiry | 2026-09-12 at time of setup — **check this is renewing** |

This VPS is **empty and ours alone**. The original plan was written for a shared
box already hosting other interns' projects, and most of its caution (avoid
ports 80/443, work around an existing web server) **no longer applies**. We
still use Docker — not for isolation from others, but because it makes the
stack reproducible and lets a second project land here later without a fight.

### Connecting

```bash
ssh -o ServerAliveInterval=30 root@200.234.34.214
```

Use the `-o ServerAliveInterval=30` form. Without it the connection drops when
idle (`client_loop: send disconnect: Connection reset`), which happened
repeatedly during setup.

Password login as root. Two things worth doing later: switch to SSH keys, and
rotate the root password — it was pasted into a chat transcript during setup and
should be treated as compromised.

**Which terminal:** commands containing `docker`, `cd /opt`, or `ufw` run in the
**SSH** session (`root@srv1898386:...#`). Commands containing `C:\` or `scp` run
in **Windows PowerShell** (`PS C:\Users\ABHISHEK>`). Telling them apart by tab
title does not work — read the prompt. Pasting Linux commands into PowerShell
produces a wall of `The token '&&' is not a valid statement separator` errors
and is harmless; nothing reached the server.

---

## 3. Architecture as deployed

```
                    Internet
                       │
        ┌──────────────┴──────────────┐
        │                             │
   port 80                       port 9000
        │                             │
┌───────▼────────┐          ┌─────────▼─────────┐
│ bacoola-       │          │ bacoola-backend   │
│ storefront     │──────────▶ Medusa v2 + admin │
│ Next.js 15     │          │ (:9000)           │
│ (:8000 inside) │          └────┬─────────┬────┘
└────────────────┘               │         │
                                 │         │
                    ┌────────────▼──┐  ┌───▼──────────┐
                    │ bacoola-      │  │ bacoola-     │
                    │ postgres (18) │  │ redis (7)    │
                    │ 127.0.0.1:5432│  │127.0.0.1:6379│
                    └───────────────┘  └──────────────┘
```

Four containers, one Docker network (`bacoola_default`). Postgres and Redis are
bound to `127.0.0.1` only — unreachable from the internet. Storefront and
backend are published publicly.

**Why backend is on a separate port rather than a path:** with no domain there
are no subdomains, and two separate origins (`:80` and `:9000`) reproduce the
CORS behaviour of the Render setup exactly. When a domain arrives this becomes
`shop.domain` + `api.domain` behind one reverse proxy — see §9.1.

**The database is on the same machine as the app.** That is the entire point of
the move: `~0.2 ms` per query instead of Neon's measured `71 ms` from India.
Medusa issues 6–65 sequential queries per store API call, so that difference is
the whole performance story. See `docs/PERFORMANCE-FIXES-2026-08-01.md`.

**Neon is out of the picture.** Data was copied from the *local* Postgres, not
Neon, because the Render site had no real users and the local copy was
equivalent. Nothing on the VPS talks to Neon.

---

## 4. What was done, in order

Every command below was actually run. They are recorded so the whole thing can
be rebuilt from scratch on a new machine.

### 4.1 Recon and hardening

Read-only survey first:

```bash
echo "=== OS ==="; cat /etc/os-release | head -2; echo "=== CPU ==="; nproc; echo "=== RAM ==="; free -h; echo "=== DISK ==="; df -h /; echo "=== DOCKER ==="; docker --version 2>/dev/null || echo "NOT installed"; echo "=== PORTS ==="; ss -tlnp | tail -n +2; echo "=== LOCATION ==="; curl -s ipinfo.io/city; curl -s ipinfo.io/country
```

Then 2 GB of swap — the box has 1 CPU and no swap, so a build spike would be
OOM-killed outright rather than merely slowed:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab && free -h
```

Firewall — port 22 is allowed **before** enabling, so you cannot lock yourself
out:

```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable && ufw status
ufw allow 9000/tcp   # added later for the backend
```

> ⚠️ Docker publishes ports by writing iptables rules directly, which **bypass
> ufw**. A container published on `0.0.0.0` is reachable whether ufw allows it
> or not. The real protection for Postgres and Redis is that they are bound to
> `127.0.0.1` in the compose file — not the firewall.

### 4.2 Data services

`/opt/bacoola/docker-compose.yml` — Postgres 18 and Redis 7, both loopback-only.
The DB password is generated on the server and lives in `/opt/bacoola/.env`
(mode 600), which compose reads automatically.

```bash
mkdir -p /opt/bacoola/db-backups && cd /opt/bacoola && echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" > .env && chmod 600 .env
```

> **Postgres 18 gotcha — this cost us a restart loop.** The v18 image stores
> data in a major-version subdirectory and expects the volume mounted at
> **`/var/lib/postgresql`**, not the traditional `/var/lib/postgresql/data`.
> With the old path the container crash-loops with *"in 18+, these Docker images
> are configured to store database data in a format which is compatible with
> pg_ctlcluster"*. The compose file uses `pgdata:/var/lib/postgresql`.

Redis is capped so it can never starve the box:

```
command: ["redis-server", "--appendonly", "yes", "--maxmemory", "512mb", "--maxmemory-policy", "volatile-lru"]
```

### 4.3 Database migration

Dumped from the **local** Postgres on the laptop (PowerShell):

```bash
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --format=custom --no-owner --no-acl -h 127.0.0.1 -U postgres -d bacoola -f "$env:USERPROFILE\bacoola.dump"
scp "$env:USERPROFILE\bacoola.dump" root@200.234.34.214:/opt/bacoola/db-backups/
```

Restored on the server (5.6 MB — small because images live on Cloudinary):

```bash
docker cp /opt/bacoola/db-backups/bacoola.dump bacoola-postgres:/tmp/d.dump && docker exec bacoola-postgres pg_restore --no-owner --no-acl -U bacoola -d bacoola /tmp/d.dump && docker exec bacoola-postgres psql -U bacoola -d bacoola -c "ANALYZE;" && docker exec bacoola-postgres psql -U bacoola -d bacoola -c "SELECT count(*) AS products FROM product;"
```

Result: **755 products**.

> **`ANALYZE` is not optional.** `pg_restore` does not carry planner statistics.
> Without it the entire storefront runs roughly 3× slower for no visible reason.
> See `scripts/analyze-db.sh`.

### 4.4 Code and environment

The repo is a **public** GitHub clone, so no deploy key was needed:

```bash
apt-get update -qq && apt-get install -y -qq git && git clone https://github.com/Abhishek000000010/Bacoola-Prod.git /opt/bacoola/app
```

Env files were copied up from the laptop rather than retyping ~28 secrets, then
rewritten in place to point at the containers:

- `/opt/bacoola/backend.env` ← `apps/backend/.env`
- `/opt/bacoola/storefront.env` ← `apps/storefront/.env.local`

Values changed from the local originals:

| Key | Value on the VPS |
|---|---|
| `DATABASE_URL` | `postgresql://bacoola:<pw>@postgres:5432/bacoola` (container hostname) |
| `REDIS_URL` | `redis://redis:6379` |
| `STORE_CORS` / `AUTH_CORS` | `http://200.234.34.214` |
| `ADMIN_CORS` | `http://200.234.34.214,http://200.234.34.214:9000,http://localhost:9000` |
| `STOREFRONT_URL` | `http://200.234.34.214` |
| `COOKIE_INSECURE` | `true` — **temporary, see §6** |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `http://200.234.34.214:9000` |
| `NEXT_PUBLIC_BASE_URL` | `http://200.234.34.214` |
| `NODE_ENV` | **deleted** from the storefront env — Next sets it itself |

> **Watch for missing trailing newlines.** `apps/backend/.env` had none, so an
> appended line glued itself onto `STOREFRONT_URL`. Append with
> `printf '\nKEY=value\n'`, and check with `tail -4` afterwards.

### 4.5 Images

Two Dockerfiles, written on the server (they are **not** in the repo — see
§10). The backend one mirrors `scripts/render-build.sh` step for step so all
three `DEPLOYMENT.md` §3 invariants survive: root install → `medusa build` →
throttled `.medusa/server` install with `--legacy-peer-deps` → patch script →
`WORKDIR .medusa/server`.

Builds run detached so a dropped SSH doesn't kill them:

```bash
nohup docker build -f Dockerfile.backend -t bacoola-backend . > /opt/bacoola/build-backend.log 2>&1 &
```

Roughly 6–8 minutes each on 1 vCPU.

**Verified after every backend build** — these two lines must appear, or
Shiprocket silently stops receiving orders (`DEPLOYMENT.md` §6):

```
[patch-shiprocket] applied SHIPROCKET_SKIP_AWB early-return in /app/apps/backend/.medusa/server/node_modules.
[patch-shiprocket] applied phone country-code normalisation in /app/apps/backend/.medusa/server/node_modules.
```

```bash
grep "patch-shiprocket" /opt/bacoola/build-backend.log
```

---

## 5. File layout on the server

```
/opt/bacoola/
├── .env                        POSTGRES_PASSWORD (mode 600)
├── docker-compose.yml          postgres + redis
├── docker-compose.override.yml backend + storefront
├── backend.env                 backend secrets & config
├── storefront.env              storefront config
├── db-backups/
│   └── bacoola.dump            the 5.6 MB restore source
├── build-*.log                 build output
└── app/                        git clone of Bacoola-Prod
    ├── Dockerfile.backend      ← created on the server, untracked
    ├── Dockerfile.storefront   ← created on the server, untracked
    ├── .dockerignore           ← created on the server, untracked
    └── apps/storefront/.env.local  ← copy of storefront.env (build-time)
```

`apps/storefront/.env.local` must exist **before** the storefront build —
every `NEXT_PUBLIC_*` is inlined at compile time, so it cannot be supplied at
runtime.

---

## 6. Two real bugs found and fixed

Both are the same underlying problem wearing different clothes: **a cookie
marked `secure` is silently discarded by the browser over plain `http://`.**
Neither shows up on Render because Render terminates TLS for you.

### 6.1 Admin login looped back to the login page

**Symptom:** correct password, page reloads, login screen again.

**Evidence** (backend logs) — this sequence is the fingerprint:

```
POST /auth/user/emailpass  → 200   (password accepted)
POST /auth/session         → 200   (session created, cookie sent)
GET  /admin/users/me       → 401   (cookie never came back)
```

**Cause:** `@medusajs/framework/dist/http/express-loader.js`:

```js
if (isProduction || isStaging) { return { sameSite: "lax", secure: true } }
...
cookie: { sameSite, secure, maxAge, ...cookieOptions }
```

`NODE_ENV=production` forces `secure: true`. Note also that the pre-existing
`projectConfig.http.cookieSecure` line in `medusa-config.ts` is **dead config** —
the framework never reads it, which is why adding `localhost` to `ADMIN_CORS`
changed nothing. `projectConfig.cookieOptions` spreads in *last*, so that is the
supported override.

**Fix:** commit `f95de05`, in `apps/backend/medusa-config.ts`:

```ts
...(process.env.COOKIE_INSECURE === "true"
  ? { cookieOptions: { secure: false, sameSite: "lax" as const } }
  : {}),
```

### 6.2 Cart said "Page not found" after adding an item

**Symptom:** add to bag works, header shows `BAG (1)`, opening `/in/cart` shows
*"The cart you tried to access does not exist."*

**Evidence:** the backend logs showed `POST /store/carts` 200 and
`POST /store/carts/{id}/line-items` 200 — and then, on loading `/in/cart`,
**no `/store/carts` request at all**. The storefront never asked, meaning
`getCartId()` returned nothing.

**Cause:** `apps/storefront/src/lib/data/cookies.ts` set three cookies with
`secure: process.env.NODE_ENV === "production"`, and `next start` always runs
with `NODE_ENV=production`. The `_medusa_cart_id` cookie was discarded on the
way back, so the id never survived the navigation.

Worth knowing for future debugging: `retrieveCart()` ends in `.catch(() => null)`,
so the failure is **silent** — the `console.error` in the cart page never fires,
and the storefront logs stay clean. Absence of a backend request is the signal.

**Fix:** commit `a2e095b` — one shared `cookieSecure` gate replacing the three
scattered checks.

> ⚠️ **`COOKIE_INSECURE=true` is set in BOTH env files on the server.** It is a
> plain-HTTP crutch. **Delete it from both the moment HTTPS is in front** — these
> cookies carry the session JWT.

---

## 7. Everyday operations

### Deploy new code (there is no auto-deploy)

Pushing to GitHub does **not** update the VPS — nothing is watching the repo.
After `git push prod main`:

```bash
cd /opt/bacoola/app && git pull && cp /opt/bacoola/storefront.env apps/storefront/.env.local && nohup sh -c 'docker build -f Dockerfile.backend -t bacoola-backend . && docker build -f Dockerfile.storefront -t bacoola-storefront .' > /opt/bacoola/build-all.log 2>&1 & echo "rebuild started"
```

Then, once both say `DONE`:

```bash
cd /opt/bacoola && docker compose up -d --force-recreate backend storefront
```

Storefront-only changes need only the storefront build — half the time.

> **Only ever run one `docker build` at a time.** Two on 1 vCPU crawl and
> interleave their logs. `pgrep -af 'docker build'` to check;
> `pkill -f 'docker build'` to clear.

### Health checks

```bash
docker compose ps
curl -s -o /dev/null -w "backend:%{http_code}\n" http://127.0.0.1:9000/health
curl -s -o /dev/null -w "storefront:%{http_code}\n" http://127.0.0.1/in
```

### Logs

```bash
docker logs --tail 60 bacoola-backend
docker logs --tail 60 bacoola-storefront
docker logs --tail 300 bacoola-backend 2>&1 | grep -iE "/store/carts|/store/products" | tail -15
```

### Restart everything

```bash
cd /opt/bacoola && docker compose restart
```

Containers are `restart: unless-stopped`, so they come back automatically after
a reboot.

---

## 8. Manual database backup (until §9.2 is automated)

```bash
docker exec bacoola-postgres pg_dump --format=custom --no-owner --no-acl -U bacoola -d bacoola > /opt/bacoola/db-backups/manual-$(date +%F).dump
```

Then copy it **off the machine** — from PowerShell:

```bash
scp root@200.234.34.214:/opt/bacoola/db-backups/manual-*.dump "$env:USERPROFILE\"
```

A backup that only exists on the VPS is not a backup.

---

## 9. What is left to do

### 9.1 Domain + HTTPS — the big one

DNS records to be added (already sent to the manager; the domain is brand new,
so nothing is at risk):

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `@` | `200.234.34.214` | 300 |
| A | `www` | `200.234.34.214` | 300 |
| A | `api` | `200.234.34.214` | 300 |

Then, in order:

1. Install **Caddy** as a reverse proxy — it obtains and renews Let's Encrypt
   certificates automatically. Root/`www` → storefront, `api` → backend.
2. Stop publishing the containers on `0.0.0.0`; bind them to `127.0.0.1` and let
   Caddy be the only public listener. Close port 9000 in ufw.
3. Update `backend.env`: CORS and `STOREFRONT_URL` → the `https://` domain.
4. Update `storefront.env`: `NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.<domain>`,
   `NEXT_PUBLIC_BASE_URL=https://<domain>` — then **rebuild** the storefront.
   These are compile-time; a restart will not pick them up.
5. **Remove `COOKIE_INSECURE` from both env files** and rebuild/recreate both.
6. Re-test admin login and add-to-cart. Both cookie bugs in §6 are exactly what
   HTTPS makes moot — and if they were masked rather than fixed, this is where
   it shows.

Checkout cannot be properly tested until this is done: Razorpay's widget is
unreliable on a plain-HTTP public origin. (Both sides are on **test keys**
today. Swapping to live keys requires a storefront **rebuild**, not a restart,
and the two keys must match.)

### 9.2 Off-machine backups — do this before real traffic

Self-hosting means backups are entirely ours; Neon used to do this invisibly.
A nightly `pg_dump` + copy to somewhere off the VPS. Right now **every product,
order and customer record exists on exactly one machine.**

### 9.3 Turn Redis back on

The container is running and correct, but the app ignores it:
`apps/backend/medusa-config.ts` has a hardcoded `const REDIS_DISABLED = true`.
It was switched off to stop Upstash's per-command quota draining — a **billing**
limit that does not exist on a self-hosted Redis. Flip the flag, rebuild the
backend, confirm the "fake redis" warnings disappear from the logs.

Until then the backend runs on in-memory cache/events/locks and a
non-persistent session store — logins drop on restart, and queued jobs are lost.

### 9.4 Smaller items

- ~~Move the Dockerfiles into the repo~~ — done 2026-08-14
- Close ports **8080** and **9000** in ufw; everything goes through Caddy now
- A one-command deploy script instead of the pasted chain in §7
- SSH keys instead of password login; rotate the root password
- Confirm the VPS plan is renewing
- Cut over from Render, then decommission it

---

## 10. Known gaps and honest caveats

- ~~The Dockerfiles live only on the server.~~ **Fixed 2026-08-14** — they are
  now committed at the repo root (`Dockerfile.backend`, `Dockerfile.storefront`,
  `.dockerignore`), with reference copies of the compose files, Caddyfile and
  backup script under `deploy/`. Nothing syncs those to the server
  automatically, so changing one on the VPS means updating it here too.
- **The §6.2 cart fix was built and deployed but never confirmed in a browser.**
  The session ended before the final incognito test. Verify this first (§11).
- **1 vCPU is the ceiling now.** Far better than Render Free's 0.1 CPU, but
  builds are slow and a traffic spike has nowhere to go. Watch `docker stats`.
- **No monitoring, no alerting.** If the site goes down at 3am nothing tells you.
- **`ufw` does not protect published Docker ports.** Loopback binding does.

---

## 11. First things to do when picking this up

1. `ssh -o ServerAliveInterval=30 root@200.234.34.214`
2. `cd /opt/bacoola && docker compose ps` — expect four containers up,
   `bacoola-postgres` healthy
3. Open `http://200.234.34.214` — the shop should load
4. **Add an item to the bag and open the bag** in a fresh incognito window.
   This is the one unverified fix (§6.2). If it still 404s, the evidence to
   gather is in §6.2 — check whether a `/store/carts` request reaches the
   backend at all.
5. Then pick up §9.1 (domain + HTTPS) as the next real piece of work.

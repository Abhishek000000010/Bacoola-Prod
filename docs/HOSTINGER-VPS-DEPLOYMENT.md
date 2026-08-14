# Bacoola — Hostinger VPS deployment (log + runbook)

_Deployed 2026-08-12, HTTPS and domain cutover 2026-08-14. Written for someone
(including future-you) who has forgotten every detail and needs to pick this up
cold._

Companion to `docs/VPS-DEPLOYMENT-PLAN.md` (the original plan — now largely
superseded), `docs/DEPLOYMENT.md` (Render topology + the invariants that still
apply), and `docs/SINGAPORE-MIGRATION-2026-08-01.md`.

**Status: LIVE at https://bacoola.com, fully verified.**

---

## 1. TL;DR — where things stand

| Thing | State |
|---|---|
| Storefront | ✅ `https://bacoola.com` (and `www`) |
| Backend + admin | ✅ `https://api.bacoola.com`, admin at `/app` |
| HTTPS | ✅ Caddy + Let's Encrypt, auto-renewing |
| Mobile | ✅ works (see §7 — this was a real problem) |
| Admin login | ✅ verified with secure cookies, behind the proxy |
| Add-to-cart → bag | ✅ verified |
| PostgreSQL 18 | ✅ container, 755 products, `ANALYZE` run |
| Redis 7 | ✅ container running, capped 512 MB — **app still ignores it** (§10.1) |
| Firewall | ✅ 22 / 80 / 443 only; Caddy is the sole public listener |
| DB backups | ⚠️ nightly on-server + weekly Hostinger snapshot **not yet run** (§10.2) |
| Old Render deployment | still live, untouched, now redundant |

`bacoola.com` previously served a **Wix** site. It no longer does — see §6.

---

## 2. The server

| | |
|---|---|
| Provider | Hostinger, plan **KVM 1** |
| Hostname | `srv1898386.hstgr.cloud` |
| **IP** | **`200.234.34.214`** |
| Location | **Mumbai, India** |
| OS | Ubuntu 24.04.4 LTS |
| CPU / RAM / disk | 1 vCPU / 3.8 GB / 48 GB |
| Swap | 2 GB, added by us |
| Docker | 29.7.2 — came preinstalled |
| Plan expiry | 2026-09-12 at setup — **confirm this renews** |

This VPS is **empty and ours alone**. The original plan was written for a shared
box hosting other interns' projects; that constraint is void. Docker is still
used — not for isolation from others, but for reproducibility and so a second
project can land here later without a fight.

### Connecting

```bash
ssh -o ServerAliveInterval=30 root@200.234.34.214
```

Use that exact form. Plain `ssh` drops when idle
(`client_loop: send disconnect: Connection reset`) — it happened constantly
during setup.

Outstanding security work: switch to SSH keys, and **rotate the root password**
— it was pasted into a chat transcript during setup.

**Which terminal:** `docker`, `cd /opt`, `ufw`, `dig` → the **SSH** session
(`root@srv1898386:...#`). `C:\` or `scp` → **Windows PowerShell**
(`PS C:\Users\ABHISHEK>`). Tab titles lie; read the prompt. Pasting Linux
commands into PowerShell produces a wall of
`The token '&&' is not a valid statement separator` and is harmless — nothing
reached the server.

---

## 3. Architecture as deployed

```
                     Internet
                        │
                   443 / 80
                        │
              ┌─────────▼─────────┐
              │  Caddy (on host)  │  TLS termination
              │  auto Let's       │  bacoola.com, www → :8000
              │  Encrypt certs    │  api.bacoola.com  → :9000
              └────┬─────────┬────┘
                   │         │
      127.0.0.1:8000         127.0.0.1:9000
                   │         │
        ┌──────────▼──┐  ┌───▼──────────────┐
        │ bacoola-    │  │ bacoola-backend  │
        │ storefront  │─▶│ Medusa v2 + admin│
        │ Next.js 15  │  └───┬──────────┬───┘
        └─────────────┘      │          │
                   ┌─────────▼──┐  ┌────▼─────────┐
                   │ postgres 18│  │ redis 7      │
                   │ :5432 local│  │ :6379 local  │
                   └────────────┘  └──────────────┘
```

Four containers on one Docker network, **all bound to `127.0.0.1`**. Caddy runs
on the host and is the only thing listening publicly.

> ⚠️ **`ufw` does not protect published Docker ports.** Docker writes iptables
> rules directly and bypasses ufw. What actually keeps Postgres, Redis and the
> apps off the internet is the `127.0.0.1:` prefix in the compose files.

**The database is on the same machine as the app.** That is the whole point:
`~0.2 ms` per query instead of Neon's measured `71 ms` from India, against
6–65 sequential queries per store API call. See
`docs/PERFORMANCE-FIXES-2026-08-01.md`.

**Neon is out of the picture.** Data came from the *local* Postgres dump — the
Render site had no real users, so the local copy was equivalent. Nothing here
talks to Neon.

---

## 4. What was done, in order

### 4.1 Recon and hardening

```bash
# read-only survey
echo "=== OS ==="; cat /etc/os-release | head -2; echo "=== CPU ==="; nproc; echo "=== RAM ==="; free -h; echo "=== DISK ==="; df -h /; echo "=== DOCKER ==="; docker --version; echo "=== PORTS ==="; ss -tlnp | tail -n +2

# 2 GB swap — 1 vCPU with no swap means a build spike is OOM-killed outright
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab

# firewall — 22 allowed BEFORE enabling, so you cannot lock yourself out
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

### 4.2 Data services

Compose files: `deploy/docker-compose.yml` in this repo, live at
`/opt/bacoola/docker-compose.yml`. DB password generated on the server into
`/opt/bacoola/.env` (mode 600).

> **Postgres 18 gotcha — cost us a crash loop.** The v18 image stores data in a
> major-version subdirectory and wants the volume at **`/var/lib/postgresql`**,
> not `/var/lib/postgresql/data`. With the old path it crash-loops complaining
> about `pg_ctlcluster` layout.

### 4.3 Database migration

```bash
# on the laptop (PowerShell)
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --format=custom --no-owner --no-acl -h 127.0.0.1 -U postgres -d bacoola -f "$env:USERPROFILE\bacoola.dump"
scp "$env:USERPROFILE\bacoola.dump" root@200.234.34.214:/opt/bacoola/db-backups/

# on the server
docker cp /opt/bacoola/db-backups/bacoola.dump bacoola-postgres:/tmp/d.dump
docker exec bacoola-postgres pg_restore --no-owner --no-acl -U bacoola -d bacoola /tmp/d.dump
docker exec bacoola-postgres psql -U bacoola -d bacoola -c "ANALYZE;"
```

**755 products.** The dump is 5.6 MB — images live on Cloudinary.

> **`ANALYZE` is not optional.** `pg_restore` carries no planner statistics;
> without it the storefront runs ~3× slower for no visible reason.

### 4.4 Code and environment

Public GitHub clone, no deploy key needed:

```bash
git clone https://github.com/Abhishek000000010/Bacoola-Prod.git /opt/bacoola/app
```

Env files were copied up from the laptop rather than retyping ~28 secrets:

- `/opt/bacoola/backend.env` ← `apps/backend/.env`
- `/opt/bacoola/storefront.env` ← `apps/storefront/.env.local`

**Current production values** (differ from the local originals):

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://bacoola:<pw>@postgres:5432/bacoola` |
| `REDIS_URL` | `redis://redis:6379` |
| `STORE_CORS` | `https://bacoola.com,https://www.bacoola.com` |
| `AUTH_CORS` | `https://bacoola.com,https://www.bacoola.com,https://api.bacoola.com` |
| `ADMIN_CORS` | `https://api.bacoola.com` |
| `STOREFRONT_URL` | `https://bacoola.com` |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://api.bacoola.com` |
| `NEXT_PUBLIC_BASE_URL` | `https://bacoola.com` |
| `NODE_ENV` | **deleted** from the storefront env — Next sets it itself |
| `COOKIE_INSECURE` | **removed** — was a plain-HTTP crutch, see §8 |

> **Watch for missing trailing newlines.** `apps/backend/.env` had none, so an
> appended line glued itself onto `STOREFRONT_URL`. Append with
> `printf '\nKEY=value\n'` and verify with `tail -4`.

### 4.5 Images

`Dockerfile.backend` and `Dockerfile.storefront` at the repo root. The backend
one mirrors `scripts/render-build.sh` step for step so all three
`DEPLOYMENT.md` §3 invariants survive.

Build detached so a dropped SSH doesn't kill it:

```bash
nohup docker build -f Dockerfile.backend -t bacoola-backend . > /opt/bacoola/build.log 2>&1 &
```

~6–8 minutes each on 1 vCPU. **Only ever run one build at a time** — two on one
CPU crawl and interleave their logs.

**Verify after every backend build**, or Shiprocket silently stops receiving
orders (`DEPLOYMENT.md` §6):

```bash
grep "patch-shiprocket" /opt/bacoola/build.log
```

Both lines must mention `.medusa/server/node_modules`.

---

## 5. File layout on the server

```
/opt/bacoola/
├── .env                        POSTGRES_PASSWORD (mode 600)
├── docker-compose.yml          postgres + redis
├── docker-compose.override.yml backend + storefront
├── backend.env                 backend secrets & config
├── storefront.env              storefront config
├── backup-db.sh                nightly dump (cron 3 AM)
├── db-backups/                 dumps, 14-day retention
├── build-*.log
└── app/                        git clone of Bacoola-Prod
    └── apps/storefront/.env.local   copy of storefront.env (build-time)

/etc/caddy/Caddyfile            reverse proxy + TLS
```

`apps/storefront/.env.local` must exist **before** the storefront build — every
`NEXT_PUBLIC_*` is inlined at compile time and cannot be supplied at runtime.

Reference copies of everything outside the clone live in `deploy/` in this repo.
**Nothing syncs them automatically** — change one on the server, change it here.

---

## 6. The domain — what actually happened

Worth recording, because it burned an afternoon.

`bacoola.com` is **registered at Squarespace**, but its nameservers pointed at
**Wix** (`ns12.wixdns.net`, `ns13.wixdns.net`) from an older Wix site. So Wix
answered every DNS lookup, and the A records the manager carefully added in the
**Squarespace** panel were saved and completely ignored — `api.bacoola.com`
returned `NO RECORD` no matter what that panel said.

Squarespace's own banner said so outright: *"You're using custom nameservers…
To activate the DNS records below, switch to Squarespace nameservers."*

**Resolution:** switched the nameservers to `nse1-4.squarespacedns.com`, which
made the Squarespace records live. Root and `www` now serve the shop; the Wix
site is gone.

**Before switching, every record was checked** — the Squarespace panel had all
the Zoho email records (`MX 10/20/50`, SPF, DKIM, DMARC, verification TXT). It
was actually *more* complete than what Wix was serving, which was missing the
primary `MX 10 mx.zoho.in`. Email improved rather than broke.

> ⚠️ **Never delete a domain from a DNS provider whose nameservers are still
> live.** Doing so takes the domain dark — website *and* email — with no
> warning. Correct order: verify the new provider's records → switch
> nameservers → wait and verify → only then remove the old one.

Propagation took ~20 minutes. Local caches lag longer: the VPS, the laptop and
its ISP all kept serving Wix's address for hours after the switch, while phones
on mobile data saw the new site immediately. **A stale local cache is not a
deployment problem** — test from a second network before investigating.

---

## 7. HTTPS, and why mobile was broken

**Symptom:** `http://200.234.34.214` worked on the laptop, `ERR_TIMED_OUT` on
mobile data. But `http://200.234.34.214:9000` worked fine on the same phone.

**Cause:** the mobile carrier transparently proxies port 80 and drops requests
to a bare IP with no hostname. Only port 80, only on mobile. Nothing was wrong
with the site.

**Cure:** HTTPS on 443 — encrypted, so carriers can't intercept it, and served
under a real hostname. The domain work and the mobile fix were the same task.

Setup (see `deploy/Caddyfile`):

```bash
apt-get install -y caddy       # via the official cloudsmith repo
# /etc/caddy/Caddyfile → reverse_proxy to 127.0.0.1:8000 and :9000
systemctl reload caddy
```

Certificates for all three names were obtained in ~10 seconds and renew
automatically, forever. Nothing expires, nothing to remember.

> **Container DNS trap.** After moving the backend to `127.0.0.1`, every
> storefront page returned 500: `getaddrinfo ENOTFOUND api.bacoola.com`. The
> containers could not resolve the public hostnames the storefront was built to
> call. Fixed with `extra_hosts: api.bacoola.com:host-gateway` (and the same for
> the other two names), which maps them to the host so traffic reaches Caddy
> locally instead of going out and back.

---

## 8. Two real bugs — both invisible over HTTPS

Both were the same thing wearing different clothes: **a `secure` cookie is
silently discarded by the browser over plain `http://`.** Neither appears on
Render, which terminates TLS for you. Both are fixed and verified.

### 8.1 Admin login looped back to the login page

Fingerprint, from the backend logs:

```
POST /auth/user/emailpass  → 200   (password accepted)
POST /auth/session         → 200   (session created, cookie sent)
GET  /admin/users/me       → 401   (cookie never came back)
```

`@medusajs/framework/dist/http/express-loader.js` forces
`{ sameSite: "lax", secure: true }` whenever `NODE_ENV` is production. Note the
pre-existing `projectConfig.http.cookieSecure` line in `medusa-config.ts` is
**dead config** — the framework never reads it, which is why adding `localhost`
to `ADMIN_CORS` changed nothing. `projectConfig.cookieOptions` spreads in
*last*, so that is the supported override (commit `f95de05`).

### 8.2 Cart said "Page not found" after adding an item

Add-to-bag worked (`BAG (1)`), but `/in/cart` showed *"The cart you tried to
access does not exist."* The telling detail: loading that page produced **no
`/store/carts` request at all** — the storefront never asked, because
`getCartId()` came back empty.

`apps/storefront/src/lib/data/cookies.ts` set three cookies with
`secure: NODE_ENV === "production"`, and `next start` always runs production. So
`_medusa_cart_id` was discarded and never survived the redirect (commit
`a2e095b`).

For future debugging: `retrieveCart()` ends in `.catch(() => null)`, so the
failure is **silent** — the storefront logs stay clean. Absence of a backend
request is the signal.

Both were gated behind `COOKIE_INSECURE`, which **has since been removed** now
that HTTPS is in front. Secure cookies are on, verified working behind Caddy.

---

## 9. Everyday operations

### Deploy new code (there is no auto-deploy)

Pushing to GitHub does **not** update the VPS — nothing watches the repo.
After `git push prod main`:

```bash
cd /opt/bacoola/app && git pull && cp /opt/bacoola/storefront.env apps/storefront/.env.local && nohup sh -c 'docker build -f Dockerfile.backend -t bacoola-backend . && docker build -f Dockerfile.storefront -t bacoola-storefront .' > /opt/bacoola/build-all.log 2>&1 & echo "rebuild started"
```

Then once both say `DONE`:

```bash
cd /opt/bacoola && docker compose up -d --force-recreate backend storefront
```

Storefront-only changes need only that build — half the time. Remember every
`NEXT_PUBLIC_*` change requires a **rebuild**, not a restart.

### Health checks

```bash
docker compose ps
curl -sk --resolve bacoola.com:443:127.0.0.1 -o /dev/null -w "shop:%{http_code}\n" https://bacoola.com/in
curl -sk --resolve api.bacoola.com:443:127.0.0.1 -o /dev/null -w "api:%{http_code}\n" https://api.bacoola.com/health
```

The `--resolve` flag bypasses DNS and talks to the machine directly — necessary
because the VPS's own resolver cache has repeatedly served stale answers.

### Logs

```bash
docker logs --tail 60 bacoola-backend
docker logs --tail 60 bacoola-storefront
journalctl -u caddy --no-pager -n 40
```

### Restart

```bash
cd /opt/bacoola && docker compose restart
systemctl reload caddy
```

Containers are `restart: unless-stopped` and Caddy is a systemd service, so
everything returns after a reboot.

---

## 10. What is left

### 10.1 Turn Redis back on

The container runs and is correctly capped, but the app ignores it:
`apps/backend/medusa-config.ts` has a hardcoded `const REDIS_DISABLED = true`.
It was switched off to stop Upstash's **per-command billing quota** draining —
a limit that does not exist on self-hosted Redis. Flip the flag, rebuild the
backend, confirm the "fake redis" warnings disappear.

Until then the backend uses in-memory cache/events/locks and a non-persistent
session store: logins drop on restart and queued jobs are lost.

### 10.2 Backups — partially done

- ✅ Nightly `pg_dump` at 3 AM, 14-day retention (`/opt/bacoola/backup-db.sh`)
- ✅ One manual off-machine copy taken 2026-08-14
- ⚠️ Hostinger's **free weekly** VPS backup is enabled but **had not run yet**
  as of 2026-08-14 — verify a snapshot actually appears
- ❌ No automated off-machine copy of the nightly dump

Weekly means up to **7 days** of orders lost in a disaster. Fine pre-launch;
upgrade to daily (₹299/mo) or automate off-site copies before real traffic.

### 10.3 Smaller items

- A one-command deploy script instead of the pasted chain in §9
- SSH keys instead of password login; **rotate the root password**
- Confirm the VPS plan renews (was showing 2026-09-12)
- Decommission the old Render deployment — it is still live and now redundant
- Razorpay is on **test keys** on both sides. Going live needs both swapped to
  matching live keys, and the storefront **rebuilt**, not restarted.
- KVM 1 is 1 vCPU. KVM 2 doubles it if the site ever struggles — don't spend
  speculatively.

---

## 11. Honest caveats

- **1 vCPU is the ceiling.** Far better than Render Free's 0.1 CPU, but builds
  are slow and there's no headroom for a spike. Watch `docker stats`.
- **No monitoring, no alerting.** If the site dies at 3am, nothing tells you.
- **`ufw` does not protect published Docker ports** — loopback binding does.
- **`deploy/` copies drift.** Nothing syncs them to the server.
- **Local DNS caches lie.** The VPS, the laptop and its ISP all served stale
  answers for hours after the cutover. Test from a second network (a phone on
  mobile data) before concluding anything is broken.

---

## 12. First things to do when picking this up

1. `ssh -o ServerAliveInterval=30 root@200.234.34.214`
2. `cd /opt/bacoola && docker compose ps` — four containers up, postgres healthy
3. Open `https://bacoola.com` — shop loads with a padlock
4. Check `https://api.bacoola.com/app` — admin login works
5. Confirm a Hostinger snapshot has appeared (§10.2) — it hadn't as of 2026-08-14
6. Then §10.1 (Redis) is the next real piece of work

# Bacoola — VPS deployment plan (Hostinger, Docker-isolated)

**Status:** planning / not started. This records the decision and the approach.
It is deliberately light on step-by-step commands — those come at deploy time.

Companion to `docs/SINGAPORE-MIGRATION-2026-08-01.md` (the current Render setup)
and `docs/DEPLOYMENT.md`.

---

## Why we're moving to a VPS

- **Current state:** Bacoola is live on **Render (Singapore)** but slow. The
  region/latency problem is already solved (app + DB co-located in Singapore) —
  what's slow now is **compute**: both Render services run on the **Free tier =
  0.1 CPU**, which serialises requests and cold-starts after idle. See
  `SINGAPORE-MIGRATION-2026-08-01.md`.
- **Manager's directive:** consolidate **all** company projects onto **one
  Hostinger VPS** (KVM plan). So Bacoola moves there too — this is not optional.
- **Performance upside:** on the VPS we can run the **app and its database on the
  same machine**, giving near-zero database latency (the reason localhost feels
  instant), a **real CPU** (not 0.1), and **no cold starts**. Choose a VPS
  location nearest the customers (Mumbai/India, or Singapore) for the lowest
  first-hop latency.

The Render deployment **stays live** until the VPS version is proven, then we cut
the domain over — no downtime.

---

## The hard requirement: isolation & security

The VPS **already hosts other crucial projects** built by earlier interns. The
number-one rule of this whole exercise:

> **Bacoola's deployment must not interfere with the other projects — not their
> files, their ports, their database, or their uptime.** A careless change on a
> shared server could take down important work.

Everything below is chosen to make that interference *impossible by design*.

---

## How we get isolation: Docker (and NOT Easy Panel)

- **We use Docker.** Each piece of Bacoola runs in its own sealed **container**
  (storefront, backend, PostgreSQL, Redis). A container can't see or touch other
  projects, or even other containers, except through the specific ports we
  choose to open. This is the isolation, without any extra tooling.
- **No Easy Panel** (the GUI shown in the tutorial the user watched). Easy Panel
  is just a graphical menu *on top of* Docker — Docker alone already provides the
  isolation. More importantly, installing Easy Panel onto a VPS that already runs
  other projects a *different* way could fight them for ports **80/443** and
  actually endanger the very projects we're protecting. So we avoid it.
- **Bacoola's own everything:** its own directory, its own **unused** ports, its
  own database, its own containers. Fully sealed off from the rest.

---

## Database plan (important — this is the part that's been confusing)

- **We do NOT put Neon on the VPS, and we don't keep using Neon from the VPS.**
  Neon is a remote cloud DB with no India region, so calling it from a Mumbai VPS
  would re-introduce the exact latency problem we're escaping.
- Instead we run a **fresh PostgreSQL in a container on the VPS itself**, and
  **copy the data from Neon into it once** (`pg_dump` from Neon → `pg_restore`
  into the VPS DB — the same operation already done Neon→laptop for local dev).
- The app then connects to the database **on the same machine** (`127.0.0.1`
  inside the VPS) → fast. Neon can be kept as a backup or retired afterward.

---

## Safe rollout — three phases

1. **LOOK (read-only).** Inspect the VPS without changing anything: OS,
   CPU/RAM/disk, whether Docker is already installed, what web server routes the
   existing sites and on which domains/ports, which ports are already in use, and
   whether PostgreSQL/Redis already exist. This phase cannot affect other
   projects.
2. **PLAN.** Design Bacoola to fit *around* what's already there — unused ports,
   its own folder/DB/containers, and a **new** reverse-proxy entry for Bacoola's
   domain that leaves the existing ones untouched.
3. **DEPLOY.** Do it together, one command at a time, each explained before it's
   run. The user is treated as a **complete beginner** throughout.

We only move to the next phase once the previous one is understood and safe.

---

## Open questions (answered by the LOOK phase)

- OS and resources (CPU / RAM / disk headroom)?
- Is **Docker** already installed and used by the other projects?
- What **web server** fronts the existing sites (Nginx / Apache / Caddy), and on
  which domains and ports?
- Which **ports are already in use** (so Bacoola avoids them)?
- Is **PostgreSQL / Redis** already installed, or does Bacoola run its own in
  containers (preferred, for isolation)?
- How are the other projects run (PM2 / systemd / Docker)?

---

## Caveats to keep in mind

- **Shared hardware:** even with Docker isolation, all projects share the same
  CPU/RAM. A traffic spike or heavy task on any one can slow the others — watch
  resource usage.
- **Security is now our responsibility:** firewall rules, keeping the host and
  Docker updated, unique passwords per project, and never exposing internal
  container ports (DB, Redis) to the public internet.
- **The user is new to VPS/Linux** — every step is explained plainly, nothing
  assumed.

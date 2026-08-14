# deploy/

Reference copies of the files that run Bacoola on the Hostinger VPS.

**These are not read by anything at runtime.** The live copies are on the
server, at the paths listed below. Nothing keeps them in sync — if you change
one on the server, update it here too, or the next person rebuilding from
scratch gets the old version.

| File here | Live location on the VPS |
|---|---|
| `docker-compose.yml` | `/opt/bacoola/docker-compose.yml` |
| `docker-compose.override.yml` | `/opt/bacoola/docker-compose.override.yml` |
| `Caddyfile` | `/etc/caddy/Caddyfile` |
| `backup-db.sh` | `/opt/bacoola/backup-db.sh` (cron, 3 AM daily) |
| `../Dockerfile.backend` | `/opt/bacoola/app/Dockerfile.backend` |
| `../Dockerfile.storefront` | `/opt/bacoola/app/Dockerfile.storefront` |

The Dockerfiles live at the repo root rather than in here, because the build
context is the repo root and `COPY . .` needs them alongside it.

## Not in here, and never should be

- `/opt/bacoola/.env` — generated Postgres password
- `/opt/bacoola/backend.env` — all backend secrets
- `/opt/bacoola/storefront.env` — storefront config

Those exist only on the server. `backend.env` and `storefront.env` started as
copies of the local `apps/backend/.env` and `apps/storefront/.env.local`, with
the URLs and CORS values rewritten for production — the full list of what
differs is in `docs/HOSTINGER-VPS-DEPLOYMENT.md` §4.4.

## Full documentation

`docs/HOSTINGER-VPS-DEPLOYMENT.md` — server details, everything that was done
and why, the two cookie bugs, day-to-day commands, and what is still outstanding.

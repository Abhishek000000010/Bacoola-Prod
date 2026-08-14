#!/usr/bin/env bash
#
# Nightly database backup for the Bacoola VPS.
#
# Reference copy — the live script is /opt/bacoola/backup-db.sh, run by cron:
#   0 3 * * * /opt/bacoola/backup-db.sh >> /opt/bacoola/backup.log 2>&1
#
# ⚠️ THIS IS NOT YET A REAL BACKUP. Everything it writes lives on the same
# machine as the database, so a lost VPS loses both. Copies must be shipped
# somewhere off-machine — see docs/HOSTINGER-VPS-DEPLOYMENT.md §9.2.
#
# Restore with:
#   gunzip -c auto-YYYY-MM-DD-HHMM.dump.gz > /tmp/d.dump
#   docker cp /tmp/d.dump bacoola-postgres:/tmp/d.dump
#   docker exec bacoola-postgres pg_restore --clean --no-owner --no-acl \
#     -U bacoola -d bacoola /tmp/d.dump
#   docker exec bacoola-postgres psql -U bacoola -d bacoola -c "ANALYZE;"
#
# That final ANALYZE is not optional: pg_restore does not carry planner
# statistics, and without it the whole storefront runs roughly 3x slower.

set -euo pipefail

DIR=/opt/bacoola/db-backups
mkdir -p "$DIR"

docker exec bacoola-postgres pg_dump --format=custom --no-owner --no-acl \
  -U bacoola -d bacoola | gzip > "$DIR/auto-$(date +%F-%H%M).dump.gz"

find "$DIR" -name 'auto-*.dump.gz' -mtime +14 -delete

echo "$(date '+%F %T') backup ok"

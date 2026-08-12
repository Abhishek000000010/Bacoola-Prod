#!/usr/bin/env bash
#
# Refresh PostgreSQL planner statistics.
#
# RUN THIS AFTER EVERY pg_restore. `pg_restore` copies rows but not statistics,
# and until the planner has them it sizes every join off built-in defaults. On
# this catalogue that turned the storefront's product queries into ~3x their
# proper cost (a 32-product listing fetch: 3.6s -> 0.93s, and 165 handles:
# 3.7s -> 1.1s) because it picked the wrong join order for the
# product -> variant -> price_set -> price chain that pricing walks.
#
# Autovacuum eventually gets there on its own, but only after enough writes to
# trip its threshold -- on a restored copy that is barely read-write, "eventually"
# was 11 days and counting, all of it slow.
#
# Usage:  ./scripts/analyze-db.sh [DATABASE_URL]
# Falls back to DATABASE_URL from apps/backend/.env when no argument is given.

set -euo pipefail

DB_URL="${1:-}"

if [ -z "$DB_URL" ]; then
  ENV_FILE="$(dirname "$0")/../apps/backend/.env"
  if [ ! -f "$ENV_FILE" ]; then
    echo "No DATABASE_URL argument and no $ENV_FILE to read one from." >&2
    exit 1
  fi
  DB_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
fi

if [ -z "$DB_URL" ]; then
  echo "Could not determine a DATABASE_URL." >&2
  exit 1
fi

# psql is not on PATH in a default Windows Postgres install.
PSQL="psql"
if ! command -v psql >/dev/null 2>&1; then
  for candidate in "/c/Program Files/PostgreSQL"/*/bin/psql.exe; do
    [ -x "$candidate" ] && PSQL="$candidate" && break
  done
fi

echo "Running ANALYZE (takes ~20s on the current catalogue)..."
"$PSQL" "$DB_URL" -c "ANALYZE;"
echo "Done. Planner statistics refreshed."

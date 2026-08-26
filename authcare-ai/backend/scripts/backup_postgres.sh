#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"
mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump "$DATABASE_URL" --format=custom --file="backups/claimbot-$stamp.dump"
echo "Created backups/claimbot-$stamp.dump"

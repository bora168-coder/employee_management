#!/usr/bin/env bash
# Daily backup of the database (and the local file storage, if used).
# Cron example (02:00 every day):
#   0 2 * * * cd /srv/employee_management && ./scripts/backup.sh >> /var/log/csbms-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/csbms}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"

# Read DATABASE_URL (and storage settings) from the API .env file.
set -a
# shellcheck disable=SC1091
. "$(dirname "$0")/../apps/api/.env"
set +a

mkdir -p "$BACKUP_DIR"
# Prisma adds "?schema=public"; pg_dump does not understand it.
pg_dump --format=custom --no-owner --file="$BACKUP_DIR/db-$STAMP.dump" "${DATABASE_URL%%\?*}"
echo "Database backup: $BACKUP_DIR/db-$STAMP.dump"

if [[ "${STORAGE_DRIVER:-local}" == "local" ]]; then
  tar -czf "$BACKUP_DIR/files-$STAMP.tar.gz" -C "$(dirname "$0")/../apps/api" "${STORAGE_LOCAL_DIR:-./storage}"
  echo "Files backup: $BACKUP_DIR/files-$STAMP.tar.gz"
else
  echo "Files are in S3/MinIO: back them up with bucket replication or 'mc mirror'."
fi

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete

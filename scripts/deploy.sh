#!/usr/bin/env bash
# Production deployment (run on the server, in the repository folder).
# Stops on the first error.
set -euo pipefail

git pull --ff-only
pnpm install --frozen-lockfile

# Back up the database before migrating.
./scripts/backup.sh

pnpm --filter @csbms/shared build
pnpm --filter @csbms/api exec prisma migrate deploy
pnpm build

pm2 startOrReload ecosystem.config.js --update-env
pm2 save

# Health check: the API must report database and storage "up".
for i in {1..20}; do
  if curl -fsS http://127.0.0.1:4000/api/v1/health >/dev/null; then
    echo "Deploy OK"
    exit 0
  fi
  sleep 2
done
echo "Health check failed. See: pm2 logs csbms-api" >&2
exit 1

# Operations Runbooks

Short, step-by-step guides for common problems. Commands assume the repository is in `/srv/employee_management` and the apps run under PM2.

## Quick checks

```bash
pm2 status                                   # are csbms-api and csbms-web "online"?
curl -s http://127.0.0.1:4000/api/v1/health  # {"status":"ok","checks":{"database":"up","storage":"up"}}
pm2 logs csbms-api --lines 100               # JSON logs; every line has a request id
```

Every API response has an `X-Request-Id` header. Ask users for the time of the problem, then search the logs:

```bash
pm2 logs csbms-api --lines 5000 --nostream | grep '"statusCode":5'
```

---

## 1. Website does not open

1. `pm2 status` — if `csbms-web` or `csbms-api` is `errored`/`stopped`: `pm2 restart <name>` and read `pm2 logs <name>`.
2. `sudo nginx -t && sudo systemctl status nginx` — fix config errors, then `sudo systemctl reload nginx`.
3. Check the certificate date: `sudo certbot certificates`.
4. Disk full? `df -h` (see runbook 4).

## 2. API is down or health says `"database":"down"`

1. `sudo systemctl status postgresql` — start it if stopped: `sudo systemctl start postgresql`.
2. Test the connection string from `apps/api/.env`: `psql "$DATABASE_URL" -c 'select 1'` (remove `?schema=public`).
3. Too many connections? `select count(*) from pg_stat_activity;`
4. After the database is back: `pm2 restart csbms-api`, then run the quick checks.

## 3. Health says `"storage":"down"`

- **Local driver:** check the folder in `STORAGE_LOCAL_DIR` exists and the PM2 user can write to it.
- **S3/MinIO driver:** check MinIO is running (`systemctl status minio` or `docker ps`), and `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` in `apps/api/.env`.
- Restart the API after fixing: `pm2 restart csbms-api`.

## 4. Disk is full

1. `df -h` and `du -sh /var/backups/csbms /var/log/* ~/.pm2/logs`.
2. Remove old PM2 logs: `pm2 flush` (install `pm2-logrotate` to prevent this: `pm2 install pm2-logrotate`).
3. Old backups are deleted after `KEEP_DAYS` (default 30) by `scripts/backup.sh`.

## 5. PDF printing fails

The API renders the form with Chromium.

1. `pm2 logs csbms-api | grep -i chromium` — "Cannot start Chromium" means the browser is missing.
2. Install it: `npx playwright install --with-deps chromium`, or set `CHROMIUM_EXECUTABLE_PATH` in `apps/api/.env` to an installed Chromium/Chrome.
3. `pm2 restart csbms-api` and try again.

## 6. A user is locked out

After 5 wrong passwords, the account is locked for 15 minutes. It unlocks by itself. To unlock now, a super admin opens **Settings → Users**, edits the user, and sets a new password (this also clears the lock).

If the **only** super admin forgot the password:

```bash
cd apps/api
node -e "require('argon2').hash(process.argv[1],{type:2}).then(console.log)" 'NewStrongPassword!'
psql "$DATABASE_URL" -c "update app_user set \"passwordHash\"='<hash>', \"failedLoginCount\"=0, \"lockedUntil\"=null where username='admin';"
```

## 7. "Someone else changed this record" (409 STALE_VERSION)

Normal: two people edited the same record. The user clicks **Reload** and enters the change again. Nothing is lost on the server.

## 8. A record is stuck "Waiting for verification"

The unit head (or a super admin) opens the record and clicks **Verify** or **Return** (with a reason). HR cannot edit while a record waits.

## 9. Restore from backup

Backups are made by `scripts/backup.sh` (database dump + local files).

```bash
pm2 stop csbms-api csbms-web
# 1. Database: restore into a NEW database first and check it.
createdb -O csbms csbms_restore
pg_restore --no-owner -d postgresql://csbms:***@localhost:5432/csbms_restore /var/backups/csbms/db-YYYYMMDD-HHMMSS.dump
psql postgresql://csbms:***@localhost:5432/csbms_restore -c 'select count(*) from employee;'
# 2. Point DATABASE_URL in apps/api/.env to csbms_restore (or rename the databases).
# 3. Files (local driver only):
tar -xzf /var/backups/csbms/files-YYYYMMDD-HHMMSS.tar.gz -C apps/api
pm2 start ecosystem.config.js
```

Test a restore **once per month** on a separate server.

## 10. Import the official location list (gazetteer)

The seed only contains all provinces and a **sample** of districts/communes for Kampong Speu. Import the full official list as CSV (`level,code,parent_code,name_kh,name_en`):

```bash
npm run import:locations -w @csbms/api -- /path/to/gazetteer.csv
```

The import can be run again safely (it updates existing codes).

## Incident steps

Detect → Classify (who is affected?) → Investigate (logs, health) → Fix → Check (quick checks) → Write a short note: what happened, why, and how to prevent it.

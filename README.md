# Civil Servant Biography Management System (CSBMS)

A web system to store, search, verify and print the official civil servant biography form (**ជីវប្រវត្តិមន្ត្រីរាជការ**).

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, React Hook Form + Zod, TanStack Query, next-intl (Khmer / English)
- **Backend:** NestJS 11 REST API, Prisma 6, PostgreSQL 16
- **Files:** local folder (development) or MinIO / S3 (production)
- **PDF:** the official form rendered by Chromium (correct Khmer text)

The full design is in [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md). Operations help is in [docs/operations/runbooks.md](docs/operations/runbooks.md).

## Repository layout

```text
apps/
  api/        NestJS API (prisma/ = database schema, migrations, seed)
  web/        Next.js web app (e2e/ = browser tests)
packages/
  shared/     Zod schemas, enums, helpers and types used by both apps
deploy/       Nginx config
scripts/      deploy.sh, backup.sh
docs/         technical documentation and runbooks
```

## Start on your computer

You need **Node.js 22**, **pnpm 10** and **PostgreSQL 16** (or Docker).

```bash
# 1. Database (and optional MinIO) with Docker
docker compose up -d postgres

# 2. Install packages
pnpm install

# 3. Settings (edit the files if needed)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Create the tables and first data (provinces, ranks, positions, admin user)
pnpm --filter @csbms/shared build
pnpm db:migrate
pnpm db:seed

# 5. Run both apps
pnpm dev
```

Open http://localhost:3000 and log in with `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from `apps/api/.env` (default `admin` / `ChangeMe123!`). **Change this password at once** (menu: My account).

API documentation (Swagger, development only): http://localhost:4000/api/docs

> The database user needs permission to create the `pg_trgm` extension the first time (fast name search). In production, a DBA can run `CREATE EXTENSION pg_trgm;` once before `prisma migrate deploy`.

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run API (port 4000) and web (port 3000) with reload |
| `pnpm lint` / `pnpm format` | Check code / format code |
| `pnpm typecheck` | TypeScript check of all packages |
| `pnpm test` | Unit tests (shared, API, web) |
| `pnpm --filter @csbms/api test:e2e` | API integration tests (needs a test database, see below) |
| `pnpm --filter @csbms/web test:e2e` | Browser tests (needs the apps running) |
| `pnpm build` | Production build |
| `pnpm db:migrate` | Create and apply a new migration (development) |
| `pnpm --filter @csbms/api import:locations file.csv` | Import the official location list |

### Tests

- **Unit tests:** `pnpm test`
- **API integration tests** use a separate database that is **wiped** on every run:

  ```bash
  createdb -O csbms csbms_test
  TEST_DATABASE_URL=postgresql://csbms:csbms@localhost:5432/csbms_test pnpm --filter @csbms/api test:e2e
  ```

  Set `CHROMIUM_EXECUTABLE_PATH` to also test the real PDF.
- **Browser tests:** start the apps, then `pnpm --filter @csbms/web test:e2e` (uses `E2E_USERNAME` / `E2E_PASSWORD`, default admin account).

## Production

See Phase 11 in the technical documentation. Short version:

```bash
# first time: install Node 22, pnpm, PostgreSQL 16, Nginx, PM2 and Chromium
# (pnpm --filter @csbms/web exec playwright install --with-deps chromium)
cp apps/api/.env.example apps/api/.env   # set NODE_ENV=production, secrets, COOKIE_SECURE=true, WEB_ORIGIN
cp apps/web/.env.example apps/web/.env
./scripts/deploy.sh                       # backup → migrate → build → pm2 reload → health check
sudo cp deploy/nginx.conf /etc/nginx/sites-available/csbms   # edit the domain first
```

Daily backup (cron): `0 2 * * * cd /srv/employee_management && ./scripts/backup.sh`

## Rules for contributors

- Business rules live in NestJS services, not in React components.
- Validation rules are written **once** in `packages/shared` and used by both apps.
- Every change to employee data writes an audit log entry.
- **Never** put real personal data in code, tests, seed files or screenshots.
- Branches: `feature/…`, `fix/…`; commits: `feat: …`, `fix: …`, `docs: …`, `test: …`, `chore: …`.

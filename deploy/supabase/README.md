# Supabase self-hosted — Test e Live

Test and Live use independent self-hosted Supabase stacks from the official Docker release `self-hosted/v0.8.2`. Each stack has its own Compose project, `.env`, database and storage files, private application network and API keys. The Test Studio remains at `supabase.jobforged.com`; Live Studio uses `supabase-live.jobforged.com`. Both Studio routes require the same separately configured Traefik Basic Auth middleware. Neither Supabase stack shares data with the automation Postgres or the MCP identity database.

## VPS setup

Run these steps as root on the VPS. Keep the official source and generated `.env` under `/opt/jbfd/supabase`; the `.env` must remain root-owned with mode `600` and must never be copied into GitHub or application logs.

```sh
git clone --depth 1 --branch self-hosted/v0.8.2 --sparse https://github.com/supabase/supabase.git /opt/jbfd/supabase-upstream
cd /opt/jbfd/supabase-upstream
git sparse-checkout set docker
mkdir -p /opt/jbfd/supabase
cp -a docker/. /opt/jbfd/supabase/
cd /opt/jbfd/supabase
cp .env.example .env
sh utils/generate-keys.sh --update-env >/dev/null 2>&1
chmod 600 .env
```

Set these non-secret values in `/opt/jbfd/supabase/.env`:

```dotenv
SUPABASE_PUBLIC_URL=https://test.jobforged.com
API_EXTERNAL_URL=https://test.jobforged.com/auth/v1
SITE_URL=https://test.jobforged.com
ADDITIONAL_REDIRECT_URLS=https://test.jobforged.com/api/auth/callback
API_GW_HTTP_PORT=127.0.0.1:8210
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_ANONYMOUS_USERS=false
ENABLE_PHONE_SIGNUP=false
```

`ENABLE_EMAIL_AUTOCONFIRM=true` is a Test-only setting so password signup can be exercised before the email service is connected. Turn it off when SMTP confirmation is configured and before any production use. No social OAuth provider is enabled.

Install the override from this directory into `/opt/jbfd/supabase/docker-compose.override.yml`, validate the merged configuration without printing it, and start the stack:

```sh
docker compose -f docker-compose.yml -f docker-compose.override.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --wait
```

Supabase Studio is exposed only through the HTTPS host `supabase.jobforged.com`, protected by Traefik Basic Auth. Set `STUDIO_BASIC_AUTH_USERS` in the root-owned Supabase `.env` to a quoted `htpasswd -B` user/hash entry before starting the stack. The Studio service is not published on a host port. The API gateway remains published only on loopback port `8210` and is externally exposed through the Test hostname; its API paths are routed before the Test app router. The app container uses `http://supabase-envoy:8000` on `jbfd-test-internal`.

After the first start, apply the versioned SQL migrations from the repository in order using `psql` inside the matching Supabase database container. Never use the automation Postgres or MCP identity database.

## Application configuration

The Test app needs only these runtime variables in `/opt/jbfd/test/.env`:

```dotenv
SUPABASE_INTERNAL_URL=http://supabase-envoy:8000
SUPABASE_ANON_KEY=<the generated ANON_KEY from the Supabase .env>
```

The application never needs `SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, or the Postgres password. The public Test app talks to its same-origin auth routes; server routes call Supabase over the private Docker network and store access/refresh tokens in `HttpOnly`, `SameSite=Lax` cookies.

## Live stack

Create `/opt/jbfd/supabase-live` as an independent copy of the official `docker` directory at the same upstream release. Generate fresh Live secrets with the upstream `utils/generate-keys.sh --update-env`; never copy the Test JWT secret, Postgres password, anon key, service-role key, or database files.

Set these Live-only values in `/opt/jbfd/supabase-live/.env`:

```dotenv
SUPABASE_PUBLIC_URL=https://jobforged.com
API_EXTERNAL_URL=https://jobforged.com/auth/v1
SITE_URL=https://jobforged.com
ADDITIONAL_REDIRECT_URLS=https://jobforged.com/**
API_GW_HTTP_PORT=127.0.0.1:8220
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
ENABLE_ANONYMOUS_USERS=false
ENABLE_PHONE_SIGNUP=false
```

Set `STUDIO_BASIC_AUTH_USERS` to a bcrypt `htpasswd -B` entry in the root-owned Live `.env`; keep the file at mode `600`. Configure SMTP before opening production signups. Leave email auto-confirm disabled in Live.

Copy `docker-compose.live.override.yml` into the Live directory and start it with a unique Compose project name so all default networks and named volumes are distinct:

```sh
cd /opt/jbfd/supabase-live
docker compose --project-name supabase-live -f docker-compose.yml -f docker-compose.live.override.yml config --quiet
docker compose --project-name supabase-live -f docker-compose.yml -f docker-compose.live.override.yml up -d --wait
```

The override attaches only the API gateway to `jbfd-live-internal` and the shared Traefik network. It routes Supabase API paths from `jobforged.com` to Live and protects Studio at `supabase-live.jobforged.com`. Create the `supabase-live` A record pointing to the VPS before using that Studio hostname. Studio is not exposed on a host port.

The Live app uses only the private URL and public anon key in `/opt/jbfd/live/.env`:

```dotenv
SUPABASE_INTERNAL_URL=http://supabase-live-envoy:8000
SUPABASE_ANON_KEY=<the generated Live ANON_KEY>
```

Never put `SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, or the Postgres password in either app `.env`.

## Migrations and data refresh

Apply each migration to Test first and Live after Test is accepted. Migrations are the source of truth for schema, RLS, triggers and functions; do not copy database files between environments to promote code. Make production migrations backward-compatible so the previous app image can still run during rollback.

Refreshing Test from Live is an explicit, one-time restore operation, never a continuous sync. Before a refresh, create and verify a current Test backup with `scripts/supabase-backup.sh test`, export Live with `scripts/supabase-backup.sh live`, restore into Test only, scrub or replace company names, CNPJ, phone numbers, email addresses, user metadata and sessions, then validate the sanitized copy. Include Storage objects only when the test requires them, and remove personal files or metadata as part of the scrub. Backups remain root-only on the VPS; encrypt copies moved off the VPS and define a retention period. Never restore a Test dump into Live.

## Applying versioned migrations

Install `scripts/supabase-migrate.sh` and the repository's `supabase/migrations/*.sql` on the VPS. Run it as root after a database backup:

```sh
SUPABASE_MIGRATIONS_DIR=/opt/jbfd/supabase-migrations scripts/supabase-migrate.sh test
SUPABASE_MIGRATIONS_DIR=/opt/jbfd/supabase-migrations scripts/supabase-migrate.sh live
```

The first adoption of the existing Test database is recorded only after the script confirms the expected current schema. That one-time action requires `CONFIRM_BASELINE_EXISTING=yes` and `--baseline-existing`. New Live databases apply migrations in filename order. The script stores checksums in an access-restricted application table and rejects edited migrations; add a new numbered SQL file for each schema change.

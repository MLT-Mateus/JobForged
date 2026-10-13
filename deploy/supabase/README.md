# Supabase self-hosted — Test

The Test Supabase stack is isolated from the Live application and the existing Keycloak service. It uses the official Supabase Docker release `self-hosted/v0.8.2`, with its API gateway attached to the private Test Docker network and the existing Traefik network.

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

The Supabase Studio dashboard has no public Traefik route. The API gateway is published only on loopback port `8210` and is exposed externally through TLS on the Test hostname. Its API paths are routed before the Test app router. The app container uses `http://supabase-envoy:8000` on `jbfd-test-internal`.

After the first start, apply the versioned SQL migrations from the repository in order using `psql` inside the Supabase database container. Do not use the existing Keycloak database or any Live database.

## Application configuration

The Test app needs only these runtime variables in `/opt/jbfd/test/.env`:

```dotenv
SUPABASE_INTERNAL_URL=http://supabase-envoy:8000
SUPABASE_ANON_KEY=<the generated ANON_KEY from the Supabase .env>
```

The application never needs `SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, or the Postgres password. The public Test app talks to its same-origin auth routes; server routes call Supabase over the private Docker network and store access/refresh tokens in `HttpOnly`, `SameSite=Lax` cookies.

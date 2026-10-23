#!/usr/bin/env bash
set -euo pipefail
container="jbfd-security-compat-ci-${GITHUB_RUN_ID:-$$}"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$container" --network none --memory 768m --cpus 1 \
 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94 >/dev/null
ready=false
for attempt in $(seq 1 60); do
 if docker exec "$container" psql -h 127.0.0.1 -U postgres -Atqc 'select 1' >/dev/null 2>&1; then ready=true;break;fi
 sleep 1
done
[[ "$ready" == true ]] || { echo 'Disposable database readiness failed' >&2;exit 1; }
sql() { docker exec -i "$container" psql -h 127.0.0.1 -Xq -U postgres -v ON_ERROR_STOP=1; }
sql < tests/security-provider-contract.sql
for migration in supabase/migrations/[0-9]*.sql; do
 { printf 'BEGIN;\n';cat "$migration";printf '\nCOMMIT;\n'; } | sql
done
sql < tests/security-contracts-compat.sql

#!/usr/bin/env bash
set -euo pipefail
# A dedicated, disposable engine. No access to project Test or Live credentials.
container="jbfd-security-ci-${GITHUB_RUN_ID:-$$}"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$container" --network none --memory 768m --cpus 1 \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94 >/dev/null
wait_for_database() {
  # The entrypoint starts a temporary socket-only initialization server. Wait
  # for final TCP readiness to avoid racing its intentional shutdown.
  for attempt in $(seq 1 60); do
    if docker exec "$container" psql -h 127.0.0.1 -U postgres -Atqc 'select 1' >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo 'Disposable database readiness failed' >&2
  return 1
}
wait_for_database
sql() { docker exec -i "$container" psql -h 127.0.0.1 -Xq -U postgres -v ON_ERROR_STOP=1; }
sql < tests/security-provider-contract.sql
for migration in supabase/migrations/[0-9]*.sql; do
  { printf 'BEGIN;\n'; cat "$migration"; printf '\nCOMMIT;\n'; } | sql
done
sql < tests/security-foundation.sql
sql < tests/signup-contracts.sql
{ printf 'BEGIN;\n';cat tests/security-session-fixtures.sql tests/backoffice-security.sql; } | sql
{ printf 'BEGIN;\n';cat tests/security-session-fixtures.sql;node tests/branding-fixture.mjs;cat tests/branding-security.sql; } | sql
sql <<'SQL'
set role jbfd_security_gateway;
do $$begin
 for i in 1..5 loop
  if not app_private.gateway_rate_limit('recovery-account',repeat('0',64)) then raise exception 'rate budget refused';end if;
 end loop;
 if app_private.gateway_rate_limit('recovery-account',repeat('0',64)) then raise exception 'rate budget bypass';end if;
 begin perform * from public.company_members;raise exception 'gateway read tenant data';exception when insufficient_privilege then null;end;
 begin perform public.company_read_v1();raise exception 'gateway executed business RPC';exception when insufficient_privilege then null;end;
end$$;
SQL
# Durable state must survive process/container restarts, not just JS unit tests.
docker restart "$container" >/dev/null
wait_for_database
sql <<'SQL'
set role jbfd_security_gateway;
do $$begin
 if app_private.gateway_rate_limit('recovery-account',repeat('0',64)) then raise exception 'rate state lost after restart';end if;
end$$;
select 'durable_rate_limit_passed';
SQL

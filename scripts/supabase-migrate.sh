#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <test|live> [--baseline-existing|--check]" >&2
  exit 64
}

[[ $# -ge 1 && $# -le 2 ]] || usage
environment=$1
mode=${2:-apply}
[[ "$mode" == "apply" || "$mode" == "--baseline-existing" || "$mode" == "--check" ]] || usage
[[ $(id -u) -eq 0 ]] || { echo "Run this script as root on the VPS." >&2; exit 77; }

case "$environment" in
  test)
    database_container=supabase-db
    ;;
  live)
    database_container=supabase-live-db
    ;;
  *) usage ;;
esac

migrations_dir=${SUPABASE_MIGRATIONS_DIR:-"$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"}
[[ -d "$migrations_dir" ]] || { echo "Migrations directory is missing." >&2; exit 66; }
docker inspect --format '{{.State.Health.Status}}' "$database_container" 2>/dev/null | grep -qx healthy || {
  echo "Supabase database container is not healthy." >&2
  exit 69
}

migration_role=postgres
psql() {
  docker exec -i "$database_container" psql -U "$migration_role" -d postgres -v ON_ERROR_STOP=1 "$@"
}

if [[ "$mode" != "--check" ]]; then
  psql -c 'CREATE TABLE IF NOT EXISTS public.jbfd_schema_migrations (filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()); REVOKE ALL ON public.jbfd_schema_migrations FROM PUBLIC, anon, authenticated;' >/dev/null
fi

mapfile -t migrations < <(find "$migrations_dir" -maxdepth 1 -type f -name '[0-9]*.sql' -printf '%f\n' | sort)
[[ ${#migrations[@]} -gt 0 ]] || { echo "No SQL migrations found." >&2; exit 66; }

if [[ "$mode" == "--baseline-existing" ]]; then
  [[ "$environment" == test ]] || { echo "Baseline is restricted to the existing Test database." >&2; exit 64; }
  [[ ${CONFIRM_BASELINE_EXISTING:-} == yes ]] || { echo "Set CONFIRM_BASELINE_EXISTING=yes only after verifying the existing schema." >&2; exit 64; }
  schema_ok=$(psql -Atqc "SELECT (to_regclass('public.companies') IS NOT NULL AND to_regclass('public.company_members') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='terms_accepted_at') AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='companies' AND policyname='Active members can read their company') AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_members' AND policyname='Active members can read their organization roster') AND to_regprocedure('app_private.is_company_member(uuid)') IS NOT NULL)::text")
  [[ "$schema_ok" == true ]] || { echo "Existing Test schema does not match the current migrations; baseline was not recorded." >&2; exit 65; }
  for filename in "${migrations[@]}"; do
    checksum=$(sha256sum "$migrations_dir/$filename" | cut -d ' ' -f 1)
    existing=$(psql -Atqc "SELECT checksum FROM public.jbfd_schema_migrations WHERE filename = '$filename'")
    [[ -z "$existing" || "$existing" == "$checksum" ]] || { echo "Migration checksum mismatch: $filename" >&2; exit 65; }
    psql -c "INSERT INTO public.jbfd_schema_migrations (filename, checksum) VALUES ('$filename', '$checksum') ON CONFLICT (filename) DO NOTHING" >/dev/null
    echo "Recorded existing migration: $filename"
  done
  exit 0
fi

for filename in "${migrations[@]}"; do
  checksum=$(sha256sum "$migrations_dir/$filename" | cut -d ' ' -f 1)
  existing=$(psql -Atqc "SELECT checksum FROM public.jbfd_schema_migrations WHERE filename = '$filename'")
  if [[ -n "$existing" ]]; then
    [[ "$existing" == "$checksum" ]] || { echo "Migration checksum mismatch: $filename" >&2; exit 65; }
    echo "Already applied: $filename"
    continue
  fi
  [[ "$mode" != "--check" ]] || { echo "Migration pendente: $filename. Aplique com backup antes do deploy." >&2; exit 65; }
  migration_role=postgres
  if head -n 1 "$migrations_dir/$filename" | grep -qx -- '-- migration-role: supabase_admin'; then
    migration_role=supabase_admin
  fi
  {
    printf 'BEGIN;\n'
    cat "$migrations_dir/$filename"
    printf "\nINSERT INTO public.jbfd_schema_migrations (filename, checksum) VALUES ('%s', '%s');\nCOMMIT;\n" "$filename" "$checksum"
  } | psql >/dev/null
  migration_role=postgres
  echo "Applied: $filename"
done

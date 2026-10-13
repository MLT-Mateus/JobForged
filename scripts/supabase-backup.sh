#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <test|live>" >&2
  exit 64
fi
if [[ "$1" != test && "$1" != live ]]; then
  echo "Usage: $0 <test|live>" >&2
  exit 64
fi
[[ $(id -u) -eq 0 ]] || { echo "Run this script as root on the VPS." >&2; exit 77; }

environment=$1
if [[ "$environment" == test ]]; then
  database_container=supabase-db
  storage_dir=/opt/jbfd/supabase/volumes/storage
else
  database_container=supabase-live-db
  storage_dir=/opt/jbfd/supabase-live/volumes/storage
fi

docker inspect --format '{{.State.Health.Status}}' "$database_container" 2>/dev/null | grep -qx healthy || {
  echo "Supabase database container is not healthy." >&2
  exit 69
}
[[ -d "$storage_dir" ]] || { echo "Supabase Storage directory is missing." >&2; exit 66; }

umask 077
backup_root=/opt/jbfd/backups/supabase
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="$backup_root/$environment-$timestamp"
install -d -m 700 "$backup_dir"
trap 'rm -f "$backup_dir/postgres.sql"' EXIT

docker exec -u postgres "$database_container" pg_dumpall -U postgres > "$backup_dir/postgres.sql"
[[ -s "$backup_dir/postgres.sql" ]] || { echo "Database dump is empty." >&2; exit 74; }
gzip -n "$backup_dir/postgres.sql"
tar -czf "$backup_dir/storage.tar.gz" -C "$storage_dir" .
chmod 600 "$backup_dir"/*
(
  cd "$backup_dir"
  sha256sum postgres.sql.gz storage.tar.gz > SHA256SUMS
  sha256sum -c SHA256SUMS >/dev/null
)
gzip -t "$backup_dir/postgres.sql.gz"
tar -tzf "$backup_dir/storage.tar.gz" >/dev/null
chmod 600 "$backup_dir/SHA256SUMS"
echo "Verified backup: $backup_dir"

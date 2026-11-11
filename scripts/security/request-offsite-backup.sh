#!/usr/bin/env bash
set -euo pipefail

environment="${1:-}"
revision="${2:-}"
request_id="${3:-}"
token="${BACKUP_REPOSITORY_TOKEN:-}"
repository='MLT-Mateus/jobforged-backups'
api='https://api.github.com'
auth_config=''
cleanup() { [[ -z "$auth_config" ]] || rm -f -- "$auth_config"; }
trap cleanup EXIT

[[ "$environment" == test || "$environment" == live ]] || { echo "Backup environment is invalid" >&2; exit 64; }
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo "Backup revision must be a full SHA" >&2; exit 64; }
[[ "$request_id" =~ ^[A-Za-z0-9-]{1,64}$ ]] || { echo "Backup request ID is invalid" >&2; exit 64; }
[[ -n "$token" ]] || { echo "BACKUP_WORKFLOW_TOKEN is missing from this protected deployment environment" >&2; exit 78; }
set +x
auth_config="$(mktemp)"
chmod 600 "$auth_config"
printf 'header = "Authorization: Bearer %s"\n' "$token" > "$auth_config"
unset token BACKUP_REPOSITORY_TOKEN

payload="$(jq -cn --arg environment "$environment" --arg revision "$revision" --arg request_id "$request_id" \
  '{ref:"main",inputs:{environment:$environment,revision:$revision,request_id:$request_id}}')"
curl --fail --silent --show-error -X POST \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  --config "$auth_config" \
  -H 'Content-Type: application/json' \
  "$api/repos/$repository/actions/workflows/backup.yml/dispatches" \
  --data "$payload" >/dev/null
unset payload

expected_title="Offsite backup $environment $request_id"
run_id=''
for attempt in $(seq 1 60); do
  runs="$(curl --fail --silent --show-error \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    --config "$auth_config" \
    "$api/repos/$repository/actions/workflows/backup.yml/runs?event=workflow_dispatch&per_page=100")"
  run_id="$(jq -r --arg title "$expected_title" '[.workflow_runs[] | select(.display_title == $title and .head_branch == "main")][0].id // empty' <<<"$runs")"
  unset runs
  if [[ -n "$run_id" ]]; then break; fi
  sleep 5
done
[[ -n "$run_id" ]] || { echo "Private backup workflow did not start" >&2; exit 1; }

for attempt in $(seq 1 60); do
  run="$(curl --fail --silent --show-error \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    --config "$auth_config" \
    "$api/repos/$repository/actions/runs/$run_id")"
  status="$(jq -r '.status' <<<"$run")"
  conclusion="$(jq -r '.conclusion // empty' <<<"$run")"
  unset run
  if [[ "$status" == completed ]]; then
    [[ "$conclusion" == success ]] || { echo "Private encrypted backup failed; deployment stopped" >&2; exit 1; }
    echo "Encrypted $environment backup verified in the private repository."
    exit 0
  fi
  sleep 30
done
echo "Private backup workflow timed out; deployment stopped" >&2
exit 1

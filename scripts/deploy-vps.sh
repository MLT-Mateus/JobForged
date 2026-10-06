#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in live|test) environment="$1" ;; *) echo "Uso: bash scripts/deploy-vps.sh live|test [config|up|logs|down]" >&2; exit 64 ;; esac
command="${2:-config}"
case "$command" in config|up|logs|down) ;; *) echo "Comando inválido" >&2; exit 64 ;; esac
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JBFD_ENV_FILE="/opt/jbfd/${environment}/.env"
[[ -f "$JBFD_ENV_FILE" ]] || { echo "Arquivo ausente: $JBFD_ENV_FILE" >&2; exit 66; }
compose=(docker compose --project-name "jbfd-${environment}" --env-file "$JBFD_ENV_FILE" -f "$root/deploy/compose.yml")
case "$command" in
  config) "${compose[@]}" config --quiet ;;
  up) "${compose[@]}" up -d --wait --wait-timeout 120 ;;
  logs) "${compose[@]}" logs --tail 100 ;;
  down) "${compose[@]}" down ;;
esac

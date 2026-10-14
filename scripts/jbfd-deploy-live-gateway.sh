#!/usr/bin/env bash
set -euo pipefail

read -r action environment revision extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ "$action" == deploy && "$environment" == live && -z "${extra:-}" && "$revision" =~ ^[0-9a-f]{40}$ ]] || {
  echo "Comando negado. Formato permitido: deploy live <SHA completo>" >&2
  exit 64
}

exec sudo -n /opt/jbfd/bin/jbfd-deploy-live-root.sh "$revision"

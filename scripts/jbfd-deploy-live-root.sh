#!/usr/bin/env bash
set -euo pipefail

[[ $(id -u) -eq 0 ]] || { echo "Este helper precisa ser chamado pelo sudo autorizado." >&2; exit 77; }
[[ $# -eq 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || {
  echo "SHA de deploy Live inválido." >&2
  exit 64
}

export SSH_ORIGINAL_COMMAND="deploy live $1"
exec /opt/jbfd/bin/jbfd-deploy-vps-gateway.sh live

#!/usr/bin/env bash
set -euo pipefail

if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ test\ ([0-9a-f]{40})$ ]]; then
  revision="${BASH_REMATCH[1]}"
else
  echo "Comando de deploy Test inválido." >&2
  exit 64
fi

IFS= read -r registry_username || {
  echo "Usuário do registry ausente." >&2
  exit 64
}
[[ "$registry_username" =~ ^[A-Za-z0-9-]{1,39}$ ]] || {
  echo "Usuário do registry inválido." >&2
  exit 64
}
IFS= read -r registry_token || {
  echo "Token temporário do registry ausente." >&2
  exit 64
}
[[ "$registry_token" =~ ^[A-Za-z0-9_]{20,512}$ ]] || {
  echo "Token temporário do registry inválido." >&2
  exit 64
}

set +e
printf '%s\n%s\n%s\n' "$revision" "$registry_username" "$registry_token" |
  sudo -n /opt/jbfd/bin/jbfd-deploy-test-root.sh
result=$?
set -e
unset registry_token
exit "$result"

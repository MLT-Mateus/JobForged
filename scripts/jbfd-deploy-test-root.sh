#!/usr/bin/env bash
set -euo pipefail
umask 077

IFS= read -r revision || {
  echo "SHA de deploy ausente." >&2
  exit 64
}
IFS= read -r registry_username || {
  echo "Usuário do registry ausente." >&2
  exit 64
}
IFS= read -r registry_token || {
  echo "Token temporário do registry ausente." >&2
  exit 64
}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || {
  echo "SHA de deploy inválido." >&2
  exit 64
}
[[ "$registry_username" =~ ^[A-Za-z0-9-]{1,39}$ ]] || {
  echo "Usuário do registry inválido." >&2
  exit 64
}
[[ "$registry_token" =~ ^[[:graph:]]{20,512}$ ]] || {
  echo "Token temporário do registry inválido." >&2
  exit 64
}
[[ -f /opt/jbfd/test/.env && "$(stat -c '%a' /opt/jbfd/test/.env)" == 600 ]] || {
  echo "O .env de Test precisa existir com permissão 600." >&2
  exit 66
}

docker_config="$(mktemp -d /run/jbfd-test-docker.XXXXXX)"
cleanup() {
  DOCKER_CONFIG="$docker_config" docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf -- "$docker_config"
}
trap cleanup EXIT
export DOCKER_CONFIG="$docker_config"

printf '%s' "$registry_token" |
  docker login ghcr.io --username "$registry_username" --password-stdin >/dev/null
unset registry_username
unset registry_token

/opt/jbfd/bin/deploy-vps.sh test deploy "$revision"

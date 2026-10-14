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
IFS= read -r brevo_api_key || {
  echo "A chave da API Brevo está ausente." >&2
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
[[ "$brevo_api_key" =~ ^[[:graph:]]{20,512}$ ]] || {
  echo "A configuração da API Brevo é inválida." >&2
  exit 64
}
[[ -f /opt/jbfd/test/.env && "$(stat -c '%a' /opt/jbfd/test/.env)" == 600 ]] || {
  echo "O .env de Test precisa existir com permissão 600." >&2
  exit 66
}

env_temporary=""
update_brevo_key() {
  local source=/opt/jbfd/test/.env found=0 line
  env_temporary="$(mktemp /opt/jbfd/test/.env.XXXXXX)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == BREVO_API_KEY=* ]]; then
      found=$((found + 1))
      [[ "$found" -eq 1 ]] || { echo "O .env Test contém entradas Brevo duplicadas." >&2; return 65; }
      printf 'BREVO_API_KEY=%s\n' "$brevo_api_key" >> "$env_temporary"
    else
      printf '%s\n' "$line" >> "$env_temporary"
    fi
  done < "$source"
  if [[ "$found" -eq 0 ]]; then
    printf 'BREVO_API_KEY=%s\n' "$brevo_api_key" >> "$env_temporary"
  fi
  chmod 600 "$env_temporary"
  mv -f "$env_temporary" "$source"
  env_temporary=""
}

docker_config="$(mktemp -d /run/jbfd-test-docker.XXXXXX)"
cleanup() {
  [[ -z "$env_temporary" ]] || rm -f -- "$env_temporary"
  DOCKER_CONFIG="$docker_config" docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf -- "$docker_config"
}
trap cleanup EXIT
export DOCKER_CONFIG="$docker_config"

printf '%s' "$registry_token" |
  docker login ghcr.io --username "$registry_username" --password-stdin >/dev/null
unset registry_username
unset registry_token
update_brevo_key
unset brevo_api_key

/opt/jbfd/bin/deploy-vps.sh test deploy "$revision"

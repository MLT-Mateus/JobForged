#!/usr/bin/env bash
set -euo pipefail

allowed_environment="${1:-}"
case "$allowed_environment" in test|live) ;; *) echo "Gateway sem ambiente autorizado" >&2; exit 64 ;; esac
read -r action environment revision extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ "$action" == deploy && "$environment" == "$allowed_environment" && -z "${extra:-}" && "$revision" =~ ^[0-9a-f]{40}$ ]] || {
  echo "Comando negado. Formato permitido: deploy ${allowed_environment} <SHA completo>" >&2
  exit 64
}

root=/opt/jbfd
releases="$root/releases"
install -d -m 700 "$releases"
[[ -w "$releases" ]] || { echo "Diretório de releases sem permissão de escrita" >&2; exit 73; }
exec 9>"$releases/.deploy.lock"
flock -n 9 || { echo "Já existe um deploy em andamento" >&2; exit 75; }
release="$releases/$revision"
if [[ ! -x "$release/scripts/deploy-vps.sh" || ! -f "$release/deploy/compose.yml" ]]; then
  temporary="$releases/.${revision}.tmp"
  rm -rf -- "$temporary"
  git clone --no-checkout https://github.com/MLT-Mateus/JobForged.git "$temporary"
  git -C "$temporary" checkout --detach "$revision"
  [[ -f "$temporary/scripts/deploy-vps.sh" && -f "$temporary/deploy/compose.yml" ]] || {
    rm -rf -- "$temporary"
    echo "O commit não contém os arquivos de deploy esperados" >&2
    exit 65
  }
  chmod +x "$temporary/scripts/deploy-vps.sh"
  mv "$temporary" "$release"
fi
exec bash "$release/scripts/deploy-vps.sh" "$environment" deploy "$revision"

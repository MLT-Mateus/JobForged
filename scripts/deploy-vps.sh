#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in live|test) environment="$1" ;; *) echo "Uso: bash scripts/deploy-vps.sh live|test [config|up|logs|down|deploy <commit>]" >&2; exit 64 ;; esac
command="${2:-config}"
case "$command" in config|up|logs|down|deploy) ;; *) echo "Comando inválido" >&2; exit 64 ;; esac
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JBFD_ENV_FILE="/opt/jbfd/${environment}/.env"
[[ -f "$JBFD_ENV_FILE" ]] || { echo "Arquivo ausente: $JBFD_ENV_FILE" >&2; exit 66; }
compose=(docker compose --project-name "jbfd-${environment}" --env-file "$JBFD_ENV_FILE" -f "$root/deploy/compose.yml")
case "$command" in
  config) "${compose[@]}" config --quiet ;;
  up) "${compose[@]}" up -d --wait --wait-timeout 120 ;;
  logs) "${compose[@]}" logs --tail 100 ;;
  down) "${compose[@]}" down ;;
  deploy)
    revision="${3:-}"
    [[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo "Informe o SHA completo do commit" >&2; exit 64; }
    image="ghcr.io/mlt-mateus/jobforged:${revision}"
    current_image="$(awk -F= '$1 == "JBFD_IMAGE" { sub(/^[^=]*=/, ""); print; count++ } END { if (count != 1) exit 1 }' "$JBFD_ENV_FILE")" || {
      echo "O .env precisa ter exatamente uma linha JBFD_IMAGE" >&2; exit 65;
    }
    write_image() {
      local next_image="$1" temporary
      temporary="$(mktemp "${JBFD_ENV_FILE}.XXXXXX")"
      awk -v image="$next_image" 'BEGIN { count=0 } /^JBFD_IMAGE=/ { print "JBFD_IMAGE=" image; count++; next } { print } END { if (count != 1) exit 1 }' "$JBFD_ENV_FILE" > "$temporary"
      chmod 600 "$temporary"
      mv -f "$temporary" "$JBFD_ENV_FILE"
    }
    restore_image() {
      write_image "$current_image"
      "${compose[@]}" up -d --wait --wait-timeout 120 || true
    }
    fail_deploy() {
      echo "Deploy falhou; restaurando a imagem anterior." >&2
      restore_image
      exit 1
    }
    write_image "$image"
    docker pull "$image" || fail_deploy
    if ! image_revision="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image")"; then
      fail_deploy
    fi
    [[ "$image_revision" == "$revision" ]] || fail_deploy
    "${compose[@]}" config --quiet || fail_deploy
    "${compose[@]}" up -d --wait --wait-timeout 120 || fail_deploy
    printf 'Deploy concluído: ambiente=%s commit=%s\n' "$environment" "$revision"
    ;;
esac

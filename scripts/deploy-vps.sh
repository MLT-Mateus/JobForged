#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in live|test) environment="$1" ;; *) echo "Uso: bash scripts/deploy-vps.sh live|test [config|up|logs|down|deploy <commit>]" >&2; exit 64 ;; esac
command="${2:-config}"
case "$command" in config|up|logs|down|deploy) ;; *) echo "Comando inválido" >&2; exit 64 ;; esac
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JBFD_ENV_FILE="/opt/jbfd/${environment}/.env"
[[ -f "$JBFD_ENV_FILE" ]] || { echo "Arquivo ausente: $JBFD_ENV_FILE" >&2; exit 66; }

# Keep canonical host and public URL available for legacy VPS .env files.
# These values are derived per environment and never write secrets or mutate the .env.
if [[ "$environment" == "live" ]]; then
  export APP_HOST_RULE="${APP_HOST_RULE:-Host(`jobforged.com`) || Host(`www.jobforged.com`)}"
  export APP_PUBLIC_URL="${APP_PUBLIC_URL:-https://jobforged.com}"
else
  export APP_HOST_RULE="${APP_HOST_RULE:-Host(`test.jobforged.com`)}"
  export APP_PUBLIC_URL="${APP_PUBLIC_URL:-https://test.jobforged.com}"
fi

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
    # A matching image alone does not prove database or Auth readiness.
    bash "$root/scripts/supabase-migrate.sh" "$environment" --check
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
    "${compose[@]}" exec -T app node --input-type=module < "$root/scripts/verify-auth-readiness.mjs" || fail_deploy
    printf 'Deploy concluído: ambiente=%s commit=%s\n' "$environment" "$revision"
    ;;
esac

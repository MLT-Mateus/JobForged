#!/usr/bin/env bash
set -euo pipefail
task="${1:-}"
source_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
target=/opt/jbfd/mcp
[[ "$(id -u)" == 0 ]] || { echo "Execute na VPS como root para instalar o serviço isolado." >&2; exit 77; }

require_prepared() {
  [[ -f "$target/.env" && -f "$target/.env.oauth" && -f "$target/compose.env" ]] || { echo "Execute prepare primeiro." >&2; exit 78; }
  docker network inspect jobforged_jobforged_network >/dev/null
}
require_dns() {
  python3 - "$1" <<'PY'
import socket,sys
addresses={entry[4][0] for entry in socket.getaddrinfo(sys.argv[1],443,socket.AF_INET)}
if addresses != {"187.77.229.27"}:
    raise SystemExit("DNS ainda não aponta exclusivamente para a VPS esperada.")
PY
}
mcp_compose() {
  docker compose --env-file "$target/compose.env" -f "$source_root/deploy/mcp/compose.yml" "$@"
}
identity_compose() {
  docker compose --env-file "$target/.env.oauth" -f "$source_root/deploy/mcp/identity.compose.yml" "$@"
}
case "$task" in
  prepare)
    command -v docker >/dev/null
    command -v python3 >/dev/null
    docker compose version >/dev/null
    install -d -m 700 "$target" "$target/bin"
    install -d -m 755 "$target/snapshots"
    [[ -e "$target/.env" ]] || install -m 600 "$source_root/deploy/mcp/mcp.env.example" "$target/.env"
    if [[ ! -e "$target/.env.oauth" ]]; then
      python3 - "$target/.env.oauth" <<'PY'
import os,secrets,sys
fd=os.open(sys.argv[1],os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,"w") as file:
    for name in ("JBFD_IDENTITY_DB_PASSWORD","JBFD_IDENTITY_ADMIN_PASSWORD"):
        file.write(name+"="+secrets.token_urlsafe(36)+"\n")
PY
    fi
    if [[ -e "$target/compose.env" ]]; then
      echo "compose.env existente preservado. Verifique JBFD_MCP_SOURCE se mudou a pasta do pacote."
    else
      (umask 077; printf 'JBFD_MCP_SOURCE=%s/services/mcp\n' "$source_root" > "$target/compose.env")
    fi
    mcp_compose config --quiet
    identity_compose config --quiet
    echo "Preparação local concluída. Nenhum container ou timer foi iniciado."
    ;;
  identity-up)
    require_prepared
    require_dns auth.jobforged.com
    identity_compose up -d
    ;;
  collector-install)
    require_prepared
    command -v systemctl >/dev/null
    install -m 755 "$source_root/scripts/mcp/collect.py" "$target/bin/collect.py"
    install -m 644 "$source_root/deploy/mcp/jbfd-mcp-collector.service" /etc/systemd/system/
    install -m 644 "$source_root/deploy/mcp/jbfd-mcp-collector.timer" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable --now jbfd-mcp-collector.timer
    systemctl start jbfd-mcp-collector.service
    ;;
  check)
    require_prepared
    mcp_compose build
    mcp_compose run --rm --no-deps mcp npm audit --omit=dev --audit-level=high
    mcp_compose run --rm --no-deps mcp npm run preflight
    ;;
  mcp-up)
    require_prepared
    require_dns mcp.jobforged.com
    mcp_compose build
    mcp_compose run --rm --no-deps mcp npm audit --omit=dev --audit-level=high
    mcp_compose run --rm --no-deps mcp npm run preflight
    mcp_compose up -d --wait
    ;;
  mcp-stop)
    require_prepared
    mcp_compose stop
    ;;
  *)
    echo "Uso: bash scripts/mcp/install.sh prepare|identity-up|collector-install|check|mcp-up|mcp-stop" >&2
    exit 64
    ;;
esac

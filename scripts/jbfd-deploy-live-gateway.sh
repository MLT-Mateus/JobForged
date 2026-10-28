#!/usr/bin/env bash
set -euo pipefail

if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^probe\ readiness\ live\ ([0-9a-f]{40})$ ]]; then
  exec sudo -n /opt/jbfd/bin/jbfd-deploy-live-root.sh probe-readiness "${BASH_REMATCH[1]}"
fi

if [[ "${SSH_ORIGINAL_COMMAND:-}" == "probe brevo live" ]]; then
  exec sudo -n /opt/jbfd/bin/jbfd-deploy-live-root.sh probe-brevo
fi

if [[ "${SSH_ORIGINAL_COMMAND:-}" == "configure brevo live" ]]; then
  IFS= read -r brevo_api_key || { echo "A chave API Brevo não foi recebida." >&2; exit 64; }
  IFS= read -r brevo_smtp_user || { echo "O login SMTP Brevo não foi recebido." >&2; exit 64; }
  IFS= read -r brevo_smtp_key || { echo "A chave SMTP Brevo não foi recebida." >&2; exit 64; }
  remaining="$(cat)"
  brevo_smtp_key+="$remaining"
  brevo_smtp_key="${brevo_smtp_key//[[:space:]]/}"
  trim_outer_whitespace() {
    local value="$1"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
  }
  brevo_api_key="$(trim_outer_whitespace "$brevo_api_key")"
  brevo_smtp_user="$(trim_outer_whitespace "$brevo_smtp_user")"
  [[ "$brevo_api_key" =~ ^[[:graph:]]{20,512}$ ]] || { echo "A configuração da API Brevo é inválida." >&2; exit 64; }
  [[ "$brevo_smtp_user" =~ ^[[:graph:]]{3,255}$ ]] || { echo "O login SMTP Brevo é inválido." >&2; exit 64; }
  [[ "$brevo_smtp_key" =~ ^[[:graph:]]{15,512}$ ]] || { echo "A chave SMTP Brevo é inválida." >&2; exit 64; }

  set +e
  printf '%s\n%s\n%s\n' "$brevo_api_key" "$brevo_smtp_user" "$brevo_smtp_key" |
    sudo -n /opt/jbfd/bin/jbfd-deploy-live-root.sh configure-brevo
  result=$?
  set -e
  unset brevo_api_key brevo_smtp_user brevo_smtp_key remaining
  exit "$result"
fi

read -r action environment revision extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ "$action" == deploy && "$environment" == live && -z "${extra:-}" && "$revision" =~ ^[0-9a-f]{40}$ ]] || {
  echo "Comando negado. Formato permitido: deploy live <SHA completo>" >&2
  exit 64
}

exec sudo -n /opt/jbfd/bin/jbfd-deploy-live-root.sh "$revision"

#!/usr/bin/env bash
set -euo pipefail

if [[ "${SSH_ORIGINAL_COMMAND:-}" == "probe brevo test" ]]; then
  echo "brevo-test-protocol-v1"
  exit 0
fi

if [[ "${SSH_ORIGINAL_COMMAND:-}" == "probe smtp test" ]]; then
  echo "supabase-smtp-test-protocol-v1"
  exit 0
fi

if [[ "${SSH_ORIGINAL_COMMAND:-}" == "configure smtp test" ]]; then
  IFS= read -r brevo_smtp_user || {
    echo "O login SMTP da Brevo não foi recebido." >&2
    exit 64
  }
  IFS= read -r brevo_smtp_key || {
    echo "A chave SMTP da Brevo não foi recebida." >&2
    exit 64
  }
  remaining_smtp_key="$(cat)"
  brevo_smtp_key+="$remaining_smtp_key"
  brevo_smtp_key="${brevo_smtp_key//[[:space:]]/}"
  trim_outer_whitespace() {
    local value="$1"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
  }
  brevo_smtp_user="$(trim_outer_whitespace "$brevo_smtp_user")"
  [[ "$brevo_smtp_user" =~ ^[[:graph:]]{3,255}$ ]] || {
    echo "O login SMTP da Brevo é inválido." >&2
    exit 64
  }
  [[ "$brevo_smtp_key" =~ ^[[:graph:]]{15,512}$ ]] || {
    echo "A chave SMTP da Brevo é inválida." >&2
    exit 64
  }

  set +e
  printf '%s\n%s\n' "$brevo_smtp_user" "$brevo_smtp_key" |
    sudo -n /opt/jbfd/bin/jbfd-supabase-smtp-test-root.sh
  result=$?
  set -e
  unset brevo_smtp_user brevo_smtp_key
  exit "$result"
fi

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
[[ "$registry_token" =~ ^[[:graph:]]{20,512}$ ]] || {
  echo "Token temporário do registry inválido." >&2
  exit 64
}
IFS= read -r brevo_api_key || {
  echo "A chave da API Brevo não foi recebida." >&2
  exit 64
}
[[ "$brevo_api_key" =~ ^[[:graph:]]{20,512}$ ]] || {
  echo "A configuração da API Brevo é inválida." >&2
  exit 64
}

set +e
printf '%s\n%s\n%s\n%s\n' "$revision" "$registry_username" "$registry_token" "$brevo_api_key" |
  sudo -n /opt/jbfd/bin/jbfd-deploy-test-root.sh
result=$?
set -e
unset registry_token brevo_api_key
exit "$result"

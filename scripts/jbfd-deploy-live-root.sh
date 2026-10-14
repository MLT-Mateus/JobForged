#!/usr/bin/env bash
set -euo pipefail
umask 077

[[ $(id -u) -eq 0 ]] || { echo "Este helper precisa ser chamado pelo sudo autorizado." >&2; exit 77; }

if [[ $# -eq 1 && "$1" == probe-brevo ]]; then
  echo "jbfd-brevo-live-protocol-v1"
  exit 0
fi

if [[ $# -eq 1 && "$1" =~ ^[0-9a-f]{40}$ ]]; then
  export SSH_ORIGINAL_COMMAND="deploy live $1"
  exec /opt/jbfd/bin/jbfd-deploy-vps-gateway.sh live
fi

if [[ $# -ne 1 || "$1" != configure-brevo ]]; then
  echo "Comando Live inválido." >&2
  exit 64
fi

# The Live gateway only sends secrets through stdin. Never accept them as arguments.
IFS= read -r brevo_api_key || { echo "A chave de API Brevo está ausente." >&2; exit 64; }
IFS= read -r brevo_smtp_user || { echo "O login SMTP Brevo está ausente." >&2; exit 64; }
IFS= read -r brevo_smtp_key || { echo "A chave SMTP Brevo está ausente." >&2; exit 64; }
remaining="$(cat)"
brevo_smtp_key+="$remaining"

trim_outer_whitespace() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

brevo_api_key="$(trim_outer_whitespace "$brevo_api_key")"
brevo_smtp_user="$(trim_outer_whitespace "$brevo_smtp_user")"
brevo_smtp_key="$(trim_outer_whitespace "$brevo_smtp_key")"
[[ "$brevo_api_key" =~ ^[[:graph:]]{20,512}$ ]] || { echo "A configuração da API Brevo é inválida." >&2; exit 64; }
[[ "$brevo_smtp_user" =~ ^[[:graph:]]{3,255}$ ]] || { echo "O login SMTP Brevo é inválido." >&2; exit 64; }
[[ "$brevo_smtp_key" =~ ^[[:graph:]]{15,512}$ ]] || { echo "A chave SMTP Brevo é inválida." >&2; exit 64; }

app_env=/opt/jbfd/live/.env
app_root=/opt/jbfd
supabase_root=/opt/jbfd/supabase-live
supabase_env="$supabase_root/.env"
supabase_compose="$supabase_root/docker-compose.yml"
supabase_override="$supabase_root/docker-compose.live.override.yml"
for required_file in "$app_env" "$supabase_env" "$supabase_compose" "$supabase_override"; do
  [[ -f "$required_file" && "$(stat -c '%u:%a' "$required_file")" == "0:600" ]] || {
    echo "A configuração privada Live está ausente ou com permissões inesperadas." >&2
    exit 66
  }
done

current_image="$(awk -F= '$1 == "JBFD_IMAGE" { sub(/^[^=]*=/, ""); print; count++ } END { if (count != 1) exit 1 }' "$app_env")" || {
  echo "A configuração Live do app é inválida." >&2
  exit 65
}
revision="${current_image##*:}"
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo "A imagem Live ativa não contém um SHA válido." >&2; exit 65; }
app_compose="$app_root/releases/$revision/deploy/compose.yml"
[[ -f "$app_compose" ]] || { echo "Os arquivos de deploy da versão ativa de Live não foram encontrados." >&2; exit 66; }

exec 9>"$app_root/releases/.deploy.lock"
flock -n 9 || { echo "Já existe um deploy em andamento." >&2; exit 75; }

app_candidate="$(mktemp "$app_root/live/.env.brevo.XXXXXX")"
smtp_candidate="$(mktemp "$supabase_root/.env.brevo.XXXXXX")"
app_backup="$(mktemp "$app_root/live/.env.backup.XXXXXX")"
smtp_backup="$(mktemp "$supabase_root/.env.backup.XXXXXX")"
cleanup() {
  [[ -z "$app_candidate" ]] || rm -f -- "$app_candidate"
  [[ -z "$smtp_candidate" ]] || rm -f -- "$smtp_candidate"
  [[ -z "$app_backup" ]] || rm -f -- "$app_backup"
  [[ -z "$smtp_backup" ]] || rm -f -- "$smtp_backup"
}
trap cleanup EXIT
cp -p -- "$app_env" "$app_backup"
cp -p -- "$supabase_env" "$smtp_backup"

dotenv_quote() {
  local value="$1" escaped="" char index
  for ((index = 0; index < ${#value}; index++)); do
    char="${value:index:1}"
    case "$char" in
      \\) escaped+="\\\\" ;;
      \' ) escaped+="\\'" ;;
      *) escaped+="$char" ;;
    esac
  done
  printf "'%s'" "$escaped"
}

write_updated_env() {
  local source="$1" destination="$2" pair key value line found
  shift 2
  declare -A updates=()
  declare -A seen=()
  for pair in "$@"; do
    key="${pair%%=*}"
    value="${pair#*=}"
    [[ "$pair" == *=* && -n "$key" ]] || { echo "Chave de ambiente inválida." >&2; return 64; }
    updates["$key"]="$value"
  done
  while IFS= read -r line || [[ -n "$line" ]]; do
    key="${line%%=*}"
    if [[ -v "updates[$key]" ]]; then
      [[ "$line" == *=* ]] || { printf '%s\n' "$line" >> "$destination"; continue; }
      found=$(( ${seen[$key]:-0} + 1 ))
      seen["$key"]="$found"
      [[ "$found" -eq 1 ]] || { echo "A configuração privada Live contém entradas duplicadas." >&2; return 65; }
      printf '%s=%s\n' "$key" "$(dotenv_quote "${updates[$key]}")" >> "$destination"
    else
      printf '%s\n' "$line" >> "$destination"
    fi
  done < "$source"
  for key in "${!updates[@]}"; do
    if [[ -z "${seen[$key]:-}" ]]; then
      printf '%s=%s\n' "$key" "$(dotenv_quote "${updates[$key]}")" >> "$destination"
    fi
  done
  chmod 600 "$destination"
  chown root:root "$destination"
}

write_updated_env "$app_env" "$app_candidate" "BREVO_API_KEY=$brevo_api_key"
write_updated_env "$supabase_env" "$smtp_candidate" \
  SMTP_HOST=smtp-relay.brevo.com \
  SMTP_PORT=587 \
  "SMTP_USER=$brevo_smtp_user" \
  "SMTP_PASS=$brevo_smtp_key" \
  SMTP_ADMIN_EMAIL=suporte@jobforged.com \
  SMTP_SENDER_NAME=JobForged

app_changed=true
cmp -s -- "$app_candidate" "$app_env" && app_changed=false
smtp_changed=true
cmp -s -- "$smtp_candidate" "$supabase_env" && smtp_changed=false
if [[ "$app_changed" == false && "$smtp_changed" == false ]]; then
  unset brevo_api_key brevo_smtp_user brevo_smtp_key remaining
  echo "Brevo já está configurada no app e no Supabase Live."
  exit 0
fi

compose_app() {
  local env_file="$1"
  shift
  (
    cd "$(dirname "$app_compose")"
    APP_ENV=live APP_ORIGIN=jobforged.com JBFD_ENV_FILE="$env_file" \
      docker compose --project-name jbfd-live --env-file "$env_file" -f "$app_compose" "$@"
  )
}
compose_auth() {
  local env_file="$1"
  shift
  (
    cd "$supabase_root"
    docker compose --project-name supabase-live --env-file "$env_file" \
      -f "$supabase_compose" -f "$supabase_override" "$@"
  )
}
compose_app "$app_candidate" config --quiet
compose_auth "$smtp_candidate" config --quiet

mv -f -- "$app_candidate" "$app_env"
app_candidate=""
mv -f -- "$smtp_candidate" "$supabase_env"
smtp_candidate=""
unset brevo_api_key brevo_smtp_user brevo_smtp_key remaining

rollback() {
  mv -f -- "$app_backup" "$app_env"
  app_backup=""
  mv -f -- "$smtp_backup" "$supabase_env"
  smtp_backup=""
  chmod 600 "$app_env" "$supabase_env"
  chown root:root "$app_env" "$supabase_env"
  if [[ "$app_changed" == true ]]; then
    compose_app "$app_env" up -d --no-deps --wait --wait-timeout 120 app >/dev/null 2>&1 || true
  fi
  if [[ "$smtp_changed" == true ]]; then
    compose_auth "$supabase_env" up -d --no-deps --wait --wait-timeout 120 auth >/dev/null 2>&1 || true
  fi
}

if [[ "$smtp_changed" == true ]] && ! compose_auth "$supabase_env" up -d --no-deps --wait --wait-timeout 120 auth >/dev/null 2>&1; then
  rollback
  echo "Não foi possível aplicar SMTP no Supabase Live; a configuração anterior foi restaurada." >&2
  exit 1
fi
if [[ "$app_changed" == true ]] && ! compose_app "$app_env" up -d --no-deps --wait --wait-timeout 120 app >/dev/null 2>&1; then
  rollback
  echo "Não foi possível aplicar Brevo no app Live; a configuração anterior foi restaurada." >&2
  exit 1
fi

echo "Brevo API e SMTP configurados no Live; somente os serviços necessários foram atualizados."

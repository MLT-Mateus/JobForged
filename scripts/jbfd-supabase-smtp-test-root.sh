#!/usr/bin/env bash
set -euo pipefail
umask 077

IFS= read -r brevo_smtp_user || {
  echo "O login SMTP da Brevo está ausente." >&2
  exit 64
}
IFS= read -r brevo_smtp_key || {
  echo "A chave SMTP da Brevo está ausente." >&2
  exit 64
}
[[ "$brevo_smtp_user" =~ ^[[:graph:]]{3,255}$ ]] || {
  echo "O login SMTP da Brevo é inválido." >&2
  exit 64
}
[[ "$brevo_smtp_key" =~ ^[[:graph:]]{20,512}$ ]] || {
  echo "A chave SMTP da Brevo é inválida." >&2
  exit 64
}

stack_dir=/opt/jbfd/supabase
env_file="$stack_dir/.env"
compose_file="$stack_dir/docker-compose.yml"
override_file="$stack_dir/docker-compose.override.yml"
[[ -f "$env_file" && "$(stat -c '%a' "$env_file")" == 600 && "$(stat -c '%u' "$env_file")" == 0 ]] || {
  echo "O .env do Supabase Test precisa existir, pertencer ao root e ter modo 600." >&2
  exit 66
}
[[ -f "$compose_file" && -f "$override_file" ]] || {
  echo "Os arquivos Compose do Supabase Test não foram encontrados." >&2
  exit 66
}

candidate="$(mktemp "$stack_dir/.env.smtp.XXXXXX")"
backup="$(mktemp "$stack_dir/.env.backup.XXXXXX")"
cleanup() {
  [[ -z "$candidate" ]] || rm -f -- "$candidate"
  [[ -z "$backup" ]] || rm -f -- "$backup"
}
trap cleanup EXIT
cp -p -- "$env_file" "$backup"

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

declare -A smtp_values=(
  [SMTP_HOST]=smtp-relay.brevo.com
  [SMTP_PORT]=587
  [SMTP_USER]="$brevo_smtp_user"
  [SMTP_PASS]="$brevo_smtp_key"
  [SMTP_ADMIN_EMAIL]=suporte@jobforged.com
  [SMTP_SENDER_NAME]=JobForged
)
declare -A smtp_seen=()
while IFS= read -r line || [[ -n "$line" ]]; do
  key="${line%%=*}"
  case "$key" in
    SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS|SMTP_ADMIN_EMAIL|SMTP_SENDER_NAME)
      [[ "$line" == *=* ]] || { printf '%s\n' "$line" >> "$candidate"; continue; }
    smtp_seen["$key"]=$(( ${smtp_seen[$key]:-0} + 1 ))
    [[ "${smtp_seen[$key]}" -eq 1 ]] || {
      echo "O .env do Supabase Test contém variáveis SMTP duplicadas." >&2
      exit 65
    }
      printf '%s=%s\n' "$key" "$(dotenv_quote "${smtp_values[$key]}")" >> "$candidate"
      ;;
    *) printf '%s\n' "$line" >> "$candidate" ;;
  esac
done < "$env_file"

for key in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_ADMIN_EMAIL SMTP_SENDER_NAME; do
  if [[ -z "${smtp_seen[$key]:-}" ]]; then
    printf '%s=%s\n' "$key" "$(dotenv_quote "${smtp_values[$key]}")" >> "$candidate"
  fi
done
chmod 600 "$candidate"
chown root:root "$candidate"

compose() {
  (cd "$stack_dir" && docker compose --env-file "$1" -f "$compose_file" -f "$override_file" "${@:2}")
}
compose "$candidate" config --quiet
mv -f -- "$candidate" "$env_file"
candidate=""
unset brevo_smtp_user brevo_smtp_key smtp_values

if ! compose "$env_file" up -d --no-deps --wait --wait-timeout 120 auth >/dev/null 2>&1; then
  mv -f -- "$backup" "$env_file"
  backup=""
  chmod 600 "$env_file"
  chown root:root "$env_file"
  compose "$env_file" up -d --no-deps --wait --wait-timeout 120 auth >/dev/null 2>&1 || true
  echo "Não foi possível aplicar SMTP no Auth Test; a configuração anterior foi restaurada." >&2
  exit 1
fi

echo "SMTP da Brevo configurado no Supabase Auth Test."

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

stack_dir=/opt/jbfd/supabase
env_file="$stack_dir/.env"
compose_file="$stack_dir/docker-compose.yml"
override_file="$stack_dir/docker-compose.override.yml"
template_override_file="$stack_dir/docker-compose.jbfd-email-template.override.yml"
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
template_candidate="$(mktemp "$stack_dir/.compose-template.XXXXXX")"
template_backup=""
template_had_previous=false
cat > "$template_candidate" <<'YAML'
services:
  auth:
    environment:
      GOTRUE_MAILER_TEMPLATES_RECOVERY: https://test.jobforged.com/api/auth/email-templates/password-recovery
      GOTRUE_MAILER_SUBJECTS_RECOVERY: Redefina sua senha na JobForged
      GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://test.jobforged.com/api/auth/email-templates/auth-confirmation
      GOTRUE_MAILER_SUBJECTS_CONFIRMATION: Confirme seu e-mail na JobForged
      GOTRUE_MAILER_TEMPLATES_INVITE: https://test.jobforged.com/api/auth/email-templates/account-invitation
      GOTRUE_MAILER_SUBJECTS_INVITE: Seu convite de acesso à JobForged
YAML
chmod 600 "$template_candidate"
chown root:root "$template_candidate"
cleanup() {
  [[ -z "$candidate" ]] || rm -f -- "$candidate"
  [[ -z "$backup" ]] || rm -f -- "$backup"
  [[ -z "$template_candidate" ]] || rm -f -- "$template_candidate"
  [[ -z "$template_backup" ]] || rm -f -- "$template_backup"
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
  [DISABLE_SIGNUP]=false
  [ENABLE_EMAIL_SIGNUP]=true
  [ENABLE_EMAIL_AUTOCONFIRM]=false
)
declare -A smtp_seen=()
while IFS= read -r line || [[ -n "$line" ]]; do
  key="${line%%=*}"
  case "$key" in
    SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS|SMTP_ADMIN_EMAIL|SMTP_SENDER_NAME|DISABLE_SIGNUP|ENABLE_EMAIL_SIGNUP|ENABLE_EMAIL_AUTOCONFIRM)
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

for key in "${!smtp_values[@]}"; do
  if [[ -z "${smtp_seen[$key]:-}" ]]; then
    printf '%s=%s\n' "$key" "$(dotenv_quote "${smtp_values[$key]}")" >> "$candidate"
  fi
done
chmod 600 "$candidate"
chown root:root "$candidate"

env_changed=true
if cmp -s -- "$candidate" "$env_file"; then
  env_changed=false
fi
template_changed=true
if cmp -s -- "$template_candidate" "$template_override_file"; then
  template_changed=false
fi
if [[ "$template_changed" == true && -f "$template_override_file" ]]; then
  template_backup="$(mktemp "$stack_dir/.compose-template.backup.XXXXXX")"
  cp -p -- "$template_override_file" "$template_backup"
  template_had_previous=true
fi

if [[ "$env_changed" == false && "$template_changed" == false ]]; then
  unset brevo_smtp_user brevo_smtp_key smtp_values
  echo "SMTP e modelo de recuperação do Supabase Auth Test já estão atualizados."
  exit 0
fi

compose() {
  local env_path="$1" template_path="$2"
  shift 2
  local -a compose_args=(--env-file "$env_path" -f "$compose_file" -f "$override_file")
  [[ -z "$template_path" ]] || compose_args+=(-f "$template_path")
  (cd "$stack_dir" && docker compose "${compose_args[@]}" "$@")
}
compose "$candidate" "$template_candidate" config --quiet
compose "$candidate" "$template_candidate" config --format json | python3 -c '
import json, smtplib, ssl, sys
env = json.load(sys.stdin)["services"]["auth"]["environment"]
if env.get("GOTRUE_SMTP_HOST") != "smtp-relay.brevo.com" or str(env.get("GOTRUE_SMTP_PORT")) != "587":
    sys.exit("Servidor SMTP Test inesperado.")
try:
    with smtplib.SMTP("smtp-relay.brevo.com", 587, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.login(env["GOTRUE_SMTP_USER"], env["GOTRUE_SMTP_PASS"])
except Exception as error:
    sys.exit("Falha na verificação SMTP Test: " + type(error).__name__)
print("SMTP Test: TLS e autenticação validados, sem envio de mensagem.")
'
if [[ "$template_changed" == true ]]; then
  mv -f -- "$template_candidate" "$template_override_file"
  template_candidate=""
fi
if [[ "$env_changed" == true ]]; then
  mv -f -- "$candidate" "$env_file"
  candidate=""
else
  rm -f -- "$candidate"
  candidate=""
fi
unset brevo_smtp_user brevo_smtp_key smtp_values

if ! compose "$env_file" "$template_override_file" up -d --no-deps --wait --wait-timeout 120 auth >/dev/null 2>&1; then
  mv -f -- "$backup" "$env_file"
  backup=""
  chmod 600 "$env_file"
  chown root:root "$env_file"
  if [[ "$template_changed" == true ]]; then
    if [[ "$template_had_previous" == true ]]; then
      mv -f -- "$template_backup" "$template_override_file"
      template_backup=""
      chmod 600 "$template_override_file"
      chown root:root "$template_override_file"
    else
      rm -f -- "$template_override_file"
    fi
  fi
  rollback_template_path=""
  [[ -f "$template_override_file" ]] && rollback_template_path="$template_override_file"
  compose "$env_file" "$rollback_template_path" up -d --no-deps --wait --wait-timeout 120 auth >/dev/null 2>&1 || true
  echo "Não foi possível aplicar SMTP/modelo no Auth Test; a configuração anterior foi restaurada." >&2
  exit 1
fi

echo "SMTP da Brevo e template aprovado configurados no Supabase Auth Test."

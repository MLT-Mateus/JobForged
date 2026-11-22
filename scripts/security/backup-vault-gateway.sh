#!/usr/bin/env bash
set -euo pipefail
umask 077
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

environment="${1:-}"
case "$environment" in test|live) ;; *) echo "Ambiente negado" >&2; exit 64 ;; esac
[[ "$(id -u)" -eq 0 ]] || { echo "Root required" >&2; exit 77; }

backup_root=/opt/jbfd/backups/security
security_work=/opt/jbfd/security-work
prepare="$security_work/prepare-offsite-backup.py"

case "${SSH_ORIGINAL_COMMAND:-}" in
  "prepare scheduled")
    [[ "$environment" == test || "$environment" == live ]] || exit 64
    exec python3 "$prepare" --environment "$environment" --scheduled
    ;;
  prepare\ test\ *)
    [[ "$environment" == test ]] || { echo "Ambiente SSH incompatível" >&2; exit 64; }
    revision="${SSH_ORIGINAL_COMMAND#prepare test }"
    [[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo "SHA Test inválido" >&2; exit 64; }
    exec python3 "$prepare" --environment test --revision "$revision"
    ;;
  prepare\ live\ *)
    [[ "$environment" == live ]] || { echo "Ambiente SSH incompatível" >&2; exit 64; }
    revision="${SSH_ORIGINAL_COMMAND#prepare live }"
    [[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo "SHA Live inválido" >&2; exit 64; }
    exec python3 "$prepare" --environment live --revision "$revision"
    ;;
  stream\ *)
    name="${SSH_ORIGINAL_COMMAND#stream }"
    [[ "$name" =~ ^${environment}-[0-9]{8}T[0-9]{6}Z$ ]] || { echo "Backup solicitado inválido" >&2; exit 64; }
    file="$backup_root/$name/offsite.jfenc"
    [[ -f "$file" && ! -L "$file" && "$(stat -c '%u:%a' "$file")" == "0:600" ]] || {
      echo "Arquivo cifrado ausente ou com permissões inseguras" >&2
      exit 66
    }
    cat -- "$file"
    ;;
  receipt\ *)
    read -r _ name encrypted_sha artifact_id extra <<< "${SSH_ORIGINAL_COMMAND:-}"
    [[ -z "${extra:-}" && "$name" =~ ^${environment}-[0-9]{8}T[0-9]{6}Z$ && "$encrypted_sha" =~ ^[a-f0-9]{64}$ && "$artifact_id" =~ ^[0-9]{1,20}$ ]] || {
      echo "Recibo inválido" >&2
      exit 64
    }
    folder="$backup_root/$name"
    metadata="$folder/offsite-metadata.json"
    archive="$folder/offsite.tar"
    encrypted="$folder/offsite.jfenc"
    [[ -f "$metadata" && ! -L "$metadata" && -f "$archive" && ! -L "$archive" && -f "$encrypted" && ! -L "$encrypted" ]] || { echo "Pacote do backup ausente" >&2; exit 66; }
    [[ "$(stat -c '%u:%a' "$metadata")" == "0:600" && "$(stat -c '%u:%a' "$archive")" == "0:600" && "$(stat -c '%u:%a' "$encrypted")" == "0:600" ]] || { echo "Pacote com permissões inseguras" >&2; exit 77; }
    expected="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["encrypted_sha256"])' "$metadata")"
    [[ "$expected" == "$encrypted_sha" ]] || { echo "Hash cifrado não corresponde ao preparo" >&2; exit 65; }
    python3 "$security_work/record-vault-offsite-copy.py" "$name" \
      "$(sha256sum -- "$archive" | cut -d ' ' -f 1)" "$encrypted_sha" "$artifact_id"
    if [[ "$environment" == live ]]; then
      python3 - "$metadata" "$name" <<'PY'
import json, os, pathlib, sys, tempfile
meta=json.loads(pathlib.Path(sys.argv[1]).read_text())
revision=meta.get('revision')
if not revision:
    raise SystemExit('Approved Live revision missing from backup metadata')
approval=pathlib.Path('/opt/jbfd/security-work/live-release-approval.json')
data=json.loads(approval.read_text())
if data.get('environment')!='live' or data.get('revision')!=revision or data.get('approved') is not True:
    raise SystemExit('Live approval changed while the backup ran')
data['backup']=sys.argv[2]
fd,tmp=tempfile.mkstemp(prefix='.live-release-approval.',dir=approval.parent)
try:
    with os.fdopen(fd,'w') as stream:json.dump(data,stream,sort_keys=True)
    os.chmod(tmp,0o600)
    os.replace(tmp,approval)
finally:
    pathlib.Path(tmp).unlink(missing_ok=True)
PY
    fi
    rm -f -- "$archive"
    printf '{"environment":"%s","backup":"%s","artifact_id":"%s","receipt":"recorded"}\n' "$environment" "$name" "$artifact_id"
    ;;
  *)
    echo "Comando de backup negado" >&2
    exit 64
    ;;
esac

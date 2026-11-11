#!/usr/bin/env python3
"""Create, isolate-restore, package, and recipient-encrypt one environment backup."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tarfile

ROOT = Path('/opt/jbfd')
BACKUP_ROOT = Path('/opt/jbfd/backups/security')
KEY_ROOT = Path('/opt/jbfd/security-work/backup-keys')
FILES = ('postgres.sql.gz', 'storage.tar.gz', 'objects.private.json', 'recovery.json', 'infrastructure-audit.jsonl')
CHECKSUM_FILES = set(FILES) - {'recovery.json'}


def private_regular(path: Path) -> None:
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o077:
        raise ValueError('Root-owned private backup file required')


def sha256(path: Path) -> str:
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def build(environment: str, revision: str | None, scheduled: bool) -> dict:
    if os.geteuid() != 0:
        raise SystemExit('Root required')
    os.umask(0o077)
    if not scheduled and not re.fullmatch(r'[0-9a-f]{40}', revision or ''):
        raise ValueError('Deployment backup requires a full revision')
    if environment == 'test':
        drill = Path('/opt/jbfd/security-work/test-recovery-drill.py')
        command = ['python3', str(drill), '--environment', 'test']
    else:
        if not re.fullmatch(r'[0-9a-f]{40}', revision or ''):
            raise ValueError('Live backup requires a full approved revision')
        drill = Path('/opt/jbfd/security-work/live-tools/test-recovery-drill.py')
        command = ['python3', str(drill), '--environment', 'live']
        if scheduled:
            command.append('--scheduled')
        else:
            command.extend([
                '--revision', revision,
                '--authorization', '/opt/jbfd/security-work/live-release-approval.json',
            ])
    if scheduled and environment == 'test':
        command.append('--scheduled')

    result = subprocess.run(command, capture_output=True, text=True, timeout=180)
    if result.returncode:
        raise RuntimeError('Isolated backup recovery drill failed')
    evidence = json.loads(result.stdout.strip().splitlines()[-1])
    if evidence.get('environment') != environment or evidence.get('counts_match') is not True or evidence.get('network') != 'none' or evidence.get('ports') != []:
        raise ValueError('Isolated restoration evidence is incomplete')
    backup = Path(evidence.get('backup', ''))
    if backup.parent != BACKUP_ROOT or not re.fullmatch(environment + r'-[0-9]{8}T[0-9]{6}Z', backup.name):
        raise ValueError('Recovery drill returned an unexpected backup path')
    stamp = datetime.datetime.strptime(backup.name, environment + '-%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
    now = datetime.datetime.now(datetime.timezone.utc)
    if not datetime.timedelta(0) <= now - stamp <= datetime.timedelta(minutes=5):
        raise ValueError('Fresh recovery drill evidence required')

    recovery = backup / 'recovery.json'
    private_regular(recovery)
    recovery_bytes = recovery.read_bytes()
    details = json.loads(recovery_bytes)
    if details.get('environment') != environment or details.get('counts_match') is not True or details.get('network') != 'none' or details.get('ports') != []:
        raise ValueError('Recovery evidence does not match the target environment')
    checksums = details.get('checksums')
    if not isinstance(checksums, dict) or set(checksums) != CHECKSUM_FILES:
        raise ValueError('Complete database and object evidence required')
    for name in FILES:
        source = backup / name
        private_regular(source)
        if name in checksums and sha256(source) != checksums[name]:
            raise ValueError('Backup component checksum mismatch')

    archive = backup / 'offsite.tar'
    encrypted = backup / 'offsite.jfenc'
    if archive.exists() or encrypted.exists():
        raise ValueError('Backup destination already exists')
    with tarfile.open(archive, 'x') as bundle:
        for name in FILES:
            bundle.add(backup / name, arcname=name, recursive=False)
    os.chmod(archive, 0o600)
    public_key = KEY_ROOT / (environment + '-public.pem')
    private_regular(public_key)
    crypto = Path(__file__).with_name('encrypt-offsite-backup.py')
    self_test = subprocess.run(
        ['python3', str(crypto), '--self-test'],
        capture_output=True, text=True, timeout=120,
    )
    if self_test.returncode:
        raise RuntimeError('Backup encryption self-test failed')
    encrypted_result = subprocess.run(
        ['python3', str(crypto), 'encrypt', str(archive), str(encrypted), str(public_key)],
        capture_output=True, text=True, timeout=120,
    )
    if encrypted_result.returncode:
        archive.unlink(missing_ok=True)
        encrypted.unlink(missing_ok=True)
        raise RuntimeError('Recipient encryption failed')
    cipher_evidence = json.loads(encrypted_result.stdout.strip().splitlines()[-1])
    archive_hash = sha256(archive)
    if cipher_evidence.get('archive_sha256') != archive_hash or cipher_evidence.get('format') != 'JFBENC01':
        archive.unlink(missing_ok=True)
        encrypted.unlink(missing_ok=True)
        raise ValueError('Encrypted archive integrity mismatch')

    metadata = {
        'environment': environment,
        'backup': backup.name,
        'revision': revision,
        'scheduled': scheduled,
        'prepared_at': now.isoformat(),
        'recovery_sha256': hashlib.sha256(recovery_bytes).hexdigest(),
        'archive_sha256': archive_hash,
        'encrypted_sha256': cipher_evidence['encrypted_sha256'],
        'archive_bytes': cipher_evidence['bytes'],
        'encrypted_bytes': cipher_evidence['encrypted_bytes'],
    }
    metadata_path = backup / 'offsite-metadata.json'
    metadata_path.write_text(json.dumps(metadata, sort_keys=True), encoding='utf-8')
    os.chmod(metadata_path, 0o600)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--environment', choices=('test', 'live'), required=True)
    parser.add_argument('--revision')
    parser.add_argument('--scheduled', action='store_true')
    args = parser.parse_args()
    if args.scheduled and args.revision:
        raise SystemExit('Scheduled backup cannot carry a deployment revision')
    print(json.dumps(build(args.environment, args.revision, args.scheduled), sort_keys=True))


if __name__ == '__main__':
    main()

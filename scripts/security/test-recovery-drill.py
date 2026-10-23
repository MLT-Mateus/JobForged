#!/usr/bin/env python3
"""Test-only consistent backup and isolated PostgreSQL restore. Run as VPS root.

No Live resources, published ports, external network, or restored Auth services.
Never print dump contents, role passwords, object names, or customer records.
"""
import datetime
import argparse
import fcntl
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import time


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def sql(container, statement):
    result = run(['docker', 'exec', container, 'psql', '-XqAt', '-U',
                  'supabase_admin' if container.startswith('jbfd-security-restore-') else 'postgres',
                  '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement],
                 capture_output=True, text=True)
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--keep-restore', action='store_true', help='Keep isolated database for additional acceptance tests')
    options = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit('VPS root required')
    os.umask(0o077)
    lock = open('/opt/jbfd/security-work/test-backup.lock', 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit('Another Test backup is already running')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    folder = Path('/opt/jbfd/backups/security') / ('test-' + stamp)
    folder.mkdir(parents=True, mode=0o700, exist_ok=False)
    services = ['jbfd-test-app-1', 'supabase-envoy', 'supabase-studio',
                'supabase-auth', 'supabase-rest', 'supabase-storage',
                'supabase-edge-functions', 'realtime-dev.supabase-realtime',
                'supabase-pooler', 'supabase-meta']
    active = []
    started = time.monotonic()
    for name in services:
        state = run(['docker', 'inspect', '--format', '{{.State.Running}}', name],
                    capture_output=True, text=True)
        if state.stdout.strip() == 'true':
            active.append(name)
    try:
        # Gracefully close writers, not pause in-flight transactions.
        run(['docker', 'stop', '-t', '15', *active], stdout=subprocess.DEVNULL)
        with gzip.open(folder / 'postgres.sql.gz', 'wb') as output:
            result = subprocess.Popen(['docker', 'exec', '-u', 'postgres', 'supabase-db',
                                       'pg_dumpall', '-U', 'postgres'], stdout=subprocess.PIPE)
            assert result.stdout is not None
            while chunk := result.stdout.read(1024 * 1024):
                output.write(chunk)
            if result.wait() != 0:
                raise RuntimeError('Database backup failed')
        with tarfile.open(folder / 'storage.tar.gz', 'w:gz') as archive:
            archive.add('/opt/jbfd/supabase/volumes/storage', arcname='storage')
        schema_fingerprint = sql('supabase-db', "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage','app_private') AND c.relkind IN ('r','p');")
        counts = sql('supabase-db', "SELECT json_build_object('users',(SELECT count(*) FROM auth.users),'companies',(SELECT count(*) FROM public.companies),'members',(SELECT count(*) FROM public.company_members),'objects',(SELECT count(*) FROM storage.objects),'migrations',(SELECT count(*) FROM public.jbfd_schema_migrations));")
        # Manifest checks include immutable object metadata, not customer content.
        objects = sql('supabase-db', "SELECT coalesce(json_agg(x),'[]') FROM (SELECT bucket_id,name,coalesce(metadata->>'size','0') AS size FROM storage.objects ORDER BY bucket_id,name)x;")
        (folder / 'objects.private.json').write_text(objects, encoding='utf-8')
        audit=Path('/opt/jbfd/security-work/admin-factor-recovery.jsonl')
        (folder/'infrastructure-audit.jsonl').write_bytes(audit.read_bytes() if audit.exists() else b'')
    finally:
        # Always return previously-running Test writers; never start Live resources.
        run(['docker', 'start', *active], stdout=subprocess.DEVNULL)
    downtime = round(time.monotonic() - started, 2)
    restore = 'jbfd-security-restore-' + stamp.lower()
    image = run(['docker', 'inspect', '--format', '{{.Image}}', 'supabase-db'],
                capture_output=True, text=True).stdout.strip()
    run(['docker', 'run', '-d', '--name', restore, '--label', 'jbfd.security.disposable=true',
         '--network', 'none', '--memory', '768m', '--cpus', '0.75', '--user', 'postgres',
         '--entrypoint', 'bash', image, '-ec',
         "if [ ! -f /tmp/jbfd-restore/PG_VERSION ]; then initdb -D /tmp/jbfd-restore -U supabase_admin --auth-local=trust --auth-host=reject >/tmp/init.log; printf \"listen_addresses = ''\\n\" >> /tmp/jbfd-restore/postgresql.conf; fi; exec postgres -D /tmp/jbfd-restore -c unix_socket_directories=/tmp -c shared_buffers=64MB -c max_connections=30 -c shared_preload_libraries=pg_net,pg_cron,pg_stat_statements -c cron.launch_active_jobs=off"],
        stdout=subprocess.DEVNULL)
    for _ in range(60):
        ready = subprocess.run(['docker', 'exec', restore, 'pg_isready', '-h', '/tmp',
                                '-U', 'supabase_admin'], capture_output=True)
        if ready.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError('Isolated database did not become ready')
    # Capture restore diagnostics privately, not in terminal/CI.
    with gzip.open(folder / 'postgres.sql.gz', 'rb') as source, (folder / 'restore.private.log').open('wb') as log:
        process = subprocess.Popen(['docker', 'exec', '-i', restore, 'psql', '-h', '/tmp',
                                    '-Xq', '-U', 'supabase_admin', '-d', 'postgres',
                                    '-v', 'ON_ERROR_STOP=1'], stdin=subprocess.PIPE,
                                   stdout=log, stderr=log)
        assert process.stdin is not None
        try:
            for line in source:
                # pg_dumpall includes its source bootstrap role. The isolated
                # cluster already has this same superuser; preserve ALTER ROLE.
                if line.strip() != b'CREATE ROLE supabase_admin;':
                    process.stdin.write(line)
            process.stdin.close()
        except BrokenPipeError:
            pass
        if process.wait() != 0:
            raise RuntimeError('Restore failed; inspect private diagnostic on VPS')
    # Isolated server socket is /tmp. No TCP network exists.
    def restored(statement):
        return run(['docker', 'exec', restore, 'psql', '-h', '/tmp', '-XqAt', '-U',
                    'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement],
                   capture_output=True, text=True).stdout.strip()
    restored_counts = restored("SELECT json_build_object('users',(SELECT count(*) FROM auth.users),'companies',(SELECT count(*) FROM public.companies),'members',(SELECT count(*) FROM public.company_members),'objects',(SELECT count(*) FROM storage.objects),'migrations',(SELECT count(*) FROM public.jbfd_schema_migrations));")
    if json.loads(counts) != json.loads(restored_counts):
        raise RuntimeError('Restored record counts do not match backup')
    if restored("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage','app_private') AND c.relkind IN ('r','p');") != schema_fingerprint:
        raise RuntimeError('Restored schema count mismatch')
    restored_objects = json.loads(restored("SELECT coalesce(json_agg(x),'[]') FROM (SELECT bucket_id,name,coalesce(metadata->>'size','0') AS size FROM storage.objects ORDER BY bucket_id,name)x;"))
    if restored_objects != json.loads(objects):
        raise RuntimeError('Restored storage metadata differs')
    # Extract only into this new private drill folder; never trust traversal paths.
    extracted = folder / 'restored-files'
    extracted.mkdir(mode=0o700)
    with tarfile.open(folder / 'storage.tar.gz') as archive:
        archive.extractall(extracted, filter='data')
    verified = 0
    for obj in restored_objects:
        # Storage file backend: stub/tenant/bucket/object[/version]. Search below
        # bucket/object; accept its original or versioned representation.
        suffix = '/' + obj['bucket_id'] + '/' + obj['name']
        candidates = [f for f in extracted.rglob('*') if f.is_file() and
                      (str(f).endswith(suffix) or suffix + '/' in str(f))]
        if not candidates or not any(f.stat().st_size == int(obj['size']) for f in candidates):
            raise RuntimeError('Storage object missing or wrong size in restored files')
        verified += 1
    # Comparing archive extraction bytes to original files while no delete/overwrite
    # operation is performed; hashes prove the restored archive content is intact.
    files_verified = 0
    for f in extracted.rglob('*'):
        if f.is_file():
            original = Path('/opt/jbfd/supabase/volumes/storage') / f.relative_to(extracted / 'storage')
            if original.exists() and hashlib.sha256(f.read_bytes()).digest() != hashlib.sha256(original.read_bytes()).digest():
                raise RuntimeError('Restored file hash differs')
            files_verified += 1
    checksums = {name: hashlib.sha256((folder / name).read_bytes()).hexdigest()
                 for name in ['postgres.sql.gz', 'storage.tar.gz', 'objects.private.json','infrastructure-audit.jsonl']}
    evidence = {'environment': 'test', 'backup': str(folder), 'restore_container': restore,
                'network': 'none', 'ports': [], 'counts_match': True,
                'storage_objects_verified': verified, 'files_verified': files_verified,
                'writer_downtime_seconds': downtime,
                'total_seconds': round(time.monotonic() - started, 2), 'checksums': checksums}
    (folder / 'recovery.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
    if not options.keep_restore:
        # Only the exact container created by this invocation, never shared services.
        run(['docker', 'rm', '-f', restore], stdout=subprocess.DEVNULL)
    print(json.dumps(evidence))


if __name__ == '__main__':
    main()

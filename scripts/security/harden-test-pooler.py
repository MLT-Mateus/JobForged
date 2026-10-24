#!/usr/bin/env python3
"""Test-only loopback binding; retain root SSH as the recovery path."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import time

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

def inspect(name):
    return json.loads(run(['docker', 'inspect', name]))[0]

def main():
    root = Path('/opt/jbfd/supabase')
    path = root / 'docker-compose.yml'
    before_live = inspect('supabase-live-pooler')['HostConfig']['PortBindings']
    test = inspect('supabase-pooler')
    expected = '/opt/jbfd/supabase/docker-compose.yml,/opt/jbfd/supabase/docker-compose.override.yml'
    if test['Config']['Labels'].get('com.docker.compose.project.config_files') != expected:
        raise RuntimeError('Unexpected Test compose identity')
    original = path.read_text()
    updated = original
    for old, new in [('${POSTGRES_PORT}:5432', '127.0.0.1:${POSTGRES_PORT}:5432'),
                     ('${POOLER_PROXY_PORT_TRANSACTION}:6543', '127.0.0.1:${POOLER_PROXY_PORT_TRANSACTION}:6543')]:
        if new not in updated:
            if updated.count(old) != 1:
                raise RuntimeError('Unexpected pooler port configuration')
            updated = updated.replace(old, new)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path('/opt/jbfd/security-work') / ('test-compose-before-pooler-' + stamp)
    backup.write_text(original)
    backup.chmod(0o600)
    compose = ['docker', 'compose', '--project-directory', str(root), '-f', str(path), '-f', str(root/'docker-compose.override.yml')]
    try:
        path.write_text(updated)
        run(compose + ['config', '--quiet'])
        run(compose + ['up', '-d', '--no-deps', 'supavisor'])
        for _ in range(60):
            state = inspect('supabase-pooler')['State']
            if state.get('Health', {}).get('Status') == 'healthy':
                break
            time.sleep(1)
        else:
            raise RuntimeError('Test pooler failed its healthcheck')
        bindings = inspect('supabase-pooler')['HostConfig']['PortBindings']
        if any(b['HostIp'] != '127.0.0.1' for group in bindings.values() for b in group):
            raise RuntimeError('Test pooler still globally bound')
        if inspect('supabase-live-pooler')['HostConfig']['PortBindings'] != before_live:
            raise RuntimeError('Live port bindings unexpectedly changed')
        print(json.dumps({'environment':'test','bindings':bindings,'live_unchanged':True,
                          'configuration_sha256':hashlib.sha256(updated.encode()).hexdigest(),'rollback_file':str(backup)}))
    except Exception:
        path.write_text(original)
        run(compose + ['up', '-d', '--no-deps', 'supavisor'])
        raise

if __name__ == '__main__':
    main()

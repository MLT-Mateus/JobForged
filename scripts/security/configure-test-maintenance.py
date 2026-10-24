#!/usr/bin/env python3
"""Versioned, Test-only bounded orphan worker. Root SSH remains recovery path."""
import json
import os
from pathlib import Path
import shutil
import subprocess

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()

def main():
    if os.geteuid()!=0:raise SystemExit('Root required')
    os.umask(0o077)
    release=Path(__file__).resolve().parents[2]
    if str(release.parent)!='/opt/jbfd/releases':raise SystemExit('Versioned release required')
    run(['bash',str(release/'scripts/supabase-migrate.sh'),'test','--check'])
    target=Path('/opt/jbfd/security-work/record-offsite-copy.py')
    shutil.copyfile(release/'scripts/security/record-offsite-copy.py',target);target.chmod(0o600)
    service='''[Unit]
Description=JobForged Test verified orphan quarantine
After=docker.service
Requires=docker.service
[Service]
Type=oneshot
User=root
UMask=0077
ExecStart=/usr/bin/python3 {worker}
TimeoutStartSec=180
MemoryMax=192M
CPUQuota=20%
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/jbfd/security-work
PrivateTmp=true
'''.format(worker=release/'scripts/security/quarantine-test-orphans.py')
    timer='''[Unit]
Description=JobForged Test hourly bounded orphan maintenance
[Timer]
OnCalendar=hourly
RandomizedDelaySec=300
Persistent=true
Unit=jbfd-test-orphan-maintenance.service
[Install]
WantedBy=timers.target
'''
    Path('/etc/systemd/system/jbfd-test-orphan-maintenance.service').write_text(service)
    Path('/etc/systemd/system/jbfd-test-orphan-maintenance.timer').write_text(timer)
    run(['systemd-analyze','verify','/etc/systemd/system/jbfd-test-orphan-maintenance.service','/etc/systemd/system/jbfd-test-orphan-maintenance.timer'])
    run(['systemctl','daemon-reload']);run(['systemctl','enable','--now','jbfd-test-orphan-maintenance.timer'])
    print(json.dumps({'environment':'test','timer':'jbfd-test-orphan-maintenance.timer','maximum_files_per_run':20,'abandoned_grace_hours':24,'quarantine_days':7,'purge_requires_recent_verified_offsite_copy':True}))

if __name__=='__main__':main()

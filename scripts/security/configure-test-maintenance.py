#!/usr/bin/env python3
"""Versioned, Test-only bounded orphan worker. Root SSH remains recovery path."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from environment_profiles import Environment, authorize_live

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--environment',choices=['test','live'],default='test');parser.add_argument('--authorization');options=parser.parse_args()
    environment=Environment(options.environment)
    if os.geteuid()!=0:raise SystemExit('Root required')
    os.umask(0o077)
    release=Path(__file__).resolve().parents[2]
    if str(release.parent)!='/opt/jbfd/releases':raise SystemExit('Versioned release required')
    revision=run(['git','-C',str(release),'rev-parse','HEAD'])
    authorize_live(environment,revision,options.authorization)
    run(['bash',str(release/'scripts/supabase-migrate.sh'),environment.name,'--check'])
    if environment.name=='live':
        approval=json.loads(Path(options.authorization).read_text())
        record={'environment':'live','revision':revision,'scopes':['consistent-backup','bounded-orphan-maintenance'],'approval_reference':approval['approval_reference']}
        Path('/opt/jbfd/security-work/live-maintenance-approved.json').write_text(json.dumps(record))
    tools=Path('/opt/jbfd/security-work')/('live-tools' if environment.name=='live' else '')
    tools.mkdir(mode=0o700,exist_ok=True)
    target=tools/'record-offsite-copy.py'
    shutil.copyfile(release/'scripts/security/record-offsite-copy.py',target);target.chmod(0o600)
    for name in ['test-recovery-drill.py','recovery_drill.py','environment_profiles.py']:
        backup_tool=tools/name
        shutil.copyfile(release/'scripts/security'/name,backup_tool);backup_tool.chmod(0o600)
    service='''[Unit]
Description=JobForged Test verified orphan quarantine
After=docker.service
Requires=docker.service
[Service]
Type=oneshot
User=root
UMask=0077
ExecStart=/usr/bin/python3 {worker} --environment {environment} --revision {revision}
TimeoutStartSec=180
MemoryMax=192M
CPUQuota=20%
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/jbfd/security-work
PrivateTmp=true
'''.format(worker=release/'scripts/security/quarantine-test-orphans.py',environment=environment.name,revision=revision)
    service=service.replace('JobForged Test','JobForged '+environment.name)
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
    timer=timer.replace('JobForged Test','JobForged '+environment.name).replace('jbfd-test-', 'jbfd-'+environment.name+'-')
    service_path='/etc/systemd/system/jbfd-'+environment.name+'-orphan-maintenance.service'
    timer_path='/etc/systemd/system/jbfd-'+environment.name+'-orphan-maintenance.timer'
    Path(service_path).write_text(service)
    Path(timer_path).write_text(timer)
    run(['systemd-analyze','verify',service_path,timer_path])
    run(['systemctl','daemon-reload']);run(['systemctl','enable','--now','jbfd-'+environment.name+'-orphan-maintenance.timer'])
    print(json.dumps({'environment':environment.name,'timer':'jbfd-'+environment.name+'-orphan-maintenance.timer','maximum_files_per_run':20,'abandoned_grace_hours':24,'quarantine_days':7,'purge_requires_recent_verified_offsite_copy':True}))

if __name__=='__main__':main()

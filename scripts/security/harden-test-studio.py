#!/usr/bin/env python3
"""Keep HTTPS + Basic Auth; require the SSH tunnel/host path for Test Studio."""
import argparse
import datetime
import ipaddress
import json
from pathlib import Path
import subprocess
import time
import os
import yaml
from environment_profiles import Environment, authorize_live, private_studio_override

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()

def status(local=False,live=False):
    host='supabase.jobforged.com' if live else 'test.supabase.jobforged.com'
    command=['curl','-sS','-o','/dev/null','-w','%{http_code}','--max-time','10']
    if local:command+=['--resolve',host+':443:127.0.0.1']
    return run(command+['https://'+host])

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--environment',choices=['test','live'],default='test');parser.add_argument('--authorization');options=parser.parse_args()
    environment=Environment(options.environment)
    if os.geteuid()!=0:raise SystemExit('Root required')
    os.umask(0o077)
    revision=run(['git','-C',str(Path(__file__).resolve().parents[2]),'rev-parse','HEAD'])
    authorize_live(environment,revision,options.authorization)
    root=environment.stack;path=root/environment.override;original=path.read_text()
    traefik=json.loads(run(['docker','inspect','jobforged_traefik']))[0]
    gateway=traefik['NetworkSettings']['Networks']['jobforged_jobforged_network']['Gateway']
    before_peer=status(live=environment.peer.name=='live')
    document=yaml.safe_load(original);updated=private_studio_override(document,environment,gateway)
    if document==updated:
        print(json.dumps({'environment':environment.name,'studio':'existing allowlist and BasicAuth preserved'}));return
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path('/opt/jbfd/security-work')/(environment.name+'-studio-before-private-'+stamp);backup.write_text(original);backup.chmod(0o600)
    info=json.loads(run(['docker','inspect',environment.prefix+'-studio']))[0]
    files=info['Config']['Labels']['com.docker.compose.project.config_files'].split(',')
    allowed=[str(root/name) for name in ['docker-compose.yml',environment.override,'docker-compose.security.override.yml','docker-compose.jbfd-email-template.override.yml']]
    if any(file not in allowed for file in files) or str(path) not in files:raise SystemExit('Unexpected Studio compose identity')
    compose=['docker','compose','--project-directory',str(root)]
    for file in files:compose+=['-f',file]
    try:
        path.write_text(json.dumps(updated,indent=2)+'\n')
        run(compose+['config','--quiet']);run(compose+['up','-d','--no-deps','--wait','--wait-timeout','90','studio'])
        if status(local=True,live=environment.name=='live')!='401':raise RuntimeError('SSH tunnel HTTPS/BasicAuth path failed')
        if status(live=environment.peer.name=='live')!=before_peer:raise RuntimeError('Peer Studio response unexpectedly changed')
        print(json.dumps({'environment':environment.name,'local_https_basic_auth':401,environment.peer.name+'_studio_unchanged':True,'rollback_file':str(backup)}))
    except Exception:
        path.write_text(original);run(compose+['up','-d','--no-deps','studio']);raise

if __name__=='__main__':main()

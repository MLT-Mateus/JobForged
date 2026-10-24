#!/usr/bin/env python3
"""Move only Test to a dedicated ingress network; Traefik is not restarted.

Live attachments, ports, images and container identities must remain identical.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import yaml

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()

def inspect(name):return json.loads(run(['docker','inspect',name]))[0]

def live_state():
    result={}
    for name in ['jbfd-live-app-1','supabase-live-envoy','supabase-live-auth','supabase-live-storage','supabase-live-db','supabase-live-pooler']:
        v=inspect(name);result[name]={'id':v['Id'],'image':v['Image'],'networks':v['NetworkSettings']['Networks'],'ports':v['HostConfig']['PortBindings']}
    return result

def main():
    if os.geteuid()!=0:raise SystemExit('Root required')
    os.umask(0o077)
    before=live_state();traefik=inspect('jobforged_traefik')['Id'];network='jbfd-test-ingress'
    root=Path('/opt/jbfd/supabase');path=root/'docker-compose.override.yml';app=Path('/opt/jbfd/test/.env')
    original=path.read_text();old_app=app.read_text();document=yaml.safe_load(original)
    if document['networks']['traefik']['name'] not in ['jobforged_jobforged_network',network]:raise SystemExit('Unexpected Test network')
    document['networks']['traefik']['name']=network
    for service in ['studio','api-gw']:
        labels=document['services'][service]['labels']
        if isinstance(labels,list):labels=dict(value.split('=',1) for value in labels)
        labels['traefik.docker.network']=network;document['services'][service]['labels']=labels
    if subprocess.run(['docker','network','inspect',network],capture_output=True).returncode:
        run(['docker','network','create','--label','jbfd.environment=test',network])
    if network not in inspect('jobforged_traefik')['NetworkSettings']['Networks']:
        run(['docker','network','connect',network,'jobforged_traefik'])
    updated=json.dumps(document,indent=2)+'\n'
    lines=old_app.splitlines()
    if sum(line.startswith('JBFD_DOCKER_NETWORK=') for line in lines)!=1:raise SystemExit('Unique Test ingress setting required')
    new_app='\n'.join('JBFD_DOCKER_NETWORK='+network if line.startswith('JBFD_DOCKER_NETWORK=') else line for line in lines)+'\n'
    if original==updated and old_app==new_app:
        if live_state()!=before or inspect('jobforged_traefik')['Id']!=traefik:raise RuntimeError('Shared environment changed')
        print(json.dumps({'environment':'test','ingress':network,'live_unchanged':True,'traefik_not_restarted':True}));return
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path('/opt/jbfd/security-work')/('test-ingress-before-'+stamp);backup.mkdir(mode=0o700)
    (backup/'compose.override').write_text(original);(backup/'app.env').write_text(old_app)
    files=[root/'docker-compose.yml',path]
    for name in ['docker-compose.jbfd-email-template.override.yml','docker-compose.security.override.yml']:
        if (root/name).exists():files.append(root/name)
    command=['docker','compose','--project-directory',str(root)]
    for file in files:command+=['-f',str(file)]
    try:
        path.write_text(updated);app.write_text(new_app)
        run(command+['config','--quiet']);run(command+['up','-d','--no-deps','--wait','--wait-timeout','120','api-gw','studio'])
        for name in ['supabase-envoy','supabase-studio']:
            networks=inspect(name)['NetworkSettings']['Networks']
            if network not in networks or 'jobforged_jobforged_network' in networks:raise RuntimeError('Test service still on shared ingress')
        if live_state()!=before or inspect('jobforged_traefik')['Id']!=traefik:raise RuntimeError('Shared environment changed')
        print(json.dumps({'environment':'test','ingress':network,'live_unchanged':True,'traefik_not_restarted':True,'rollback_directory':str(backup),'override_sha256':hashlib.sha256(updated.encode()).hexdigest()}))
    except Exception:
        path.write_text(original);app.write_text(old_app)
        run(command+['up','-d','--no-deps','--wait','--wait-timeout','120','api-gw','studio'])
        raise SystemExit('Test ingress setup failed; previous Test attachments restored')

if __name__=='__main__':main()

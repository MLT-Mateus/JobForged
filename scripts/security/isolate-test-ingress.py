#!/usr/bin/env python3
"""Move only Test to a dedicated ingress network; Traefik is not restarted.

Peer attachments, ports, images and container identities must remain identical.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import compose_yaml
from environment_profiles import Environment, authorize_live, native_compose

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()

def inspect(name):return json.loads(run(['docker','inspect',name]))[0]

def live_state(environment):
    result={}
    for name in [environment.app,environment.envoy,environment.auth,environment.storage,environment.database,environment.prefix+'-pooler']:
        v=inspect(name);result[name]={'id':v['Id'],'image':v['Image'],'networks':v['NetworkSettings']['Networks'],'ports':v['HostConfig']['PortBindings']}
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--environment',choices=['test','live'],default='test');parser.add_argument('--authorization');options=parser.parse_args()
    environment=Environment(options.environment)
    if inspect(environment.envoy)['Config']['Labels'].get('com.docker.compose.project')!=environment.native_project:raise SystemExit('Unexpected native Compose project')
    if os.geteuid()!=0:raise SystemExit('Root required')
    revision=run(['git','-C',str(Path(__file__).resolve().parents[2]),'rev-parse','HEAD'])
    authorize_live(environment,revision,options.authorization)
    os.umask(0o077)
    before=live_state(environment.peer);traefik=inspect('jobforged_traefik')['Id'];network=environment.ingress
    root=environment.stack;path=root/environment.override;app=environment.app_env
    original=path.read_text();old_app=app.read_text();document=compose_yaml.load(original)
    if document['networks']['traefik']['name'] not in ['jobforged_jobforged_network',network]:raise SystemExit('Unexpected Test network')
    document['networks']['traefik']['name']=network
    for service in ['studio','api-gw']:
        labels=document['services'][service]['labels']
        if isinstance(labels,list):labels=dict(value.split('=',1) for value in labels)
        labels['traefik.docker.network']=network;document['services'][service]['labels']=labels
    if subprocess.run(['docker','network','inspect',network],capture_output=True).returncode:
        run(['docker','network','create','--label','jbfd.environment='+environment.name,network])
    if network not in inspect('jobforged_traefik')['NetworkSettings']['Networks']:
        run(['docker','network','connect',network,'jobforged_traefik'])
    updated=compose_yaml.dump(document)
    lines=old_app.splitlines()
    if sum(line.startswith('JBFD_DOCKER_NETWORK=') for line in lines)!=1:raise SystemExit('Unique Test ingress setting required')
    new_app='\n'.join('JBFD_DOCKER_NETWORK='+network if line.startswith('JBFD_DOCKER_NETWORK=') else line for line in lines)+'\n'
    if original==updated and old_app==new_app:
        if live_state(environment.peer)!=before or inspect('jobforged_traefik')['Id']!=traefik:raise RuntimeError('Shared environment changed')
        print(json.dumps({'environment':environment.name,'ingress':network,environment.peer.name+'_unchanged':True,'traefik_not_restarted':True}));return
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path('/opt/jbfd/security-work')/(environment.name+'-ingress-before-'+stamp);backup.mkdir(mode=0o700)
    (backup/'compose.override').write_text(original);(backup/'app.env').write_text(old_app)
    files=[root/'docker-compose.yml',path]
    for name in ['docker-compose.jbfd-email-template.override.yml','docker-compose.security.override.yml']:
        if (root/name).exists():files.append(root/name)
    command=native_compose(environment)
    for file in files:command+=['-f',str(file)]
    try:
        path.write_text(updated);app.write_text(new_app)
        run(command+['config','--quiet']);run(command+['up','-d','--no-deps','--wait','--wait-timeout','120','api-gw','studio'])
        for name in [environment.envoy,environment.prefix+'-studio']:
            networks=inspect(name)['NetworkSettings']['Networks']
            if network not in networks or 'jobforged_jobforged_network' in networks:raise RuntimeError('Test service still on shared ingress')
        if live_state(environment.peer)!=before or inspect('jobforged_traefik')['Id']!=traefik:raise RuntimeError('Shared environment changed')
        print(json.dumps({'environment':environment.name,'ingress':network,environment.peer.name+'_unchanged':True,'traefik_not_restarted':True,'rollback_directory':str(backup),'override_sha256':hashlib.sha256(updated.encode()).hexdigest()}))
    except Exception:
        path.write_text(original);app.write_text(old_app)
        run(command+['up','-d','--no-deps','--wait','--wait-timeout','120','api-gw','studio'])
        raise SystemExit('Test ingress setup failed; previous Test attachments restored')

if __name__=='__main__':main()

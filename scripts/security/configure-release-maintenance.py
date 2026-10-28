#!/usr/bin/env python3
"""Explicit release-window proxy. Test never enables it automatically in Live."""
import argparse
import json
import os
from pathlib import Path
import subprocess
from environment_profiles import Environment, authorize_live, gateway_values

def run(args):return subprocess.run(args,capture_output=True,text=True,check=True).stdout.strip()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('revision');parser.add_argument('--environment',choices=['test','live'],default='test');parser.add_argument('--authorization',default='/opt/jbfd/security-work/live-release-approval.json');parser.add_argument('--disable',action='store_true');args=parser.parse_args()
    if os.geteuid()!=0:raise SystemExit('Root required')
    profile=Environment(args.environment);authorize_live(profile,args.revision,args.authorization)
    root=Path(__file__).resolve().parents[2]
    if run(['git','-C',str(root),'rev-parse','HEAD'])!=args.revision:raise SystemExit('Source revision mismatch')
    image='ghcr.io/mlt-mateus/jobforged-security-gateway:'+args.revision
    metadata=json.loads(run(['docker','image','inspect',image]))[0]
    if metadata['Config'].get('Labels',{}).get('org.opencontainers.image.revision')!=args.revision:raise SystemExit('Image revision mismatch')
    os.umask(0o077)
    values=gateway_values(profile,args.revision)
    values['APP_HOST_RULE']='Host(`'+profile.hostname+'`)'+(' || Host(`www.jobforged.com`)' if profile.name=='live' else '')
    path=Path('/opt/jbfd/security-work')/(profile.name+'-release-maintenance.env')
    compose=['docker','compose','--project-name','jbfd-'+profile.name+'-release-maintenance','--env-file',str(path),'-f',str(root/'deploy/compose.maintenance.yml')]
    if args.disable:
        if profile.name=='live':run(['python3',str(root/'scripts/security/verify-live-release.py'),args.revision,'--authorization',args.authorization])
        app=json.loads(run(['docker','inspect',profile.app]))[0]
        if app['Config'].get('Image')!='ghcr.io/mlt-mateus/jobforged:'+args.revision or app['State'].get('Health',{}).get('Status')!='healthy':raise SystemExit('Healthy approved app required before opening public traffic')
        run(compose+['down'])
    else:
        # Additional target-only attachment allows the maintenance page to work
        # before the provider/app ingress transition; no shared service restart.
        if subprocess.run(['docker','network','inspect',profile.ingress],capture_output=True).returncode:run(['docker','network','create','--label','jbfd.environment='+profile.name,profile.ingress])
        for name in ['jobforged_traefik',profile.app]:
            row=json.loads(run(['docker','inspect',name]))[0]
            if profile.ingress not in row['NetworkSettings']['Networks']:run(['docker','network','connect',profile.ingress,name])
        path.write_text(''.join(key+'='+value+'\n' for key,value in values.items()))
        run(compose+['config','--quiet']);run(compose+['up','-d','--wait','--wait-timeout','90'])
    print(json.dumps({'environment':profile.name,'maintenance_enabled':not args.disable,'business_requests_blocked':not args.disable}))

if __name__=='__main__':main()

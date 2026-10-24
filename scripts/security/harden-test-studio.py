#!/usr/bin/env python3
"""Keep HTTPS + Basic Auth; require the SSH tunnel/host path for Test Studio."""
import datetime
import ipaddress
import json
from pathlib import Path
import subprocess
import time

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()

def status(local=False,live=False):
    host='supabase.jobforged.com' if live else 'test.supabase.jobforged.com'
    command=['curl','-sS','-o','/dev/null','-w','%{http_code}','--max-time','10']
    if local:command+=['--resolve',host+':443:127.0.0.1']
    return run(command+['https://'+host])

def main():
    root=Path('/opt/jbfd/supabase');path=root/'docker-compose.override.yml'
    original=path.read_text()
    traefik=json.loads(run(['docker','inspect','jobforged_traefik']))[0]
    gateway=traefik['NetworkSettings']['Networks']['jobforged_jobforged_network']['Gateway']
    ipaddress.ip_address(gateway)
    before_live=status(live=True)
    old='      - traefik.http.routers.supabase-studio.middlewares=supabase-studio-auth'
    new='      - traefik.http.routers.supabase-studio.middlewares=jbfd-test-studio-private,supabase-studio-auth\n      - traefik.http.middlewares.jbfd-test-studio-private.ipallowlist.sourcerange=127.0.0.1/32,::1/128,'+gateway+'/32'
    if original.count(old)!=1:raise RuntimeError('Unexpected Test Studio router configuration')
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path('/opt/jbfd/security-work')/('test-studio-before-private-'+stamp);backup.write_text(original);backup.chmod(0o600)
    compose=['docker','compose','--project-directory',str(root),'-f',str(root/'docker-compose.yml'),'-f',str(path)]
    try:
        path.write_text(original.replace(old,new))
        run(compose+['config','--quiet']);run(compose+['up','-d','--no-deps','studio'])
        for _ in range(30):
            if status(local=True)=='401':break
            time.sleep(1)
        else:raise RuntimeError('SSH tunnel HTTPS/Basic Auth path failed')
        if status(live=True)!=before_live:raise RuntimeError('Live Studio response unexpectedly changed')
        print(json.dumps({'environment':'test','local_https_basic_auth':401,'live_studio_unchanged':True,'rollback_file':str(backup)}))
    except Exception:
        path.write_text(original);run(compose+['up','-d','--no-deps','studio']);raise

if __name__=='__main__':main()

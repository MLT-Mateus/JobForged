#!/usr/bin/env python3
"""Restore an environment-specific archive in isolation; never replace an active database."""
import argparse
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
from environment_profiles import Environment, authorize_live

def run(args,**kw):
    return subprocess.run(args,check=True,capture_output=True,text=True,**kw).stdout.strip()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('archive');parser.add_argument('--environment',choices=['test','live'],default='test');parser.add_argument('--authorization');parser.add_argument('--revision');args=parser.parse_args()
    environment=Environment(args.environment)
    authorize_live(environment,args.revision,args.authorization,require_backup=False)
    if os.geteuid()!=0:raise SystemExit('VPS root required')
    folder=Path(args.archive).resolve()
    if folder.parent!=Path('/opt/jbfd/backups/security') or not re.fullmatch(environment.name+r'-[0-9]{8}T[0-9]{6}Z',folder.name):raise SystemExit('Verified Test archive required')
    evidence=json.loads((folder/'recovery.json').read_text())
    if evidence.get('environment')!=environment.name or evidence.get('counts_match') is not True:raise SystemExit('Archive has no successful recovery evidence')
    for name,expected in evidence['checksums'].items():
        if name not in ('postgres.sql.gz','storage.tar.gz','objects.private.json','infrastructure-audit.jsonl'):raise SystemExit('Unexpected archive entry')
        if hashlib.file_digest((folder/name).open('rb'),'sha256').hexdigest()!=expected:raise SystemExit('Archive checksum mismatch')
    image=evidence.get('database_image') or json.loads(run(['docker','inspect',environment.database]))[0]['Image']
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ').lower()
    name='jbfd-security-restore-'+environment.name+'-'+stamp
    os.umask(0o077)
    command="if [ ! -f /tmp/jbfd-restore/PG_VERSION ]; then initdb -D /tmp/jbfd-restore -U supabase_admin --auth-local=trust --auth-host=reject >/tmp/init.log; printf \"listen_addresses = ''\\n\" >> /tmp/jbfd-restore/postgresql.conf; fi; exec postgres -D /tmp/jbfd-restore -c unix_socket_directories=/tmp -c shared_buffers=64MB -c max_connections=30 -c shared_preload_libraries=pg_net,pg_cron,pg_stat_statements -c cron.launch_active_jobs=off"
    run(['docker','run','-d','--name',name,'--label','jbfd.security.disposable=true','--network','none','--memory','768m','--cpus','0.75','--user','postgres','--entrypoint','bash',image,'-ec',command])
    ready=False
    for _ in range(60):
        if subprocess.run(['docker','exec',name,'pg_isready','-h','/tmp','-U','supabase_admin'],capture_output=True).returncode==0:ready=True;break
        time.sleep(1)
    if not ready:raise SystemExit('Isolated restoration server unavailable')
    tables=('auth.users','public.companies','public.company_members','storage.objects','public.jbfd_schema_migrations')
    counts={table:0 for table in tables};current=None
    with gzip.open(folder/'postgres.sql.gz','rb') as source,(folder/(name+'.private.log')).open('wb') as log:
        process=subprocess.Popen(['docker','exec','-i',name,'psql','-h','/tmp','-Xq','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=log,stderr=log)
        try:
            for line in source:
                if current:
                    if line.strip()==b'\\.':current=None
                    else:counts[current]+=1
                elif line.startswith(b'COPY '):
                    table=line.split(b' ',2)[1].decode();current=table if table in counts else None
                if line.strip()!=b'CREATE ROLE supabase_admin;':process.stdin.write(line)
            process.stdin.close()
        except BrokenPipeError:pass
        if process.wait()!=0:raise SystemExit('Isolated restore failed; protected diagnostic retained')
    for table,count in counts.items():
        actual=run(['docker','exec',name,'psql','-h','/tmp','-XqAt','-U','supabase_admin','-d','postgres','-c','select count(*) from '+table])
        if int(actual)!=count:raise SystemExit('Restored count mismatch')
    print(json.dumps({'environment':environment.name,'restore_container':name,'archive_checksums_verified':True,'counts_match':True,'network':'none','ports':[],'active_environment_untouched':True}))

if __name__=='__main__':main()

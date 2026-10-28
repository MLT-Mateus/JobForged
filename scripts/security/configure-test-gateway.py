#!/usr/bin/env python3
"""Install the shared gateway; Live requires explicit approval and its own backup."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
from environment_profiles import Environment, authorize_live, gateway_values

def run(args,**kwargs):
    return subprocess.run(args,check=True,capture_output=True,text=True,**kwargs).stdout.strip()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('revision');parser.add_argument('--environment',choices=['test','live'],default='test');parser.add_argument('--authorization');args=parser.parse_args()
    environment=Environment(args.environment)
    if os.geteuid()!=0 or not re.fullmatch(r'[a-f0-9]{40}',args.revision):raise SystemExit('Root and approved commit required')
    release=Path(__file__).resolve().parents[2]
    if run(['git','-C',str(release),'rev-parse','HEAD'])!=args.revision:raise SystemExit('Release commit mismatch')
    authorize_live(environment,args.revision,args.authorization)
    run(['bash',str(release/'scripts/supabase-migrate.sh'),environment.name,'--check'])
    image='ghcr.io/mlt-mateus/jobforged-security-gateway:'+args.revision
    metadata=json.loads(run(['docker','image','inspect',image]))[0]
    if metadata['Config'].get('Labels',{}).get('org.opencontainers.image.revision')!=args.revision:raise SystemExit('Gateway image revision mismatch')
    app=environment.app_env;os.umask(0o077)
    if app.stat().st_mode&0o077:raise SystemExit('Protected target environment required')
    original_app=app.read_text()
    root=Path('/opt/jbfd/security-gateway-'+environment.name);root.mkdir(mode=0o700,exist_ok=True)
    env_file=root/'gateway.env'
    if env_file.exists():
        if env_file.stat().st_mode&0o077:raise SystemExit('Gateway credentials are not protected')
        env=dict(line.split('=',1) for line in env_file.read_text().splitlines() if '=' in line)
        if not re.fullmatch(r'postgres://jbfd_security_gateway:[0-9a-f]{48}@'+re.escape(environment.database)+r':5432/postgres',env.get('DATABASE_URL','')):raise SystemExit('Unexpected target database credential scope')
        if not re.fullmatch(r'[0-9a-f]{64}',env.get('RATE_SCOPE_SECRET','')):raise SystemExit('Invalid limiter scope key')
    else:
        password=secrets.token_hex(24)
        statement="alter role jbfd_security_gateway password '"+password+"';"
        run(['docker','exec','-i',environment.database,'psql','-Xq','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],input=statement)
        env_file.write_text('DATABASE_URL=postgres://jbfd_security_gateway:'+password+'@'+environment.database+':5432/postgres\nRATE_SCOPE_SECRET='+secrets.token_hex(32)+'\n')
    deployment=root/'deployment.env'
    previous=deployment.read_text() if deployment.exists() else None
    deployment.write_text(''.join(key+'='+value+'\n' for key,value in gateway_values(environment,args.revision).items()))
    compose=['docker','compose','--project-name','jbfd-'+environment.name+'-security','--env-file',str(deployment),'-f',str(release/'deploy/compose.security.yml')]
    try:
        run(compose+['config','--quiet']);run(compose+['up','-d','--wait','--wait-timeout','90'])
        # Keep BFF native calls on the same durable limiter as public calls.
        lines=[line for line in original_app.splitlines() if not line.startswith(('SUPABASE_INTERNAL_URL=','SUPABASE_BRANDING_STORAGE_TOKEN='))]
        temporary=app.with_name('.env.security.tmp')
        with temporary.open('x') as output:output.write('\n'.join(lines)+'\nSUPABASE_INTERNAL_URL=http://'+environment.gateway+':8080\n')
        temporary.replace(app)
        print(json.dumps({'environment':environment.name,'gateway_image':image,'database_role':'jbfd_security_gateway','credential_scope':'limiter and deny-only session predicates','old_storage_credential_removed':True}))
    except Exception:
        app.write_text(original_app)
        if previous is not None:
            deployment.write_text(previous)
            rollback=compose.copy()
            if environment.name=='test' and 'JBFD_GATEWAY_CONTAINER=' not in previous:
                rollback[-1]=str(release/'deploy/compose.security-test.yml')
            run(rollback+['up','-d','--wait','--wait-timeout','90'])
        else:
            run(compose+['down'])
        raise SystemExit('Gateway setup failed; previous target app configuration restored')

if __name__=='__main__':main()

#!/usr/bin/env python3
"""Install the approved Test gateway with a single-function database credential.

Requires applied, checksummed migrations and an already pulled CI image. No Live.
"""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import subprocess

def run(args,**kwargs):
    return subprocess.run(args,check=True,capture_output=True,text=True,**kwargs).stdout.strip()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('revision');args=parser.parse_args()
    if os.geteuid()!=0 or not re.fullmatch(r'[a-f0-9]{40}',args.revision):raise SystemExit('Root and approved commit required')
    release=Path(__file__).resolve().parents[2]
    if run(['git','-C',str(release),'rev-parse','HEAD'])!=args.revision:raise SystemExit('Release commit mismatch')
    run(['bash',str(release/'scripts/supabase-migrate.sh'),'test','--check'])
    image='ghcr.io/mlt-mateus/jobforged-security-gateway:'+args.revision
    metadata=json.loads(run(['docker','image','inspect',image]))[0]
    if metadata['Config'].get('Labels',{}).get('org.opencontainers.image.revision')!=args.revision:raise SystemExit('Gateway image revision mismatch')
    app=Path('/opt/jbfd/test/.env');os.umask(0o077)
    if app.stat().st_mode&0o077:raise SystemExit('Protected Test environment required')
    root=Path('/opt/jbfd/security-gateway-test');root.mkdir(mode=0o700,exist_ok=True)
    env_file=root/'gateway.env'
    if env_file.exists():
        if env_file.stat().st_mode&0o077:raise SystemExit('Gateway credentials are not protected')
        env=dict(line.split('=',1) for line in env_file.read_text().splitlines() if '=' in line)
        if not re.fullmatch(r'postgres://jbfd_security_gateway:[0-9a-f]{48}@supabase-db:5432/postgres',env.get('DATABASE_URL','')):raise SystemExit('Unexpected Test database credential scope')
        if not re.fullmatch(r'[0-9a-f]{64}',env.get('RATE_SCOPE_SECRET','')):raise SystemExit('Invalid limiter scope key')
    else:
        password=secrets.token_hex(24)
        statement="alter role jbfd_security_gateway password '"+password+"';"
        run(['docker','exec','-i','supabase-db','psql','-Xq','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],input=statement)
        env_file.write_text('DATABASE_URL=postgres://jbfd_security_gateway:'+password+'@supabase-db:5432/postgres\nRATE_SCOPE_SECRET='+secrets.token_hex(32)+'\n')
    deployment=root/'deployment.env'
    previous=deployment.read_text() if deployment.exists() else None
    deployment.write_text('JBFD_SECURITY_GATEWAY_IMAGE='+image+'\nJBFD_SECURITY_GATEWAY_ENV_FILE='+str(env_file)+'\n')
    compose=['docker','compose','--project-name','jbfd-test-security','--env-file',str(deployment),'-f',str(release/'deploy/compose.security-test.yml')]
    try:
        run(compose+['config','--quiet']);run(compose+['up','-d','--wait','--wait-timeout','90'])
        # Keep BFF native calls on the same durable limiter as public calls.
        lines=[line for line in app.read_text().splitlines() if not line.startswith(('SUPABASE_INTERNAL_URL=','SUPABASE_BRANDING_STORAGE_TOKEN='))]
        temporary=app.with_name('.env.security.tmp')
        with temporary.open('x') as output:output.write('\n'.join(lines)+'\nSUPABASE_INTERNAL_URL=http://jbfd-test-security-gateway:8080\n')
        temporary.replace(app)
        print(json.dumps({'environment':'test','gateway_image':image,'database_role':'jbfd_security_gateway','credential_scope':'limiter and deny-only session predicates','old_storage_credential_removed':True}))
    except Exception:
        if previous is not None:
            deployment.write_text(previous);run(compose+['up','-d','--wait','--wait-timeout','90'])
        raise SystemExit('Test gateway setup failed; previous deployment retained where available')

if __name__=='__main__':main()

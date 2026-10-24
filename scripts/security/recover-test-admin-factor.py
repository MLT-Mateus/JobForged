#!/usr/bin/env python3
"""Root-only emergency recovery after independent human identity verification.

Removes one existing factor through native Auth; keeps MFA enforcement and roles.
Never accepts a browser flag as authorization and never prints tokens or seeds.
"""
import argparse
import base64
import datetime
import fcntl
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request
import uuid

def run(args,**kw):
    return subprocess.run(args,check=True,capture_output=True,text=True,**kw).stdout.strip()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--user-id',required=True);parser.add_argument('--factor-id',required=True)
    parser.add_argument('--verified-identity-ticket',required=True,help='Reference to an independently verified ownership request; no personal data')
    args=parser.parse_args()
    if os.geteuid()!=0:raise SystemExit('VPS root required')
    lock=open('/opt/jbfd/security-work/test-backup.lock','a')
    fcntl.flock(lock,fcntl.LOCK_EX)
    user=str(uuid.UUID(args.user_id));factor=str(uuid.UUID(args.factor_id))
    if not re.fullmatch(r'[A-Za-z0-9_/#-]{8,100}',args.verified_identity_ticket):raise SystemExit('Use a ticket reference without personal data')
    statement="select exists(select 1 from public.platform_admins p join auth.users u on u.id=p.user_id join auth.mfa_factors f on f.user_id=u.id where p.user_id='"+user+"' and f.id='"+factor+"' and p.role='platform_admin' and p.email=lower(u.email) and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()));"
    allowed=run(['docker','exec','-i','supabase-db','psql','-XqAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],input=statement)
    if allowed!='t':raise SystemExit('Existing verified Test administrator/factor required')
    auth=json.loads(run(['docker','inspect','supabase-auth']))[0]
    if auth['Config']['Labels'].get('com.docker.compose.project.working_dir')!='/opt/jbfd/supabase':raise SystemExit('Unexpected Test Auth identity')
    env=dict(item.split('=',1) for item in auth['Config']['Env'])
    secret=env.get('GOTRUE_JWT_SECRET');address=auth['NetworkSettings']['Networks'].get('supabase_default',{}).get('IPAddress')
    if not address:
        networks=[v['IPAddress'] for k,v in auth['NetworkSettings']['Networks'].items() if k!='jobforged_jobforged_network']
        if len(networks)!=1:raise SystemExit('Unexpected Test private Auth network')
        address=networks[0]
    if not secret:raise SystemExit('Auth signing configuration unavailable')
    encode=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).decode().rstrip('=')
    content=encode({'alg':'HS256','typ':'JWT'})+'.'+encode({'role':'service_role','iss':'supabase','iat':int(time.time()),'exp':int(time.time())+60})
    token=content+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),content.encode(),hashlib.sha256).digest()).decode().rstrip('=')
    os.umask(0o077);audit=Path('/opt/jbfd/security-work/admin-factor-recovery.jsonl')
    event={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'operator':'vps-root','environment':'test','target_user_id':user,'factor_id':factor,'ticket':args.verified_identity_ticket}
    def record(result):
        with audit.open('a') as output:output.write(json.dumps({**event,'result':result})+'\n');output.flush();os.fsync(output.fileno())
    record('requested')
    try:
        request=urllib.request.Request('http://'+address+':9999/admin/users/'+user+'/factors/'+factor,headers={'Authorization':'Bearer '+token},method='DELETE')
        with urllib.request.urlopen(request,timeout=15) as response:
            if response.status not in (200,204):raise RuntimeError('Factor recovery rejected')
        record('completed')
        print(json.dumps({'environment':'test','factor_removed':True,'roles_unchanged':True,'mfa_enforcement_unchanged':True,'next_step':'Sign in and enroll a new authenticator before administrative operations'}))
    except Exception:
        record('failed');raise SystemExit('Recovery failed; inspect protected audit and native Auth health')

if __name__=='__main__':main()

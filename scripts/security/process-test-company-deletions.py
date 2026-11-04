#!/usr/bin/env python3
"""Test-only queued deletion. No Live options; no application admin credentials.

Backups, provider files and native Auth must all pass before reporting completion.
Object removal uses a short, exact-manifest RLS capability, not service_role.
"""
import argparse
import datetime
import tempfile
import base64
import fcntl
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request
import urllib.parse
from environment_profiles import Environment, verified_backup

def run(args,**kw):return subprocess.check_output(args,text=True,**kw).strip()
database='supabase-db'
socket='/var/run/postgresql'
def sql(query):return run(['docker','exec','-i',database,'psql','-h',socket,'-XqAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],input=query)
def inspect(name):return json.loads(run(['docker','inspect',name]))[0]
def quote(value):return "'"+str(value).replace("'","''")+"'"
def token(secret,claims):
 enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).decode().rstrip('=')
 value=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'iat':int(time.time()),'exp':int(time.time())+120,**claims})
 return value+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),value.encode(),hashlib.sha256).digest()).decode().rstrip('=')
def main():
 global database,socket
 parser=argparse.ArgumentParser();parser.add_argument('--isolated-database');parser.add_argument('--isolated-storage');parser.add_argument('--isolated-auth');args=parser.parse_args()
 isolated=any([args.isolated_database,args.isolated_storage,args.isolated_auth])
 if not isolated and os.geteuid()!=0:raise SystemExit('VPS root required')
 temporary=None
 if isolated:
  if not all([args.isolated_database,args.isolated_storage,args.isolated_auth]):raise SystemExit('All disposable providers required')
  for name in [args.isolated_database,args.isolated_storage,args.isolated_auth]:
   info=inspect(name)
   if not name.startswith('jbfd-security-') or info['Config']['Labels'].get('jbfd.security.disposable')!='true' or info['HostConfig']['PortBindings']:raise SystemExit('Disposable provider required')
  database=args.isolated_database;socket='/var/run/postgresql' if database.startswith('jbfd-security-restore-ci-') else '/tmp'
  temporary=tempfile.TemporaryDirectory(prefix='jbfd-deletion-');lock_path=Path(temporary.name)/'lock'
 else:lock_path=Path('/opt/jbfd/security-work/test-backup.lock')
 os.umask(0o077)
 lock=open(lock_path,'w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 jobs=json.loads(sql("select coalesce(json_agg(j),'[]') from(select id,company_id,state,remove_accounts,backup_name,requested_by,requested_at from app_private.company_deletion_jobs where state<>'completed' order by requested_at limit 5)j;"))
 if not jobs:print(json.dumps({'environment':'test','processed':0}));return
 provider=inspect(args.isolated_storage if isolated else 'supabase-storage');auth=inspect(args.isolated_auth if isolated else 'supabase-auth')
 if not isolated and (provider['Name']!='/supabase-storage' or auth['Name']!='/supabase-auth'):raise SystemExit('Test provider identity required')
 network=next(iter(provider['NetworkSettings']['Networks'])) if isolated else 'supabase_default'
 if isolated and not json.loads(run(['docker','network','inspect',network]))[0]['Internal']:raise SystemExit('Isolated internal network required')
 storage_ip=provider['NetworkSettings']['Networks'][network]['IPAddress']
 auth_ip=auth['NetworkSettings']['Networks'][network]['IPAddress']
 signing=dict(v.split('=',1) for v in provider['Config']['Env'])['AUTH_JWT_SECRET']
 auth_signing=dict(v.split('=',1) for v in auth['Config']['Env'])['GOTRUE_JWT_SECRET']
 processed=0
 for job in jobs:
  jid=quote(job['id']);cid=quote(job['company_id'])
  try:
   # A retry may reuse its own verified backup even after its two-hour admission
   # window; no new deletion can be admitted with an old or missing backup.
   backup=None
   if isolated:backup=Path('/isolated-fixture')
   elif job['backup_name']:
    candidate=Path('/opt/jbfd/backups/security')/job['backup_name']
    stamp=datetime.datetime.strptime(candidate.name,'test-%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
    backup=verified_backup(Environment('test'),candidate,now=stamp+datetime.timedelta(seconds=1))
   else:
    for receipt in sorted(Path('/opt/jbfd/backups/security').glob('test-*/offsite-receipt.json'),reverse=True):
     try:
      candidate=verified_backup(Environment('test'),receipt.parent)
      stamp=datetime.datetime.strptime(candidate.name,'test-%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
      if stamp<datetime.datetime.fromisoformat(job['requested_at']):continue
      backup=candidate;break
     except (ValueError,OSError,KeyError):continue
   if backup is None:
    sql("update app_private.company_deletion_jobs set error_code='backup_required',updated_at=now() where id="+jid);continue
   if job['state'] in ('queued','files'):
    sql("update app_private.company_deletion_jobs set state='files',backup_name="+quote(backup.name)+",error_code=null,updated_at=now() where id="+jid)
    # Include safely registered/in-flight objects appearing after the request.
    sql("insert into app_private.company_deletion_objects(job_id,bucket,path) select "+jid+"::uuid,o.bucket_id,o.name from storage.objects o where(o.bucket_id='company-branding' and split_part(o.name,'/',1)="+cid+") or(o.bucket_id='candidate-resumes' and exists(select 1 from public.candidate_accounts a where a.origin_company_id="+cid+"::uuid and a.user_id::text=split_part(o.name,'/',1))) or(o.bucket_id='security-quarantine' and exists(select 1 from app_private.orphan_quarantine q where q.company_id="+cid+"::uuid and o.name=q.id::text||'/image.png')) on conflict do nothing;")
    sql('update app_private.company_deletion_jobs set file_count=(select count(*) from app_private.company_deletion_objects where job_id='+jid+') where id='+jid)
    objects=json.loads(sql("select coalesce(json_agg(o),'[]') from(select bucket,path from app_private.company_deletion_objects where job_id="+jid+" and removed_at is null limit 20)o;"))
    capability=token(signing,{'sub':'00000000-0000-4000-8000-000000000085','role':'authenticated','aud':'authenticated','maintenance':'company-deletion','job':job['id']})
    for obj in objects:
     request=urllib.request.Request('http://'+storage_ip+':5000/object/'+urllib.parse.quote(obj['bucket'],safe=''),data=json.dumps({'prefixes':[obj['path']]}).encode(),method='DELETE',headers={'Authorization':'Bearer '+capability,'Content-Type':'application/json'})
     with urllib.request.urlopen(request,timeout=20) as response:response.read()
     if sql('select exists(select 1 from storage.objects where bucket_id='+quote(obj['bucket'])+' and name='+quote(obj['path'])+');')!='f':raise RuntimeError('object_removal_not_verified')
     sql('update app_private.company_deletion_objects set removed_at=now() where job_id='+jid+' and bucket='+quote(obj['bucket'])+' and path='+quote(obj['path']))
    if len(objects)==20:continue
    sql('select app_private.finish_company_deletion('+jid+');')
   users=json.loads(sql('select coalesce(json_agg(user_id),\'[]\') from app_private.company_deletion_users where job_id='+jid+" and state='pending';"))
   for user in users:
    exists=sql('select exists(select 1 from auth.users where id='+quote(user)+'::uuid);')=='t'
    if not exists:
     sql("update app_private.company_deletion_users set state='deleted' where job_id="+jid+' and user_id='+quote(user)+'::uuid;delete from app_private.company_signup_intents where user_id='+quote(user)+'::uuid;delete from app_private.recovery_intents where user_id='+quote(user)+'::uuid;delete from app_private.session_revocations where user_id='+quote(user)+'::uuid;delete from app_private.company_deletion_identity_locks where user_id='+quote(user)+'::uuid;');continue
    exclusive=job['remove_accounts'] and sql('select app_private.claim_deletion_identity('+jid+'::uuid,'+quote(user)+'::uuid);')=='t'
    state='preserved'
    if job['remove_accounts'] and exclusive:
     # Native Auth manages its own sessions, factors and identity deletion.
     sql('delete from public.platform_communication_deliveries where user_id='+quote(user)+'::uuid;')
     request=urllib.request.Request('http://'+auth_ip+':9999/admin/users/'+user,data=b'{}',method='DELETE',headers={'Authorization':'Bearer '+token(auth_signing,{'role':'service_role','iss':'supabase'}),'Content-Type':'application/json'})
     with urllib.request.urlopen(request,timeout=20) as response:response.read()
     if sql('select exists(select 1 from auth.users where id='+quote(user)+'::uuid);')!='f':raise RuntimeError('account_removal_not_verified')
     sql('delete from app_private.company_signup_intents where user_id='+quote(user)+'::uuid;delete from app_private.recovery_intents where user_id='+quote(user)+'::uuid;delete from app_private.session_revocations where user_id='+quote(user)+'::uuid;')
     sql('delete from app_private.company_deletion_identity_locks where user_id='+quote(user)+'::uuid;')
     state='deleted'
    sql('update app_private.company_deletion_users set state='+quote(state)+' where job_id='+jid+' and user_id='+quote(user)+'::uuid;')
   sql("begin;insert into public.platform_audit_events(actor_user_id,action,target_id,reason,details) select requested_by,'platform.company.deletion.completed',company_id,'Exclusão administrativa confirmada',jsonb_build_object('job',id) from app_private.company_deletion_jobs where id="+jid+";update app_private.company_deletion_jobs set deleted_count=(select count(*) from app_private.company_deletion_users where job_id="+jid+" and state='deleted'),preserved_count=(select count(*) from app_private.company_deletion_users where job_id="+jid+" and state='preserved'),state='completed',completed_at=now(),updated_at=now(),error_code=null,reason='Exclusão administrativa confirmada' where id="+jid+";delete from app_private.company_deletion_objects where job_id="+jid+";delete from app_private.company_deletion_users where job_id="+jid+";commit;")
   processed+=1
  except Exception:
   if isolated:raise
   # No provider response, object path or personal data is written to logs/UI.
   sql("update app_private.company_deletion_jobs set error_code='processing_retry',updated_at=now() where id="+jid)
 print(json.dumps({'environment':'test','processed':processed,'live_touched':False}))
if __name__=='__main__':main()

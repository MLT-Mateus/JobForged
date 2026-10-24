#!/usr/bin/env python3
"""Bounded Test-only orphan cleanup, private verified quarantine and offsite gate.

No registered asset is collected. No service-role credential is used. A short
maintenance JWT can access exactly one queued orphan and its quarantine copy.
"""
import base64
import argparse
import datetime
import fcntl
import hashlib
import hmac
import ipaddress
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request
import tempfile

database='supabase-db'

def run(args,**kwargs):
    return subprocess.run(args,check=True,capture_output=True,text=True,**kwargs).stdout.strip()

def sql(query):
    return run(['docker','exec','-i',database,'psql','-h','/var/run/postgresql' if database.startswith('jbfd-security-restore-ci-') else '/tmp' if database.startswith('jbfd-security-restore-') else '/var/run/postgresql','-XqAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],input=query)

def main():
    global database
    parser=argparse.ArgumentParser();parser.add_argument('--isolated-database');parser.add_argument('--isolated-storage');args=parser.parse_args()
    isolated=bool(args.isolated_database or args.isolated_storage)
    temporary=None
    storage_name='supabase-storage';work=Path('/opt/jbfd/security-work');backup_root=Path('/opt/jbfd/backups/security')
    if isolated:
        if not args.isolated_database or not args.isolated_storage or not args.isolated_database.startswith('jbfd-security-restore-'):raise SystemExit('Both isolated provider identities required')
        for name in [args.isolated_database,args.isolated_storage]:
            info=json.loads(run(['docker','inspect',name]))[0]
            if info['Config']['Labels'].get('jbfd.security.disposable')!='true' or info['HostConfig']['PortBindings']:raise SystemExit('Disposable providers without public ports required')
        database=args.isolated_database;storage_name=args.isolated_storage
        temporary=tempfile.TemporaryDirectory(prefix='jbfd-orphan-ci-');work=Path(temporary.name);backup_root=work/'backups'
    elif os.geteuid()!=0:raise SystemExit('VPS root required')
    os.umask(0o077)
    lock=open(work/'test-backup.lock','w')
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    provider=json.loads(run(['docker','inspect',storage_name]))[0]
    if provider['Name']!='/'+storage_name:raise RuntimeError('Unexpected Storage identity')
    networks=provider['NetworkSettings']['Networks']
    if isolated:
        network=next(iter(networks))
        if not json.loads(run(['docker','network','inspect',network]))[0]['Internal']:raise RuntimeError('Isolated internal network required')
    else:network='supabase_default'
    address=networks[network]['IPAddress']
    if not ipaddress.ip_address(address).is_private:raise RuntimeError('Private Storage required')
    signing=dict(v.split('=',1) for v in provider['Config']['Env'])['AUTH_JWT_SECRET']
    def token(job):
        enc=lambda v:base64.urlsafe_b64encode(json.dumps(v,separators=(',',':')).encode()).decode().rstrip('=')
        value=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':'00000000-0000-4000-8000-000000000084','role':'authenticated','aud':'authenticated','iat':int(time.time()),'exp':int(time.time())+120,'maintenance':'orphan-cleanup','job':job})
        return value+'.'+base64.urlsafe_b64encode(hmac.new(signing.encode(),value.encode(),hashlib.sha256).digest()).decode().rstrip('=')
    def storage(job,bucket,path=None,data=None,delete=False):
        route='/object/'+bucket+('' if delete else '/'+path)
        body=json.dumps({'prefixes':[path]}).encode() if delete else data
        request=urllib.request.Request('http://'+address+':5000'+route,data=body,method='DELETE' if delete else 'POST' if data is not None else 'GET',headers={'Authorization':'Bearer '+token(job),'Content-Type':'application/json' if delete else 'image/png','x-upsert':'false'})
        with urllib.request.urlopen(request,timeout=20) as response:
            result=response.read(5242881)
            if len(result)>5242880:raise RuntimeError('Unexpected object size')
            return result
    sql("""delete from app_private.company_upload_reservations where asset_id in(select asset_id from app_private.company_upload_reservations where expires_at<now()-interval '2 days' limit 1000);
insert into app_private.orphan_quarantine(company_id,object_name)
select split_part(name,'/',1)::uuid,name from storage.objects where bucket_id='company-branding' and app_private.orphan_eligible(name)
order by created_at limit 20 on conflict(object_name) do nothing;""")
    sql("update app_private.orphan_quarantine q set source_removed_at=now() where verified_at is not null and source_removed_at is null and not exists(select 1 from storage.objects o where o.bucket_id='company-branding' and o.name=q.object_name);")
    rows=json.loads(sql("select coalesce(json_agg(q),'[]') from(select id,company_id,object_name,verified_at,source_removed_at from app_private.orphan_quarantine where source_removed_at is null order by observed_at limit 20)q;"))
    removed=0
    for row in rows:
        job=row['id'];path=row['object_name'];cid=row['company_id'];copy=job+'/image.png'
        if sql("select app_private.orphan_eligible('"+path+"');")!='t':continue
        content=storage(job,'company-branding',path);digest=hashlib.sha256(content).hexdigest()
        if not content or len(content)>5242880:raise RuntimeError('Unexpected orphan size')
        if not row['verified_at']:
            # A previous interrupted POST can leave an immutable copy; read and
            # verify it instead of overwriting anything.
            exists=sql("select exists(select 1 from storage.objects where bucket_id='security-quarantine' and name='"+copy+"');")=='t'
            if not exists:storage(job,'security-quarantine',copy,content)
        if hashlib.sha256(storage(job,'security-quarantine',copy)).hexdigest()!=digest:raise RuntimeError('Quarantine readback failed')
        sql("update app_private.orphan_quarantine set sha256='"+digest+"',bytes="+str(len(content))+",verified_at=coalesce(verified_at,now()) where id='"+job+"';")
        storage(job,'company-branding',path,delete=True)
        if sql("select exists(select 1 from storage.objects where bucket_id='company-branding' and name='"+path+"');")=='t':raise RuntimeError('Source deletion was not confirmed')
        sql("begin;update app_private.orphan_quarantine set source_removed_at=now() where id='"+job+"';insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details) values('"+cid+"',null,'branding.orphan_quarantined','"+job+"',jsonb_build_object('bytes',"+str(len(content))+",'sha256','"+digest+"'));commit;")
        removed+=1
    # Purge requires seven days of quarantine AND a recent, restored, encrypted
    # offsite copy containing the exact quarantine object. Missing receipt means
    # keep the file. Never substitute local checksums for offsite confirmation.
    manifests=[];now=datetime.datetime.now(datetime.timezone.utc)
    for receipt in sorted(backup_root.glob('test-*/offsite-receipt.json'),reverse=True):
        entry=json.loads(receipt.read_text());verified=datetime.datetime.fromisoformat(entry['verified_at'])
        if now-verified>datetime.timedelta(days=2):continue
        recovery=receipt.parent/'recovery.json'
        if hashlib.sha256(recovery.read_bytes()).hexdigest()!=entry['recovery_sha256']:continue
        objects=json.loads((receipt.parent/'objects.private.json').read_text())
        manifests.append({(v['bucket_id'],v['name']) for v in objects})
    purged=0
    old=json.loads(sql("select coalesce(json_agg(q),'[]') from(select id from app_private.orphan_quarantine where source_removed_at is not null and verified_at<now()-interval '7 days' and purged_at is null order by verified_at limit 20)q;"))
    for row in old:
        job=row['id'];path=job+'/image.png'
        if not any(('security-quarantine',path) in manifest for manifest in manifests):continue
        sql("update app_private.orphan_quarantine set purge_approved_at=now() where id='"+job+"';")
        storage(job,'security-quarantine',path,delete=True)
        if sql("select exists(select 1 from storage.objects where bucket_id='security-quarantine' and name='"+path+"');")=='t':raise RuntimeError('Quarantine purge was not confirmed')
        sql("update app_private.orphan_quarantine set purged_at=now() where id='"+job+"';")
        purged+=1
    print(json.dumps({'environment':'test','quarantined':removed,'purged_after_offsite_receipt':purged,'registered_assets_deleted':0}))
    if temporary:temporary.cleanup()

if __name__=='__main__':
    try:main()
    except Exception as error:
        print(json.dumps({'environment':'test','passed':False,'error_type':type(error).__name__,'detail':'Orphan cleanup stopped; referenced and quarantine files retained'}))
        raise SystemExit(1)

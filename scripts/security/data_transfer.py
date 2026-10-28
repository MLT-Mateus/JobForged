"""Explicit one-time Test data transfer. No sessions, MFA or service credentials.

Library functions are exercised on disposable databases. Production execution
requires the release's protected authorization and an empty, upgraded Live DB.
All data and diagnostics stay in root-private files, never stdout.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import uuid
import os
import tarfile
import tempfile

TABLES = (
    'auth.users', 'auth.identities', 'public.companies', 'public.company_members',
    'public.company_branding_assets', 'public.company_branding', 'public.company_branding_history',
    'public.platform_banner_assets', 'public.platform_banners', 'public.platform_settings',
    'public.company_audit_events', 'public.platform_audit_events', 'storage.objects',
)
USER_COLUMNS = ('instance_id','id','aud','role','email','encrypted_password','email_confirmed_at',
                'raw_app_meta_data','raw_user_meta_data','created_at','updated_at','phone',
                'phone_confirmed_at','banned_until','deleted_at','is_sso_user','is_anonymous')
IDENTITY_COLUMNS = ('provider_id','user_id','identity_data','provider','created_at','updated_at','id')
OBJECT_COLUMNS = ('id','bucket_id','name','owner','created_at','updated_at','last_accessed_at',
                  'metadata','version','owner_id','user_metadata','archived_at','is_delete_marker','is_versioned')
EMPTY_SOURCE = ('public.company_invitations','public.platform_communications',
                'public.platform_communication_deliveries','app_private.orphan_quarantine')
EXCLUDED = ('auth.sessions','auth.refresh_tokens','auth.mfa_factors','auth.mfa_challenges',
            'auth.mfa_amr_claims','app_private.recovery_intents','app_private.company_signup_intents',
            'app_private.administrative_factor_recovery','app_private.session_revocations',
            'app_private.request_limits','app_private.company_upload_reservations')

def sql(container, statement, database='postgres'):
    result=subprocess.run(['docker','exec','-i',container,'psql','-XqAt','-U','supabase_admin',
                           '-d',database,'-v','ON_ERROR_STOP=1'],input=statement,capture_output=True,text=True)
    if result.returncode:
        # Do not expose SQL diagnostics: rows can include hashes/private content.
        raise RuntimeError('Transfer database operation failed; transaction rolled back')
    return result.stdout.strip()

def literal(value):
    return "'"+value.replace("'","''")+"'"

def columns(container, table, database='postgres'):
    schema,name=table.split('.')
    return json.loads(sql(container,"select json_agg(column_name order by ordinal_position) from information_schema.columns where table_schema="+literal(schema)+" and table_name="+literal(name)+" and is_generated='NEVER';",database))

def retarget(value):
    if isinstance(value,dict):return {k:retarget(v) for k,v in value.items()}
    if isinstance(value,list):return [retarget(v) for v in value]
    if isinstance(value,str) and value.startswith('https://test.jobforged.com/'):
        return 'https://jobforged.com/'+value[len('https://test.jobforged.com/'):]
    return value

def collect(container, expected, database='postgres'):
    for table in EMPTY_SOURCE:
        if sql(container,'select count(*) from '+table+';',database)!='0':
            raise ValueError('Unexpected invitation, campaign or quarantine state requires review')
    data={}
    for table in TABLES:
        allowed=USER_COLUMNS if table=='auth.users' else IDENTITY_COLUMNS if table=='auth.identities' else OBJECT_COLUMNS if table=='storage.objects' else columns(container,table,database)
        selected=','.join('"'+key+'"' for key in allowed)
        rows=json.loads(sql(container,"select coalesce(json_agg(t),'[]') from(select "+selected+' from '+table+')t;',database))
        if table=='auth.users':
            for row in rows:
                if row['role']!='authenticated' or row.get('is_sso_user') or row.get('is_anonymous'):
                    raise ValueError('Unsupported source identity')
                meta=row.get('raw_user_meta_data') or {}
                row['raw_user_meta_data']={k:v for k,v in meta.items() if k not in ('company_signup_nonce','company_signup_receipt','role','company_role','platform_admin','company_id')}
                row['raw_app_meta_data']={'provider':'email','providers':['email']}
                for field in ('confirmation_token','recovery_token','email_change_token_new','email_change_token_current','reauthentication_token','phone_change_token','email_change','phone_change'):
                    row[field]=''
                row['is_super_admin']=False
        elif table=='auth.identities':
            if any(row['provider']!='email' for row in rows):raise ValueError('Only native email identities supported')
        elif table=='storage.objects':
            if any(row['bucket_id'] not in ('company-branding','security-quarantine') or row.get('is_delete_marker') for row in rows):
                raise ValueError('Unexpected object bucket or deleted version')
        elif table not in ('public.company_audit_events','public.platform_audit_events'):
            rows=retarget(rows)
        data[table]=rows
    counts={'users':len(data['auth.users']),'companies':len(data['public.companies']),'objects':len(data['storage.objects'])}
    if counts!=expected:raise ValueError('Source counts differ from explicitly approved scope')
    return {'format':1,'source':'test','destination':'live','expected':counts,'tables':data,
            'excluded':list(EXCLUDED)+['public.platform_admins','provider credentials and settings'],
            'url_retarget':'structured Test-host URLs only; audit records unchanged'}

def import_transaction(container, package, database='postgres'):
    if package.get('format')!=1 or package.get('source')!='test' or package.get('destination')!='live':raise ValueError('Unexpected transfer package')
    data=package['tables']
    if set(data)!=set(TABLES):raise ValueError('Unexpected data table')
    for key,table in [('users','auth.users'),('companies','public.companies'),('objects','storage.objects')]:
        if len(data[table])!=package['expected'][key]:raise ValueError('Transfer manifest count mismatch')
    statements=['BEGIN;',"SET LOCAL lock_timeout='10s';", "SET LOCAL statement_timeout='120s';"]
    # Locks protect the empty-target assertion through commit. No existing rows
    # are overwritten, except the explicit migration-created settings singleton.
    for table in TABLES+('public.platform_admins',)+EXCLUDED:
        statements.append('LOCK TABLE '+table+' IN ACCESS EXCLUSIVE MODE;')
        if table!='public.platform_settings':
            statements.append("DO $$BEGIN IF EXISTS(SELECT 1 FROM "+table+") THEN RAISE EXCEPTION 'Transfer requires empty destination'; END IF; END$$;")
    for table in TABLES:
        statements.append('ALTER TABLE '+table+' DISABLE TRIGGER USER;')
    statements.append('DELETE FROM public.platform_settings;')
    for table in TABLES:
        rows=data[table]
        if not rows:continue
        allowed=columns(container,table,database)
        keys=list(rows[0])
        if not set(keys)<=set(allowed) or any(set(row)!=set(keys) for row in rows):raise ValueError('Incompatible transfer columns')
        names=','.join('"'+key+'"' for key in keys)
        payload=json.dumps(rows,separators=(',',':'),ensure_ascii=False)
        if len(payload)>20*1024*1024:raise ValueError('Transfer table exceeds reviewed limit')
        delimiter='$transfer_'+uuid.uuid4().hex+'$'
        statements.append('INSERT INTO '+table+'('+names+') OVERRIDING SYSTEM VALUE SELECT '+names+' FROM jsonb_populate_recordset(NULL::'+table+','+delimiter+payload+delimiter+'::jsonb);')
    for table in TABLES:statements.append('ALTER TABLE '+table+' ENABLE TRIGGER USER;')
    for table in ('public.company_audit_events','public.platform_audit_events'):
        statements.append("SELECT setval(pg_get_serial_sequence('"+table+"','id'),greatest(coalesce(max(id),0),1),coalesce(max(id),0)>0) FROM "+table+';')
    statements.append("INSERT INTO public.platform_audit_events(action,reason,details) VALUES ('platform.data.import','Explicit human-approved Test to Live transfer',jsonb_build_object('source','test','users',"+str(package['expected']['users'])+",'companies',"+str(package['expected']['companies'])+",'objects',"+str(package['expected']['objects'])+",'sessions_copied',false,'mfa_copied',false));")
    for table in EXCLUDED:
        statements.append("DO $$BEGIN IF EXISTS(SELECT 1 FROM "+table+") THEN RAISE EXCEPTION 'Ephemeral authorization state imported'; END IF; END$$;")
    statements.append('COMMIT;')
    return '\n'.join(statements)

def verify(container, package, database='postgres'):
    for table in TABLES:
        expected=len(package['tables'][table])+(1 if table=='public.platform_audit_events' else 0)
        if int(sql(container,'select count(*) from '+table+';',database))!=expected:raise ValueError('Imported row counts differ')
        rows=package['tables'][table]
        if rows:
            keys=','.join('"'+key+'"' for key in rows[0])
            actual=json.loads(sql(container,"select json_agg(t) from(select "+keys+' from '+table+')t;',database))
            if table=='public.platform_audit_events':actual=[row for row in actual if row['id'] in {r['id'] for r in rows}]
            normalize=lambda values:sorted(json.dumps(row,sort_keys=True,separators=(',',':')) for row in values)
            if normalize(rows)!=normalize(actual):raise ValueError('Imported row content differs')
    for table in EXCLUDED:
        if sql(container,'select count(*) from '+table+';',database)!='0':raise ValueError('Ephemeral state present after import')
    if sql(container,"select count(*) from pg_trigger where not tgisinternal and tgenabled='D' and tgrelid in("+','.join(literal(t)+'::regclass' for t in TABLES)+');',database)!='0':raise ValueError('Application trigger left disabled')
    return {'counts_verified':True,'row_content_verified':True,'sessions_and_factors_copied':False,'triggers_enabled':True}

def validate_clone(container):
    if not re.fullmatch(r'jbfd-security-restore-(test|live)-[a-z0-9-]+',container):raise ValueError('Disposable restore container required')
    row=json.loads(subprocess.run(['docker','inspect',container],capture_output=True,text=True,check=True).stdout)[0]
    if row['HostConfig']['NetworkMode']!='none' or row['HostConfig'].get('PortBindings') or row['Config']['Labels'].get('jbfd.security.disposable')!='true':raise ValueError('Isolated disposable database required')

def write_private(path, package):
    path=Path(path)
    with path.open('x',encoding='utf-8') as output:json.dump(package,output,ensure_ascii=False)
    path.chmod(0o600)
    return hashlib.sha256(path.read_bytes()).hexdigest()

def stage_storage(archive_path, package, parent, uid, gid):
    parent=Path(parent).resolve()
    work=Path(tempfile.mkdtemp(prefix='.approved-transfer-',dir=parent));work.chmod(0o700)
    with tarfile.open(archive_path) as archive:archive.extractall(work,filter='data')
    storage=work/'storage'
    if not storage.is_dir() or storage.is_symlink():raise ValueError('Expected Storage archive layout')
    files=[]
    for path in storage.rglob('*'):
        if path.is_symlink() or not path.resolve().is_relative_to(storage.resolve()):raise ValueError('Unsafe archive entry')
        if path.is_file():
            if path.name=='.gitkeep' and path.stat().st_size==0:continue
            if not 0<path.stat().st_size<=5242880 or path.read_bytes()[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Unexpected Storage content')
            files.append(path)
    for row in package['tables']['storage.objects']:
        suffix='/'+row['bucket_id']+'/'+row['name']
        matches=[path for path in files if str(path).endswith(suffix) or suffix+'/' in str(path)]
        if not matches or not any(path.stat().st_size==int(row['metadata']['size']) for path in matches):raise ValueError('Missing imported Storage object')
    for table in ('public.company_branding_assets','public.platform_banner_assets'):
        for row in package['tables'][table]:
            suffix='/company-branding/'+row['path']
            matches=[path for path in files if str(path).endswith(suffix) or suffix+'/' in str(path)]
            if not any(hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256'] for path in matches):raise ValueError('Registered asset hash mismatch')
    for path in [storage,*storage.rglob('*')]:
        os.chown(path,uid,gid);path.chmod(0o750 if path.is_dir() else 0o640)
    return storage

def apply_live(revision, authorization, package_path, archive_path):
    from environment_profiles import Environment, authorize_live, private_file
    import importlib.util
    profile=Environment('live');authorize_live(profile,revision,authorization)
    record=json.loads(private_file(authorization).read_text())
    package_path=private_file(package_path);archive_path=private_file(archive_path)
    if record.get('transfer_sha256')!=hashlib.sha256(package_path.read_bytes()).hexdigest() or record.get('transfer_storage_sha256')!=hashlib.sha256(archive_path.read_bytes()).hexdigest():raise ValueError('Explicit protected transfer manifest required')
    package=json.loads(package_path.read_text())
    if package['expected']!={'users':4,'companies':3,'objects':20}:raise ValueError('Scope differs from human-approved counts')
    release=Path(__file__).resolve().parents[2]
    if subprocess.run(['git','-C',str(release),'rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()!=revision:raise ValueError('Source revision mismatch')
    subprocess.run(['bash',str(release/'scripts/supabase-migrate.sh'),'live','--check'],capture_output=True,check=True)
    spec=importlib.util.spec_from_file_location('release_gate',release/'scripts/security/verify-live-release.py');gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
    if not gate.maintenance_active(revision):raise ValueError('Verified public maintenance required')
    writers=[profile.app,profile.auth,profile.envoy,profile.storage,profile.prefix+'-rest',profile.prefix+'-studio',profile.prefix+'-edge-functions',profile.prefix+'-realtime',profile.prefix+'-pooler',profile.prefix+'-meta']
    for name in writers:
        state=json.loads(subprocess.run(['docker','inspect',name],capture_output=True,text=True,check=True).stdout)[0]
        if state['State']['Running']:raise ValueError('Live writers must be stopped for the transfer')
    target=profile.stack/'volumes/storage'
    if target.is_symlink() or target.resolve()!=target or any(p.is_file() and p.name!='.gitkeep' for p in target.rglob('*')):raise ValueError('Empty canonical Live file destination required')
    uid=int(subprocess.run(['docker','run','--rm','--network','none','--entrypoint','id',json.loads(subprocess.run(['docker','inspect',profile.storage],capture_output=True,text=True,check=True).stdout)[0]['Image'],'-u'],capture_output=True,text=True,check=True).stdout)
    # Images currently use a matching uid/gid. Validate both rather than assume.
    gid=int(subprocess.run(['docker','run','--rm','--network','none','--entrypoint','id',json.loads(subprocess.run(['docker','inspect',profile.storage],capture_output=True,text=True,check=True).stdout)[0]['Image'],'-g'],capture_output=True,text=True,check=True).stdout)
    staged=stage_storage(archive_path,package,target.parent,uid,gid)
    statements=import_transaction(profile.database,package)
    previous=target.with_name('storage.before-approved-transfer-'+uuid.uuid4().hex)
    target.rename(previous);staged.rename(target)
    try:sql(profile.database,statements)
    except Exception:
        target.rename(staged);previous.rename(target);raise
    result=verify(profile.database,package)
    return {'environment':'live',**result,'files_preserved_backup':str(previous),'approved_counts':package['expected']}

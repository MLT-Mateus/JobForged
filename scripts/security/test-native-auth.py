#!/usr/bin/env python3
"""Real GoTrue/PostgREST acceptance against an explicitly isolated restore.

No public ports, production credentials, email delivery or Live resources.
Fixture credentials, JWTs, recovery links and TOTP seeds never leave memory.
"""
import argparse
import base64
import hashlib
import hmac
import ipaddress
import json
import os
from pathlib import Path
import secrets
import struct
import subprocess
import time
import urllib.error
import urllib.request
import uuid
import zlib
import tempfile
import traceback
import sys

def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kw).stdout.strip()

def inspect(name):
    return json.loads(run(['docker','inspect',name]))[0]

def jwt(secret,role,claims=None):
    enc=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).decode().rstrip('=')
    message=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':role,'iss':'supabase','iat':int(time.time()),'exp':int(time.time())+3600,**(claims or {})})
    return message+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),message.encode(),hashlib.sha256).digest()).decode().rstrip('=')

def totp_code(value):
    seed=base64.b32decode(value+'='*((8-len(value)%8)%8))
    digest=hmac.new(seed,struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest();offset=digest[-1]&15
    return str((struct.unpack('>I',digest[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('restore',nargs='?');parser.add_argument('--ci',action='store_true');args=parser.parse_args()
    ci_images={}
    policy=json.loads((Path(__file__).resolve().parents[2]/'shared/password-policy.json').read_text())
    characters=':'.join(policy[group].replace(':','\\:') for group in ('lower','upper','digits','symbols'))
    if args.ci:
        from native_ci_database import create_database
        args.restore,ci_images=create_database(Path(__file__).resolve().parents[2])
    if not args.restore:raise SystemExit('Disposable restore or --ci required')
    if not args.restore.startswith('jbfd-security-restore-') or inspect(args.restore)['Config']['Labels'].get('jbfd.security.disposable')!='true':
        raise SystemExit('Disposable restore required')
    if inspect(args.restore)['HostConfig']['PortBindings']:
        raise SystemExit('Restore must have no published ports')
    os.umask(0o077)
    stamp=str(int(time.time()));network='jbfd-security-http-'+stamp
    auth_name=network+'-auth';rest_name=network+'-rest';storage_name=network+'-storage';containers=[];env_files=[]
    work=Path(tempfile.mkdtemp(prefix='jbfd-native-http-')) if args.ci else Path('/opt/jbfd/security-work')
    socket='/var/run/postgresql' if args.ci else '/tmp'
    def sql(statement):
        return run(['docker','exec','-i',args.restore,'psql','-h',socket,'-XqAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],input=statement)
    def request(base,path,body=None,token=None,method=None):
        headers={'Content-Type':'application/json'}
        if token:headers['Authorization']='Bearer '+token
        req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
        try:
            with urllib.request.urlopen(req,timeout=10) as response:
                data=response.read();return response.status,json.loads(data) if data else None
        except urllib.error.HTTPError as error:
            try:data=json.loads(error.read())
            except ValueError:data=None
            return error.code,data
    def start(name,source,env,options=None,command=None,image=None):
        file=work/(name+'.env');file.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');env_files.append(file)
        image=image or ci_images.get(source) or inspect(source)['Image']
        run(['docker','run','-d','--name',name,'--label','jbfd.security.disposable=true','--network',network,'--memory','256m','--cpus','0.5','--env-file',str(file),*(options or []),image,*(command or [])]);containers.append(name)
        address=inspect(name)['NetworkSettings']['Networks'][network]['IPAddress']
        return address
    def binary_request(base,path,data,token,mime='image/png'):
        req=urllib.request.Request(base+path,data=data,headers={'Content-Type':mime,'Authorization':'Bearer '+token},method='POST' if data is not None else 'GET')
        try:
            with urllib.request.urlopen(req,timeout=15) as response:return response.status,response.read()
        except urllib.error.HTTPError as error:return error.code,None
        except urllib.error.URLError:return 0,None
    try:
        run(['docker','network','create','--internal',network])
        subnet=json.loads(run(['docker','network','inspect',network]))[0]['IPAM']['Config'][0]['Subnet']
        ipaddress.ip_network(subnet)
        if 'none' in inspect(args.restore)['NetworkSettings']['Networks']:
            run(['docker','network','disconnect','none',args.restore])
        run(['docker','network','connect','--alias','security-db',network,args.restore])
        if not args.ci:run(['docker','exec','-u','postgres',args.restore,'bash','-c',"printf '\nhost all all "+subnet+" scram-sha-256\\n' >> /tmp/jbfd-restore/pg_hba.conf"])
        auth_password=secrets.token_hex(24);rest_password=secrets.token_hex(24);signing=secrets.token_hex(32)
        sql("alter role supabase_auth_admin password '"+auth_password+"';alter role authenticator password '"+rest_password+"';alter system set listen_addresses='*';")
        run(['docker','restart',args.restore])
        for _ in range(60):
            try:sql('select 1;');break
            except subprocess.CalledProcessError:time.sleep(1)
        else:raise AssertionError('Isolated database restart failed')
        auth_ip=start(auth_name,'supabase-auth',{
            'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':'9999','API_EXTERNAL_URL':'http://example.invalid',
            'GOTRUE_SITE_URL':'http://example.invalid','GOTRUE_DB_DRIVER':'postgres',
            'GOTRUE_DB_DATABASE_URL':'postgres://supabase_auth_admin:'+auth_password+'@security-db:5432/postgres',
            'GOTRUE_JWT_SECRET':signing,'GOTRUE_JWT_EXP':'900','GOTRUE_JWT_AUD':'authenticated',
            'GOTRUE_JWT_DEFAULT_GROUP_NAME':'authenticated','GOTRUE_JWT_ADMIN_ROLES':'service_role',
            'GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'false',
            'GOTRUE_SMTP_HOST':'example.invalid','GOTRUE_SMTP_PORT':'25','GOTRUE_SMTP_ADMIN_EMAIL':'no-reply@example.invalid',
            'GOTRUE_PASSWORD_MIN_LENGTH':'8','GOTRUE_PASSWORD_REQUIRED_CHARACTERS':characters,
            'GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED':'true','GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL':'10',
            'GOTRUE_SESSIONS_TIMEBOX':'720h','GOTRUE_SESSIONS_INACTIVITY_TIMEOUT':'24h',
            'GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION':'true',
            'GOTRUE_MFA_TOTP_ENROLL_ENABLED':'true','GOTRUE_MFA_TOTP_VERIFY_ENABLED':'true'})
        rest_ip=start(rest_name,'supabase-rest',{'PGRST_DB_URI':'postgres://authenticator:'+rest_password+'@security-db:5432/postgres',
            'PGRST_DB_SCHEMAS':'public','PGRST_DB_ANON_ROLE':'anon','PGRST_JWT_SECRET':signing,'PGRST_SERVER_PORT':'3000'})
        auth='http://'+auth_ip+':9999';rest='http://'+rest_ip+':3000'
        for _ in range(60):
            if inspect(auth_name)['State']['Status']=='exited':
                logs=subprocess.run(['docker','logs',auth_name],capture_output=True,text=True)
                diagnostic=work/(auth_name+'.diagnostic');diagnostic.write_text(logs.stdout+logs.stderr)
                raise AssertionError('Isolated Auth configuration failed; private diagnostic '+str(diagnostic))
            try:
                if request(auth,'/health')[0]==200:break
            except OSError:pass
            time.sleep(1)
        else:raise AssertionError('Isolated Auth readiness failed')
        for _ in range(30):
            try:
                if request(rest,'/rpc/registration_requirements',{},jwt(signing,'anon'))[0]==200:break
            except OSError:pass
            time.sleep(1)
        else:
            logs=subprocess.run(['docker','logs',rest_name],capture_output=True,text=True)
            diagnostic=work/(rest_name+'.diagnostic');diagnostic.write_text(logs.stdout+logs.stderr)
            raise AssertionError('Isolated REST readiness failed; private diagnostic '+str(diagnostic))
        admin=jwt(signing,'service_role');password='Fixture9!'+secrets.token_hex(12)
        def create(email,company=None):
            data={'email':email,'password':password,'email_confirm':True}
            if company:
                status,requirements=request(rest,'/rpc/registration_requirements',{},jwt(signing,'anon'));assert status==200,'Registration requirements HTTP '+str(status)+' code '+str(requirements.get('code') if isinstance(requirements,dict) else None)
                status,nonce=request(rest,'/rpc/create_company_signup_intent',{'email':email,'company_name':company,'responsible_name':'Security fixture','cnpj':'11222333000181','phone':'11999999999','accepted_terms':True,'terms_revision':requirements['termsRevision']},jwt(signing,'anon'))
                assert status==200,'Native signup intent creation failed'
                data['user_metadata']={'account_type':'company_admin','company_signup_nonce':nonce,'company_name':'Untrusted override','role':'platform_admin','plan_id':'paid'}
            status,user=request(auth,'/admin/users',data,admin)
            if status not in (200,201):raise AssertionError('Native fixture creation failed')
            return user['id']
        suffix=stamp+'@example.invalid';email='security-a-'+suffix;other='security-b-'+suffix
        first=create(email,'Native fixture A');create(other,'Native fixture B')
        status,session=request(auth,'/token?grant_type=password',{'email':email,'password':password})
        assert status==200,'Native password sign-in failed'
        token=session['access_token'];status,context=request(rest,'/rpc/session_context_v1',{},token)
        assert status==200 and context['company_id'],'Signed JWT session contract failed'
        assert context['companies']['name']=='Native fixture A' and context['role']=='owner','Metadata overrode validated signup intent'
        assert request(rest,'/rpc/is_platform_admin',{},token)==(200,False),'Signup metadata granted platform role'
        assert sql("select raw_user_meta_data ? 'company_signup_nonce' from auth.users where id='"+first+"';")=='f','Raw signup capability persisted'
        assert request(rest,'/company_members?select=*',token=token)[0] in (401,403),'Direct roster SELECT exposed'
        assert request(auth,'/signup',{'email':'weak-'+suffix,'password':'abc'})[0] in (400,422),'Weak password not rejected by Auth'
        for index,symbol in enumerate(policy['symbols']):
            assert request(auth,'/admin/users',{'email':'symbol-'+str(index)+'-'+suffix,'password':'Abcdef9'+symbol,'email_confirm':True},admin)[0] in (200,201),'Approved password symbol rejected by Auth'
        status,link=request(auth,'/admin/generate_link',{'type':'recovery','email':email},admin)
        assert status==200,'Recovery link generation failed'
        status,recovery=request(auth,'/verify',{'type':'recovery','token_hash':link['hashed_token']})
        assert status==200,'Recovery verification failed'
        assert request(auth,'/verify',{'type':'recovery','token_hash':link['hashed_token']})[0] in (400,403),'Recovery link reused'
        recovery_token=recovery['access_token']
        status,nonce=request(rest,'/rpc/begin_password_recovery',{'purpose':'recovery'},recovery_token)
        assert status==200 and isinstance(nonce,str),'Recovery AMR not accepted'
        assert request(rest,'/rpc/consume_password_recovery',{'nonce':nonce},token)==(200,False),'Recovery accepted a different session'
        assert request(rest,'/rpc/consume_password_recovery',{'nonce':nonce},recovery_token)==(200,True),'Recovery capability failed'
        assert request(rest,'/rpc/consume_password_recovery',{'nonce':nonce},recovery_token)==(200,False),'Recovery capability reused'
        assert request(rest,'/rpc/revoke_current_session',{},token)[0] in (200,204),'Revocation failed'
        assert request(rest,'/rpc/session_context_v1',{},token)==(200,None),'Old signed JWT survived revocation'
        # Auth may still refresh a JWT when its logout call failed; the durable
        # application revocation must continue denying the same session ID.
        status,refreshed=request(auth,'/token?grant_type=refresh_token',{'refresh_token':session['refresh_token']})
        if status==200:
            assert request(rest,'/rpc/session_context_v1',{},refreshed['access_token'])==(200,None),'Refresh bypassed durable revocation'
        platform_email='security-platform-'+suffix;platform=create(platform_email)
        sql("insert into public.platform_admins(user_id,email,role) values('"+platform+"','"+platform_email+"','platform_admin');")
        status,platform_session=request(auth,'/token?grant_type=password',{'email':platform_email,'password':password})
        assert status==200,'Native platform sign-in failed'
        platform_token=platform_session['access_token']
        sql('update app_private.security_settings set admin_mfa_enforced=true where singleton;')
        assert request(rest,'/rpc/platform_read',{'section':'overview'},platform_token)[0]==403,'Native AAL1 bypassed MFA'
        status,factor=request(auth,'/factors',{'factor_type':'totp','friendly_name':'Isolated fixture'},platform_token)
        assert status==200,'Native TOTP enrollment failed'
        status,challenge=request(auth,'/factors/'+factor['id']+'/challenge',{},platform_token)
        assert status==200,'Native TOTP challenge failed'
        code=totp_code(factor['totp']['secret'])
        status,verified=request(auth,'/factors/'+factor['id']+'/verify',{'challenge_id':challenge['id'],'code':code},platform_token)
        assert status==200,'Native TOTP verification failed'
        assert request(rest,'/rpc/platform_read',{'section':'overview'},verified['access_token'])[0]==200,'Native fresh MFA denied'
        sql("update auth.mfa_amr_claims set created_at=now()-interval '1 hour',updated_at=now()-interval '1 hour' where session_id in(select id from auth.sessions where user_id='"+platform+"') and authentication_method='totp';")
        assert request(rest,'/rpc/platform_read',{'section':'overview'},verified['access_token'])[0]==403,'Native old MFA accepted'
        status,password_only=request(auth,'/token?grant_type=password',{'email':platform_email,'password':password});assert status==200
        assert request(auth,'/factors',{'factor_type':'totp','friendly_name':'Password only attempt'},password_only['access_token'])[0] in (401,403),'Password-only session enrolled an additional MFA factor'
        # Break-glass recovery uses the native admin endpoint, keeping application
        # MFA enforcement enabled and preserving the user's administrative role.
        assert request(auth,'/admin/users/'+platform+'/factors/'+factor['id'],token=admin,method='DELETE')[0] in (200,204),'Native administrative factor recovery failed'
        assert request(rest,'/rpc/platform_read',{'section':'overview'},verified['access_token'])[0]==403,'Removed factor retained business access'
        status,recovery_admin=request(auth,'/token?grant_type=password',{'email':platform_email,'password':password});assert status==200
        assert request(rest,'/rpc/platform_read',{'section':'overview'},recovery_admin['access_token'])[0]==403,'Factor recovery disabled MFA enforcement'
        status,new_factor=request(auth,'/factors',{'factor_type':'totp','friendly_name':'Recovered fixture'},recovery_admin['access_token']);assert status==200,'Recovered administrator cannot enroll'
        status,new_challenge=request(auth,'/factors/'+new_factor['id']+'/challenge',{},recovery_admin['access_token']);assert status==200
        status,recovered=request(auth,'/factors/'+new_factor['id']+'/verify',{'challenge_id':new_challenge['id'],'code':totp_code(new_factor['totp']['secret'])},recovery_admin['access_token']);assert status==200
        assert request(rest,'/rpc/platform_read',{'section':'overview'},recovered['access_token'])[0]==200,'Recovered administrator denied after new factor'
        sql('update app_private.security_settings set admin_mfa_enforced=false where singleton;')
        storage_password=secrets.token_hex(24)
        sql("alter role supabase_storage_admin password '"+storage_password+"';")
        storage_ip=start(storage_name,'supabase-storage',{
            'ANON_KEY':jwt(signing,'anon'),'SERVICE_KEY':admin,'AUTH_JWT_SECRET':signing,
            'DATABASE_URL':'postgres://supabase_storage_admin:'+storage_password+'@security-db:5432/postgres',
            'POSTGREST_URL':'http://'+rest_name+':3000','FILE_SIZE_LIMIT':'5242880','STORAGE_BACKEND':'file',
            'FILE_STORAGE_BACKEND_PATH':'/var/lib/storage','TENANT_ID':'stub','REGION':'stub','GLOBAL_S3_BUCKET':'stub',
            'ENABLE_IMAGE_TRANSFORMATION':'false','REQUEST_ALLOW_X_FORWARDED_PATH':'true',
            'S3_PROTOCOL_ACCESS_KEY_ID':'isolated-test','S3_PROTOCOL_ACCESS_KEY_SECRET':secrets.token_hex(24)})
        storage='http://'+storage_ip+':5000'
        for _ in range(60):
            if inspect(storage_name)['State']['Status']=='exited':raise AssertionError('Isolated Storage configuration failed')
            try:
                if request(storage,'/status')[0]==200:break
            except OSError:pass
            time.sleep(1)
        else:raise AssertionError('Isolated Storage readiness failed')
        status,new_session=request(auth,'/token?grant_type=password',{'email':email,'password':password});assert status==200
        own_token=new_session['access_token'];status,own_context=request(rest,'/rpc/session_context_v1',{},own_token);assert status==200
        status,other_session=request(auth,'/token?grant_type=password',{'email':other,'password':password});assert status==200
        asset=str(uuid.uuid4());path='/object/company-branding/'+own_context['company_id']+'/'+asset+'.png'
        assert request(rest,'/rpc/reserve_company_image',{'asset_id':asset},own_token)[0]==200,'Native upload reservation failed'
        def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
        png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0\0\x80\x80\xff'))+chunk(b'IEND',b'')
        assert binary_request(storage,path,png,own_token)[0]==200,'Native reserved upload failed'
        assert binary_request(storage,path,None,own_token)==(200,png),'Native own asset read failed'
        assert binary_request(storage,path,None,other_session['access_token'])[0] in (400,403,404),'Native cross-tenant asset exposed'
        unreserved='/object/company-branding/'+own_context['company_id']+'/'+str(uuid.uuid4())+'.png'
        assert binary_request(storage,unreserved,png,own_token)[0] in (400,403),'Native unreserved upload accepted'
        assert request(rest,'/rpc/register_company_brand_asset',{'asset_id':asset,'file_name':'fixture.png','file_size':len(png),'file_sha256':hashlib.sha256(png).hexdigest()},own_token)[0]==200,'Native asset registration failed'
        html_asset=str(uuid.uuid4());html_path='/object/company-branding/'+own_context['company_id']+'/'+html_asset+'.png'
        assert request(rest,'/rpc/reserve_company_image',{'asset_id':html_asset},own_token)[0]==200
        assert binary_request(storage,html_path,b'<html>invalid</html>',own_token,'text/html')[0] in (400,403,415),'Native executable type accepted'
        large_asset=str(uuid.uuid4());large_path='/object/company-branding/'+own_context['company_id']+'/'+large_asset+'.png'
        assert request(rest,'/rpc/reserve_company_image',{'asset_id':large_asset},own_token)[0]==200
        assert binary_request(storage,large_path,png+b'\0'*5242880,own_token)[0] in (0,400,413),'Native file size limit bypassed'
        assert request(storage,'/status')[0]==200,'Storage unavailable after large request'
        assert sql("select count(*) from storage.objects where bucket_id='company-branding' and name='"+own_context['company_id']+'/'+large_asset+".png';")=='0','Oversized object persisted'
        status,other_context=request(rest,'/rpc/session_context_v1',{},other_session['access_token']);assert status==200
        orphan=str(uuid.uuid4());orphan_name=other_context['company_id']+'/'+orphan+'.png';job=str(uuid.uuid4());copy=job+'/image.png'
        assert request(rest,'/rpc/reserve_company_image',{'asset_id':orphan},other_session['access_token'])[0]==200
        assert binary_request(storage,'/object/company-branding/'+orphan_name,png,other_session['access_token'])[0]==200
        sql("update storage.objects set created_at=now()-interval '2 days' where bucket_id='company-branding' and name='"+orphan_name+"';update app_private.company_upload_reservations set expires_at=now()-interval '1 day' where asset_id='"+orphan+"';")
        assert sql("select app_private.orphan_eligible('"+orphan_name+"');")=='t','Abandoned upload not eligible'
        sql("update storage.objects set created_at=now()-interval '2 days' where bucket_id='company-branding' and name='"+own_context['company_id']+'/'+asset+".png';")
        assert sql("select app_private.orphan_eligible('"+own_context['company_id']+'/'+asset+".png');")=='f','Registered asset eligible for collection'
        sql("insert into app_private.orphan_quarantine(id,company_id,object_name) values('"+job+"','"+other_context['company_id']+"','"+orphan_name+"');")
        maintenance=jwt(signing,'authenticated',{'sub':'00000000-0000-4000-8000-000000000084','aud':'authenticated','maintenance':'orphan-cleanup','job':job,'exp':int(time.time())+120})
        assert request(rest,'/rpc/session_context_v1',{},maintenance)==(200,None),'Maintenance capability gained business identity'
        assert binary_request(storage,'/object/company-branding/'+orphan_name,None,maintenance)==(200,png)
        assert binary_request(storage,path,None,maintenance)[0] in (400,403,404),'Maintenance read registered asset'
        assert binary_request(storage,'/object/security-quarantine/'+copy,png,maintenance)[0]==200,'Private quarantine insert failed'
        assert binary_request(storage,'/object/security-quarantine/'+copy,None,maintenance)==(200,png),'Quarantine readback failed'
        assert binary_request(storage,'/object/security-quarantine/'+copy,None,other_session['access_token'])[0] in (400,403,404),'Ordinary user read quarantine'
        request(storage,'/object/company-branding',{'prefixes':[orphan_name]},maintenance,method='DELETE')
        assert sql("select exists(select 1 from storage.objects where bucket_id='company-branding' and name='"+orphan_name+"');")=='t','Unverified source deleted'
        sql("update app_private.orphan_quarantine set verified_at=now(),sha256='"+hashlib.sha256(png).hexdigest()+"',bytes="+str(len(png))+" where id='"+job+"';")
        assert request(storage,'/object/company-branding',{'prefixes':[orphan_name]},maintenance,method='DELETE')[0]==200,'Verified source delete failed'
        assert sql("select exists(select 1 from storage.objects where bucket_id='company-branding' and name='"+orphan_name+"');")=='f','Verified source retained'
        sql("update app_private.orphan_quarantine set source_removed_at=now() where id='"+job+"';")
        request(storage,'/object/security-quarantine',{'prefixes':[copy]},maintenance,method='DELETE')
        assert binary_request(storage,'/object/security-quarantine/'+copy,None,maintenance)==(200,png),'Quarantine purged before retention and offsite approval'
        sql("update app_private.orphan_quarantine set verified_at=now()-interval '8 days' where id='"+job+"';")
        request(storage,'/object/security-quarantine',{'prefixes':[copy]},maintenance,method='DELETE')
        assert binary_request(storage,'/object/security-quarantine/'+copy,None,maintenance)==(200,png),'Quarantine purged without offsite approval'
        sql("update app_private.orphan_quarantine set purge_approved_at=now() where id='"+job+"';")
        assert request(storage,'/object/security-quarantine',{'prefixes':[copy]},maintenance,method='DELETE')[0]==200
        assert binary_request(storage,'/object/security-quarantine/'+copy,None,maintenance)[0] in (400,403,404),'Approved quarantine purge failed'
        worker_asset=str(uuid.uuid4());worker_name=other_context['company_id']+'/'+worker_asset+'.png'
        assert request(rest,'/rpc/reserve_company_image',{'asset_id':worker_asset},other_session['access_token'])[0]==200
        assert binary_request(storage,'/object/company-branding/'+worker_name,png,other_session['access_token'])[0]==200
        sql("update storage.objects set created_at=now()-interval '2 days' where bucket_id='company-branding' and name='"+worker_name+"';update app_private.company_upload_reservations set expires_at=now()-interval '1 day' where asset_id='"+worker_asset+"';")
        result=json.loads(run([sys.executable,str(Path(__file__).with_name('quarantine-test-orphans.py')),'--isolated-database',args.restore,'--isolated-storage',storage_name]))
        assert result['quarantined']==1 and result['purged_after_offsite_receipt']==0,'Real orphan worker failed or purged without receipt'
        for number in range(10):
            assert request(rest,'/rpc/create_company_invitation',{'target_company_id':other_context['company_id'],'invite_email':'budget-'+str(number)+'-'+suffix,'invite_role':'member'},other_session['access_token'])[0]==200,'Invitation budget rejected valid fixture'
        assert request(rest,'/rpc/create_company_invitation',{'target_company_id':other_context['company_id'],'invite_email':'budget-over-'+suffix,'invite_role':'member'},other_session['access_token'])[0]==429,'Direct invitation RPC bypassed company budget'
        second_owner_email='security-second-owner-'+suffix;second_owner=create(second_owner_email)
        sql("insert into public.company_members(company_id,user_id,email,full_name,role,status) values('"+own_context['company_id']+"','"+second_owner+"','"+second_owner_email+"','Isolated second owner','owner','active');")
        sql("update public.company_members set status='inactive' where user_id='"+first+"';")
        assert request(rest,'/rpc/session_context_v1',{},own_token)==(200,None),'Inactive membership accepted'
        assert binary_request(storage,path,None,own_token)[0] in (400,403,404),'Inactive membership read Storage'
        sql("update public.company_members set status='active' where user_id='"+first+"';update public.companies set operational_status='suspended' where id='"+own_context['company_id']+"';")
        assert request(rest,'/rpc/company_read_v1',{},own_token)[0]==403,'Suspended company accepted'
        sql("update public.companies set operational_status='active' where id='"+own_context['company_id']+"';")
        assert request(auth,'/logout?scope=global',{},own_token)[0] in (200,204),'Native logout failed'
        assert request(rest,'/rpc/session_context_v1',{},own_token)==(200,None),'Native logout retained business access'
        routes=[];clusters=[]
        for prefix,name,port in [('/auth/v1/',auth_name,9999),('/rest/v1/',rest_name,3000),('/storage/v1/',storage_name,5000)]:
            routes.append({'match':{'prefix':prefix},'route':{'cluster':name,'prefix_rewrite':'/','timeout':'30s'}})
            clusters.append({'name':name,'connect_timeout':'2s','type':'STRICT_DNS','load_assignment':{'cluster_name':name,'endpoints':[{'lb_endpoints':[{'endpoint':{'address':{'socket_address':{'address':name,'port_value':port}}}}]}]}})
        envoy_config={'static_resources':{'listeners':[{'name':'api','address':{'socket_address':{'address':'0.0.0.0','port_value':8000}},'filter_chains':[{'filters':[{'name':'envoy.filters.network.http_connection_manager','typed_config':{'@type':'type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager','stat_prefix':'isolated','route_config':{'name':'api','virtual_hosts':[{'name':'api','domains':['*'],'routes':routes}]},'http_filters':[{'name':'envoy.filters.http.router','typed_config':{'@type':'type.googleapis.com/envoy.extensions.filters.http.router.v3.Router'}}]}}]}]}],'clusters':clusters}}
        config_file=work/(network+'-envoy.json');config_file.write_text(json.dumps(envoy_config));config_file.chmod(0o644);env_files.append(config_file)
        start(network+'-envoy','supabase-envoy',{},options=['--network-alias','supabase-envoy','-v',str(config_file)+':/etc/envoy/envoy.yaml:ro'],command=['-c','/etc/envoy/envoy.yaml'])
        gateway_password=secrets.token_hex(24);sql("alter role jbfd_security_gateway password '"+gateway_password+"';")
        stub_code="""import http from 'node:http';http.createServer(async(req,res)=>{
          if(req.url==='/api/echo'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({host:req.headers.host,protocol:req.headers['x-forwarded-proto']}));return;}
          const chunks=[];for await(const c of req)chunks.push(c);
          const upstream=await fetch('http://security-gateway:8080/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:Buffer.concat(chunks)});
          res.writeHead(upstream.status,{'Content-Type':'application/json'});res.end(await upstream.text());
        }).listen(3000,'0.0.0.0');"""
        start(network+'-bff',None,{},options=['--network-alias','jbfd-test-app-1','--entrypoint','node'],command=['--input-type=module','-e',stub_code],image='jbfd-security-gateway:isolated-acceptance')
        gateway_env={'APP_ENV':'test','DATABASE_URL':'postgres://jbfd_security_gateway:'+gateway_password+'@security-db:5432/postgres','RATE_SCOPE_SECRET':secrets.token_hex(32),'UPSTREAM_URL':'http://supabase-envoy:8000','TRUSTED_PROXY_HOST':'supabase-envoy','TRUSTED_BFF_HOST':'jbfd-test-app-1'}
        gateways=[]
        for number in (1,2):
            name=network+'-gateway-'+str(number)
            address=start(name,None,gateway_env,options=['--network-alias','security-gateway'] if number==1 else [],image='jbfd-security-gateway:isolated-acceptance');base='http://'+address+':8080'
            for _ in range(30):
                try:
                    if request(base,'/healthz')[0]==200:break
                except OSError:pass
                time.sleep(1)
            else:raise AssertionError('Isolated security gateway readiness failed')
            gateways.append((name,base))
        assert request(gateways[0][1],'/auth/v1/health')[0]==200,'Gateway Auth forwarding failed'
        assert binary_request(gateways[0][1],'/storage/v1/object/company-branding/'+orphan_name,None,maintenance)[0]==401,'Private maintenance capability accepted publicly'
        assert request(gateways[0][1],'/auth/v1/signup',{'email':'unicode-'+suffix,'password':'Ab1!ééé'})[0]==422,'Gateway accepted fewer than eight Unicode characters'
        assert request(gateways[0][1],'/auth/v1/signup',{'email':'long-'+suffix,'password':'Ab1!'+'é'*35})[0]==422,'Gateway accepted more than 72 UTF-8 bytes'
        before=int(sql("select coalesce(sum(hits),0) from app_private.request_limits where scope like 'login-account:%';"))
        assert request(gateways[0][1],'/api/auth/sign-in',{'email':other,'password':password})[0]==200,'BFF parent-to-native forwarding failed'
        after=int(sql("select coalesce(sum(hits),0) from app_private.request_limits where scope like 'login-account:%';"))
        assert after==before+1,'BFF child counted the same action twice'
        assert request(gateways[0][1],'/api/echo')[1]['protocol']=='https','BFF proxy lost HTTPS origin'
        sql('update app_private.security_settings set admin_mfa_enforced=true where singleton;')
        assert request(auth,'/admin/users/'+platform+'/factors/'+new_factor['id'],token=admin,method='DELETE')[0] in (200,204)
        status,admin_reentry=request(auth,'/token?grant_type=password',{'email':platform_email,'password':password});assert status==200
        assert request(gateways[0][1],'/auth/v1/factors',{'factor_type':'totp','friendly_name':'Denied without root approval'},admin_reentry['access_token'])[0]==401,'Unapproved factor recovery accepted'
        reentry_claims=json.loads(base64.urlsafe_b64decode(admin_reentry['access_token'].split('.')[1]+'=='))
        sql("insert into app_private.administrative_factor_recovery(user_id,session_id,expires_at,reason) values('"+platform+"','"+reentry_claims['session_id']+"',now()+interval '10 minutes','Isolated acceptance recovery approval');")
        status,public_factor=request(gateways[0][1],'/auth/v1/factors',{'factor_type':'totp','friendly_name':'Root approved recovery'},admin_reentry['access_token']);assert status==200,'Root-approved session cannot enroll through gateway'
        assert request(gateways[0][1],'/auth/v1/factors',{'factor_type':'totp','friendly_name':'Reused approval'},admin_reentry['access_token'])[0]==401,'Recovery approval reused'
        status,public_challenge=request(gateways[0][1],'/auth/v1/factors/'+public_factor['id']+'/challenge',{},admin_reentry['access_token']);assert status==200
        status,public_verified=request(gateways[0][1],'/auth/v1/factors/'+public_factor['id']+'/verify',{'challenge_id':public_challenge['id'],'code':totp_code(public_factor['totp']['secret'])},admin_reentry['access_token']);assert status==200
        assert request(gateways[0][1],'/rest/v1/rpc/platform_read',{'section':'overview'},public_verified['access_token'])[0]==200,'Re-enrolled administrator denied'
        assert int(sql("select count(*) from app_private.administrative_recovery_audit where user_id='"+platform+"';"))==2,'Factor recovery approval/consumption not audited'
        assert request(auth,'/logout?scope=global',{},public_verified['access_token'])[0] in (200,204),'Recovery grant prevented session cleanup'
        sql('update app_private.security_settings set admin_mfa_enforced=false where singleton;')
        assert request(gateways[0][1],'/rest/v1/rpc/company_read_v1',{},other_session['access_token'])[0]==200,'Gateway RPC forwarding failed'
        assert request(gateways[0][1],'/auth/v1/user',token=own_token)[0]==401,'Gateway accepted logged-out Auth session'
        assert request(gateways[0][1],'/auth/v1/%75ser',token=own_token)[0]==400,'Encoded path bypassed session gate'
        assert request(gateways[0][1],'/auth/v1/admin/users',token=admin)[0]==403,'Privileged Auth exposed publicly'
        assert request(gateways[0][1],'/rest/v1/companies',token=admin)[0]==403,'Service credential accepted at public API'
        assert request(gateways[0][1],'/storage/v1/object/sign/company-branding/test',{},other_session['access_token'])[0]==403,'Unbound signed URL capability exposed'
        hints=json.loads(base64.urlsafe_b64decode(other_session['access_token'].split('.')[1]+'=='))
        fake=jwt(signing,'authenticated').split('.');fake[1]=base64.urlsafe_b64encode(json.dumps(hints).encode()).decode().rstrip('=')
        assert request(gateways[0][1],'/auth/v1/user',token='.'.join(fake))[0] in (401,403),'Unverified session hints authorized forged JWT'
        limited_email='gateway-rate-'+suffix
        for index in range(5):
            request(gateways[index%2][1],'/auth/v1/recover',{'email':limited_email})
        status,limited=request(gateways[1][1],'/auth/v1/recover',{'email':limited_email})
        assert status==429 and limited.get('message')=='Too many requests. Try again later.','Gateway instances did not share rate state'
        run(['docker','restart',gateways[0][0]])
        for _ in range(30):
            try:
                if request(gateways[0][1],'/healthz')[0]==200:break
            except OSError:pass
            time.sleep(1)
        status,limited=request(gateways[0][1],'/auth/v1/recover',{'email':limited_email})
        assert status==429 and limited.get('message')=='Too many requests. Try again later.','Gateway restart lost rate state'
        expiry_email='expiry-'+suffix;expiry_person=create(expiry_email,'Expiry fixture')
        status,expiry=request(auth,'/token?grant_type=password',{'email':expiry_email,'password':password});assert status==200
        claims=json.loads(base64.urlsafe_b64decode(expiry['access_token'].split('.')[1]+'=='));sid=claims['session_id']
        assert claims['exp']-claims['iat']==900,'Native JWT lifetime differs from 15 minutes'
        sql("update auth.sessions set created_at=now()-interval '31 days' where id='"+sid+"';")
        assert request(rest,'/rpc/company_read_v1',{},expiry['access_token'])[0]==403,'Expired session retained data access'
        assert request(auth,'/token?grant_type=refresh_token',{'refresh_token':expiry['refresh_token']})[0] in (400,401),'Expired session refreshed'
        status,idle=request(auth,'/token?grant_type=password',{'email':expiry_email,'password':password});assert status==200
        claims=json.loads(base64.urlsafe_b64decode(idle['access_token'].split('.')[1]+'=='));sid=claims['session_id']
        sql("update auth.sessions set created_at=now()-interval '2 days',refreshed_at=(now()-interval '25 hours') at time zone 'UTC' where id='"+sid+"';")
        assert request(rest,'/rpc/company_read_v1',{},idle['access_token'])[0]==403,'Inactive session retained data access'
        assert request(auth,'/token?grant_type=refresh_token',{'refresh_token':idle['refresh_token']})[0] in (400,401),'Inactive session refreshed'
        status,concurrent_a=request(auth,'/token?grant_type=password',{'email':expiry_email,'password':password});assert status==200
        status,concurrent_b=request(auth,'/token?grant_type=password',{'email':expiry_email,'password':password});assert status==200
        status,link=request(auth,'/admin/generate_link',{'type':'recovery','email':expiry_email},admin);assert status==200
        status,password_session=request(auth,'/verify',{'type':'recovery','token_hash':link['hashed_token']});assert status==200
        status,nonce=request(rest,'/rpc/begin_password_recovery',{'purpose':'recovery'},password_session['access_token']);assert status==200
        assert request(rest,'/rpc/consume_password_recovery',{'nonce':nonce},password_session['access_token'])==(200,True)
        changed='Changed9!'+secrets.token_hex(12)
        assert request(auth,'/user',{'password':changed},password_session['access_token'],method='PUT')[0]==200,'Verified password recovery update failed'
        assert request(auth,'/token?grant_type=password',{'email':expiry_email,'password':password})[0]==400,'Old password remained valid'
        assert request(auth,'/token?grant_type=password',{'email':expiry_email,'password':changed})[0]==200,'New password failed'
        for concurrent in [concurrent_a,concurrent_b]:
            assert request(rest,'/rpc/company_read_v1',{},concurrent['access_token'])[0]==403,'Password change retained another session'
        rotation_email='rotation-'+suffix;create(rotation_email)
        status,rotation=request(auth,'/token?grant_type=password',{'email':rotation_email,'password':password});assert status==200
        status,rotated=request(auth,'/token?grant_type=refresh_token',{'refresh_token':rotation['refresh_token']});assert status==200
        status,rotated_again=request(auth,'/token?grant_type=refresh_token',{'refresh_token':rotated['refresh_token']});assert status==200
        assert rotation['refresh_token']!=rotated['refresh_token']!=rotated_again['refresh_token'],'Refresh tokens did not rotate'
        time.sleep(11)
        assert request(auth,'/token?grant_type=refresh_token',{'refresh_token':rotation['refresh_token']})[0]==400,'Replayed refresh ancestor remained valid beyond grace'
        # This provider rejects the stale ancestor but retains the current
        # refresh token. Do not report family-wide revocation that did not occur.
        assert request(auth,'/token?grant_type=refresh_token',{'refresh_token':rotated_again['refresh_token']})[0]==200,'Current refresh token unexpectedly rejected'
        print(json.dumps({'native_password_login':True,'signed_jwt_rpc':True,'direct_select_denied':True,
            'native_password_policy':True,'recovery_link_single_use':True,'recovery_session_binding':True,'recovery_nonce_single_use':True,'revoked_jwt_denied':True,
            'refresh_cannot_bypass_revocation':True,'native_mfa_enrollment':True,'native_mfa_freshness':True,
            'password_only_mfa_replacement_denied':True,'native_admin_factor_recovery':True,
            'native_storage_upload':True,'native_storage_tenant_isolation':True,'native_storage_requires_reservation':True,'native_asset_registration':True,'native_storage_type_restriction':True,'native_storage_size_limit':True,
            'inactive_member_denied':True,'suspended_company_denied':True,'native_logout_denied_old_jwt':True,
            'gateway_native_forwarding':True,'gateway_shared_rate_state':True,'gateway_rate_state_survives_restart':True,
            'validated_signup_intent':True,'metadata_cannot_grant_platform_role':True,'raw_signup_capability_not_persisted':True,
            'gateway_denies_revoked_auth_session':True,'gateway_rejects_path_alias_bypass':True,'public_privileged_credentials_denied':True,'unsigned_session_hints_do_not_authorize':True,
            'bff_transport_and_single_budget':True,'all_password_symbols':True,'jwt_15_minutes':True,'session_30_days':True,'session_inactivity_24_hours':True,'native_password_change':True,
            'orphan_verified_quarantine':True,'registered_assets_never_collected':True,'quarantine_retention_gate':True,'maintenance_no_business_or_public_access':True,
            'root_approved_session_bound_factor_recovery':True,
            'real_orphan_worker':True,
            'direct_invitation_budget':True,'password_change_revokes_other_sessions':True,'refresh_rotation_old_token_rejected':True,'native_replay_revokes_current_family':False,
            'network_internal':True,'published_ports':[],'outbound_email':False}))
    finally:
        for name in reversed(containers):
            subprocess.run(['docker','rm','-f',name],capture_output=True)
        for file in env_files:file.unlink(missing_ok=True)
        subprocess.run(['docker','network','disconnect',network,args.restore],capture_output=True)
        if args.ci:subprocess.run(['docker','rm','-fv',args.restore],capture_output=True)
        else:subprocess.run(['docker','network','connect','none',args.restore],capture_output=True)
        subprocess.run(['docker','network','rm',network],capture_output=True)
        if args.ci and not any(work.iterdir()):work.rmdir()

if __name__=='__main__':
    try:main()
    except Exception as error:
        # No provider payloads, generated credentials or request contents.
        print(json.dumps({'passed':False,'error_type':type(error).__name__,'line':traceback.extract_tb(error.__traceback__)[-1].lineno,'operation':error.cmd[:4] if isinstance(error,subprocess.CalledProcessError) else None,'detail':str(error) if isinstance(error,AssertionError) else 'Inspect private isolated service diagnostics'}))
        raise SystemExit(1)

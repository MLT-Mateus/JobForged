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

def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kw).stdout.strip()

def inspect(name):
    return json.loads(run(['docker','inspect',name]))[0]

def jwt(secret,role):
    enc=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).decode().rstrip('=')
    message=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':role,'iss':'supabase','iat':int(time.time()),'exp':int(time.time())+3600})
    return message+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),message.encode(),hashlib.sha256).digest()).decode().rstrip('=')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('restore');args=parser.parse_args()
    if not args.restore.startswith('jbfd-security-restore-') or inspect(args.restore)['Config']['Labels'].get('jbfd.security.disposable')!='true':
        raise SystemExit('Disposable restore required')
    if inspect(args.restore)['HostConfig']['PortBindings']:
        raise SystemExit('Restore must have no published ports')
    os.umask(0o077)
    stamp=str(int(time.time()));network='jbfd-security-http-'+stamp
    auth_name=network+'-auth';rest_name=network+'-rest';storage_name=network+'-storage';containers=[];env_files=[]
    def sql(statement):
        return run(['docker','exec','-i',args.restore,'psql','-h','/tmp','-XqAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],input=statement)
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
    def start(name,source,env):
        file=Path('/opt/jbfd/security-work')/(name+'.env');file.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');env_files.append(file)
        image=inspect(source)['Image']
        run(['docker','run','-d','--name',name,'--label','jbfd.security.disposable=true','--network',network,'--memory','256m','--cpus','0.5','--env-file',str(file),image]);containers.append(name)
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
        run(['docker','exec','-u','postgres',args.restore,'bash','-c',"printf '\nhost all all "+subnet+" scram-sha-256\\n' >> /tmp/jbfd-restore/pg_hba.conf"])
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
            'GOTRUE_PASSWORD_MIN_LENGTH':'8','GOTRUE_PASSWORD_REQUIRED_CHARACTERS':'abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*',
            'GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED':'true','GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL':'0',
            'GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION':'true',
            'GOTRUE_MFA_TOTP_ENROLL_ENABLED':'true','GOTRUE_MFA_TOTP_VERIFY_ENABLED':'true'})
        rest_ip=start(rest_name,'supabase-rest',{'PGRST_DB_URI':'postgres://authenticator:'+rest_password+'@security-db:5432/postgres',
            'PGRST_DB_SCHEMAS':'public','PGRST_DB_ANON_ROLE':'anon','PGRST_JWT_SECRET':signing,'PGRST_SERVER_PORT':'3000'})
        auth='http://'+auth_ip+':9999';rest='http://'+rest_ip+':3000'
        for _ in range(60):
            if inspect(auth_name)['State']['Status']=='exited':raise AssertionError('Isolated Auth configuration failed')
            try:
                if request(auth,'/health')[0]==200:break
            except OSError:pass
            time.sleep(1)
        else:raise AssertionError('Isolated Auth readiness failed')
        admin=jwt(signing,'service_role');password='Fixture9!'+secrets.token_hex(12)
        def create(email,company=None):
            data={'email':email,'password':password,'email_confirm':True}
            if company:data['user_metadata']={'account_type':'company_admin','company_name':company,'responsible_name':'Security fixture','company_cnpj':'11222333000181','phone':'11999999999','terms_accepted_at':'2026-01-01T00:00:00Z'}
            status,user=request(auth,'/admin/users',data,admin)
            if status not in (200,201):raise AssertionError('Native fixture creation failed')
            return user['id']
        suffix=stamp+'@example.invalid';email='security-a-'+suffix;other='security-b-'+suffix
        first=create(email,'Native fixture A');create(other,'Native fixture B')
        status,session=request(auth,'/token?grant_type=password',{'email':email,'password':password})
        assert status==200,'Native password sign-in failed'
        token=session['access_token'];status,context=request(rest,'/rpc/session_context_v1',{},token)
        assert status==200 and context['company_id'],'Signed JWT session contract failed'
        assert request(rest,'/company_members?select=*',token=token)[0] in (401,403),'Direct roster SELECT exposed'
        assert request(auth,'/signup',{'email':'weak-'+suffix,'password':'abc'})[0] in (400,422),'Weak password not rejected by Auth'
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
        seed=base64.b32decode(factor['totp']['secret']+'='*((8-len(factor['totp']['secret'])%8)%8))
        digest=hmac.new(seed,struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest();offset=digest[-1]&15
        code=str((struct.unpack('>I',digest[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)
        status,verified=request(auth,'/factors/'+factor['id']+'/verify',{'challenge_id':challenge['id'],'code':code},platform_token)
        assert status==200,'Native TOTP verification failed'
        assert request(rest,'/rpc/platform_read',{'section':'overview'},verified['access_token'])[0]==200,'Native fresh MFA denied'
        sql("update auth.mfa_amr_claims set created_at=now()-interval '1 hour',updated_at=now()-interval '1 hour' where session_id in(select id from auth.sessions where user_id='"+platform+"') and authentication_method='totp';")
        assert request(rest,'/rpc/platform_read',{'section':'overview'},verified['access_token'])[0]==403,'Native old MFA accepted'
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
        png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=')
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
        print(json.dumps({'native_password_login':True,'signed_jwt_rpc':True,'direct_select_denied':True,
            'native_password_policy':True,'recovery_link_single_use':True,'recovery_session_binding':True,'recovery_nonce_single_use':True,'revoked_jwt_denied':True,
            'refresh_cannot_bypass_revocation':True,'native_mfa_enrollment':True,'native_mfa_freshness':True,
            'native_storage_upload':True,'native_storage_tenant_isolation':True,'native_storage_requires_reservation':True,'native_asset_registration':True,'native_storage_type_restriction':True,'native_storage_size_limit':True,
            'inactive_member_denied':True,'suspended_company_denied':True,'native_logout_denied_old_jwt':True,
            'network_internal':True,'published_ports':[],'outbound_email':False}))
    finally:
        for name in reversed(containers):
            subprocess.run(['docker','rm','-f',name],capture_output=True)
        for file in env_files:file.unlink(missing_ok=True)
        subprocess.run(['docker','network','disconnect',network,args.restore],capture_output=True)
        subprocess.run(['docker','network','connect','none',args.restore],capture_output=True)
        subprocess.run(['docker','network','rm',network],capture_output=True)

if __name__=='__main__':
    try:main()
    except Exception as error:
        # No provider payloads, generated credentials or request contents.
        print(json.dumps({'passed':False,'error_type':type(error).__name__,'operation':error.cmd[:4] if isinstance(error,subprocess.CalledProcessError) else None,'detail':str(error) if isinstance(error,AssertionError) else 'Inspect private isolated service diagnostics'}))
        raise SystemExit(1)

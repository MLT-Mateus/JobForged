#!/usr/bin/env python3
"""One-time Test-only reconciliation of valid registrations under no-confirm policy.
Never changes passwords, MFA, roles, suspended users or Live. No SMTP calls.
"""
import base64
import hashlib
import hmac
import json
from pathlib import Path
import subprocess
import time
import urllib.request
from environment_profiles import Environment, verified_backup

def run(args):return subprocess.check_output(args,text=True).strip()
def sql(query):return run(['docker','exec','supabase-db','psql','-XqAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',query])
def main():
 environment=Environment('test')
 for receipt in sorted(Path('/opt/jbfd/backups/security').glob('test-*/offsite-receipt.json'),reverse=True):
  try:verified_backup(environment,receipt.parent);break
  except (ValueError,OSError,KeyError):continue
 else:raise SystemExit('Recent restored/offsite Test backup required')
 info=json.loads(run(['docker','inspect','supabase-auth']))[0]
 env=dict(v.split('=',1) for v in info['Config']['Env'])
 if env.get('GOTRUE_MAILER_AUTOCONFIRM')!='true' or env.get('GOTRUE_SITE_URL')!='https://test.jobforged.com':raise SystemExit('Test immediate-signup policy required')
 ids=json.loads(sql("select coalesce(json_agg(u.id),'[]') from auth.users u where u.email_confirmed_at is null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and u.raw_user_meta_data->>'account_type'='company_admin' and exists(select 1 from public.company_members m join public.companies c on c.id=m.company_id where m.user_id=u.id and m.email=lower(u.email) and m.role='owner' and m.status='active' and c.operational_status='active' and c.terms_accepted_at is not null and app_private.valid_cnpj(c.cnpj)) and not exists(select 1 from public.platform_admins p where p.user_id=u.id);"))
 if len(ids)>20:raise SystemExit('Unexpected reconciliation size')
 enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).decode().rstrip('=')
 payload=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':'service_role','iss':'supabase','iat':int(time.time()),'exp':int(time.time())+60})
 token=payload+'.'+base64.urlsafe_b64encode(hmac.new(env['GOTRUE_JWT_SECRET'].encode(),payload.encode(),hashlib.sha256).digest()).decode().rstrip('=')
 ip=next(v['IPAddress'] for v in info['NetworkSettings']['Networks'].values() if v.get('IPAddress'))
 for user_id in ids:
  request=urllib.request.Request('http://'+ip+':9999/admin/users/'+user_id,data=b'{"email_confirm":true}',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='PUT')
  with urllib.request.urlopen(request,timeout=10) as response:
   if not json.load(response).get('email_confirmed_at'):raise RuntimeError('Test activation failed')
  sql("insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details) select m.company_id,null,'company.signup.test_activation',m.user_id,jsonb_build_object('source','authorized_test_no_confirmation_policy','password_unchanged',true) from public.company_members m where m.user_id='"+user_id+"' and m.status='active';")
 print(json.dumps({'environment':'test','activated':len(ids),'passwords_roles_mfa_unchanged':True,'external_messages_sent':0}))
if __name__=='__main__':main()

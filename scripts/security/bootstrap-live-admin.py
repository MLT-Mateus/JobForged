#!/usr/bin/env python3
"""Approved existing identity only. Never creates users, passwords or factors.

Use only during the release maintenance window. A fresh session receives one
audited enrollment capability; ordinary administrative access still needs MFA.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
from environment_profiles import Environment, authorize_live, private_file

def bootstrap_sql(email,reference,prepare_only=False):
    if not re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+',email):raise ValueError('Invalid approved identity')
    if not re.fullmatch(r'[A-Za-z0-9 _/#:.-]{10,160}',reference):raise ValueError('Plain approval reference required')
    reason='Approved Live bootstrap: '+reference
    literal=lambda value:"'"+value.replace("'","''")+"'"
    if prepare_only:
        statement="""begin;
do $$declare person uuid;begin
if exists(select 1 from public.platform_admins) then raise exception 'Initial enforcement preparation requires an empty administrative registry';end if;
if (select count(*) from auth.users where lower(email)=%s and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now()))<>1 then raise exception 'Exactly one approved confirmed identity required';end if;
select id into person from auth.users where lower(email)=%s and email_confirmed_at is not null and deleted_at is null;
update app_private.security_settings set admin_mfa_enforced=true where singleton;
insert into public.platform_audit_events(actor_user_id,action,reason,details) values(person,'platform.security.enforcement_prepared',%s,'{"operator":"vps-root"}');
end$$;commit;"""%(literal(email),literal(email),literal(reason))
    else:
        statement="""begin;
do $$declare person uuid;current_session uuid;session_count integer;begin
if (select count(*) from auth.users where lower(email)=%s and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now()))<>1 then raise exception 'Exactly one approved confirmed identity required';end if;
select id into person from auth.users where lower(email)=%s and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now());
if person is null then raise exception 'Approved confirmed Live account missing; human signup required';end if;
if exists(select 1 from public.platform_admins p where p.user_id<>person and not exists(select 1 from auth.mfa_factors f where f.user_id=p.user_id and f.status='verified')) then raise exception 'Other legitimate administrators require their own enrollment';end if;
if not exists(select 1 from auth.mfa_factors where user_id=person and status='verified') then
 select count(*) into session_count from auth.sessions s where user_id=person and created_at>now()-interval '10 minutes' and (not_after is null or not_after>now()) and exists(select 1 from auth.mfa_amr_claims a where a.session_id=s.id and a.authentication_method='password');
 if session_count<>1 then raise exception 'Exactly one fresh human password session required for bootstrap';end if;
 select s.id into current_session from auth.sessions s where user_id=person and created_at>now()-interval '10 minutes' and (not_after is null or not_after>now()) and exists(select 1 from auth.mfa_amr_claims a where a.session_id=s.id and a.authentication_method='password');
end if;
insert into public.platform_admins(user_id,email,role) values(person,%s,'platform_admin') on conflict(user_id) do nothing;
if not exists(select 1 from public.platform_admins where user_id=person and email=%s and role='platform_admin') then raise exception 'Existing administrative identity mismatch';end if;
update app_private.security_settings set admin_mfa_enforced=true where singleton;
if current_session is not null then
 if exists(select 1 from app_private.administrative_factor_recovery where user_id=person) then raise exception 'Bootstrap capability already exists; explicit recovery review required';end if;
 insert into app_private.administrative_factor_recovery(user_id,session_id,expires_at,reason) values(person,current_session,now()+interval '15 minutes',%s);
end if;
insert into public.platform_audit_events(actor_user_id,action,reason,details) values(person,'platform.security.bootstrap',%s,'{"operator":"vps-root","identity_previously_confirmed":true}');
end$$;commit;"""%(literal(email),literal(email),literal(email),literal(email),literal(reason),literal(reason))
    return statement

def main():
    parser=argparse.ArgumentParser();parser.add_argument('revision');parser.add_argument('--authorization',default='/opt/jbfd/security-work/live-release-approval.json');parser.add_argument('--prepare-only',action='store_true');args=parser.parse_args()
    if os.geteuid()!=0:raise SystemExit('Root required')
    environment=Environment('live');authorize_live(environment,args.revision,args.authorization)
    release=Path(__file__).resolve().parents[2]
    head=subprocess.run(['git','-C',str(release),'rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
    if head!=args.revision:raise SystemExit('Source revision mismatch')
    import importlib.util
    spec=importlib.util.spec_from_file_location('live_gate',release/'scripts/security/verify-live-release.py');gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
    if not gate.maintenance_active(args.revision):raise SystemExit('Proven public maintenance required for bootstrap')
    approval=json.loads(private_file(args.authorization).read_text());email=approval.get('responsible_email','').lower()
    if not re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+',email):raise SystemExit('Explicitly approved responsible identity required')
    statement=bootstrap_sql(email,approval['approval_reference'],args.prepare_only)
    # Diagnostics can contain private identities. Keep them in a protected file,
    # never stdout, browser, GitHub logs or chat.
    os.umask(0o077)
    result=subprocess.run(['docker','exec','-i',environment.database,'psql','-XqAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],input=statement,capture_output=True,text=True)
    if result.returncode:
        diagnostic=Path('/opt/jbfd/security-work/live-bootstrap.private.log');diagnostic.write_text(result.stderr)
        raise SystemExit('Live bootstrap refused; inspect protected diagnostic. No partial transaction committed.')
    print(json.dumps({'environment':'live','mfa_enforced':True,'existing_identity_only':True,'prepare_only':args.prepare_only,'no_password_or_factor_created':True}))

if __name__=='__main__':main()

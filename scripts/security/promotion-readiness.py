#!/usr/bin/env python3
"""Read-only promotion report. Never migrates, restarts, enrolls or sends messages."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.request
from environment_profiles import Environment, auth_policy

def run(args):
    result=subprocess.run(args,capture_output=True,text=True)
    if result.returncode:raise RuntimeError('Read-only inspection unavailable')
    return result.stdout.strip()

def inspect(name, optional=False):
    result=subprocess.run(['docker','inspect',name],capture_output=True,text=True)
    if result.returncode:
        if optional:return None
        raise RuntimeError('Required container unavailable')
    return json.loads(result.stdout)[0]

def query(environment, statement):
    return json.loads(run(['docker','exec',environment.database,'psql','-XqAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',statement]))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('revision');parser.add_argument('--responsible-email');parser.add_argument('--strict',action='store_true');args=parser.parse_args()
    if not re.fullmatch('[a-f0-9]{40}',args.revision):raise SystemExit('Full immutable revision required')
    if args.responsible_email and not re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+',args.responsible_email):raise SystemExit('Invalid responsible identity')
    root=Path(__file__).resolve().parents[2]
    expected={file.name:hashlib.sha256(file.read_bytes()).hexdigest() for file in sorted((root/'supabase/migrations').glob('[0-9]*.sql'))}
    policy=auth_policy(json.loads((root/'shared/password-policy.json').read_text()))
    report={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidate':args.revision,'read_only':True,'environments':{},'blockers':[]}
    for name in ['test','live']:
        profile=Environment(name)
        with urllib.request.urlopen('https://'+profile.hostname+'/api/health',timeout=15) as response:health=json.load(response)
        rows=query(profile,"select coalesce(json_agg(x),'[]') from(select filename,checksum from public.jbfd_schema_migrations order by filename)x;")
        recorded={row['filename']:row['checksum'] for row in rows}
        pending=sorted(set(expected)-set(recorded));mismatch=[key for key,value in recorded.items() if expected.get(key)!=value]
        auth=inspect(profile.auth);settings=dict(value.split('=',1) for value in auth['Config']['Env'])
        policy_gaps=[key for key,value in policy.items() if settings.get(key)!=value]
        gateway=inspect(profile.gateway,optional=True)
        app=inspect(profile.app)
        pooler=inspect(profile.prefix+'-pooler')
        bindings=pooler['HostConfig'].get('PortBindings') or {}
        loopback=all(binding.get('HostIp') in ('127.0.0.1','::1') for group in bindings.values() for binding in group)
        legacy=query(profile,"""select json_build_object('active_membership_conflicts',(select count(*) from(select user_id from public.company_members where status='active' group by user_id having count(*)>1)x),'invalid_roles',(select count(*) from public.company_members where role not in ('owner','admin','member')),'invalid_statuses',(select count(*) from public.company_members where status not in ('active','inactive')));""")
        value={'health':health,'applied_migrations':len(rows),'pending_migrations':pending,'checksum_mismatches':mismatch,'auth_policy_gaps':policy_gaps,'smtp_configured':bool(settings.get('GOTRUE_SMTP_HOST') and settings.get('GOTRUE_SMTP_PASS')),'email_confirmation_required':settings.get('GOTRUE_MAILER_AUTOCONFIRM')=='false','gateway_present':bool(gateway),'pooler_loopback_only':loopback,'dedicated_app_ingress':profile.ingress in app['NetworkSettings']['Networks'] and 'jobforged_jobforged_network' not in app['NetworkSettings']['Networks'],'legacy_conflicts':legacy}
        if name=='live' and args.responsible_email:
            value['responsible_account_exists']=query(profile,"select to_json(exists(select 1 from auth.users where lower(email)=lower('"+args.responsible_email+"') and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now())));")
        report['environments'][name]=value
        if mismatch:report['blockers'].append(name+': migration checksum divergence')
        if any(legacy.values()):report['blockers'].append(name+': legacy membership conflict requires explicit resolution')
    test=report['environments']['test'];live=report['environments']['live']
    if test['health'].get('commit')!=args.revision or test['health'].get('status')!='ok':report['blockers'].append('candidate is not currently healthy in Test')
    if live['pending_migrations']:report['blockers'].append('Live schema upgrade pending')
    if live['auth_policy_gaps']:report['blockers'].append('Live Auth policy differs from validated Test policy')
    if not live['gateway_present']:report['blockers'].append('Live gateway not installed')
    if not live['dedicated_app_ingress']:report['blockers'].append('Live ingress isolation pending')
    if not live.get('responsible_account_exists'):report['blockers'].append('confirmed legitimate Live administrator identity pending')
    if not live['pooler_loopback_only']:report['blockers'].append('Live pooler externally bound')
    if not live['smtp_configured'] or not live['email_confirmation_required']:report['blockers'].append('Live confirmation/SMTP configuration pending')
    for receipt in sorted(Path('/opt/jbfd/backups/security').glob('live-*/offsite-receipt.json'),reverse=True):
        from environment_profiles import verified_backup
        try:verified_backup(Environment('live'),receipt.parent);report['live_backup_verified']=True;break
        except (ValueError,OSError,KeyError):continue
    if not report.get('live_backup_verified'):report['blockers'].append('recent isolated-restored encrypted-offsite Live backup pending')
    # A read-only operational report cannot certify deployment approvals, real
    # customer flows, rollback compatibility or personal MFA via an HTTP 200.
    report['requires_operator_validation']=['main ancestry and approved image digest','legitimate Live administrator enrollment and MFA','staged rollback compatibility','human approval of exact Live operation']
    report['technical_prerequisites_ready']=not report['blockers']
    report['human_release_approval_required']=True
    print(json.dumps(report,indent=2))
    return 2 if args.strict and report['blockers'] else 0

if __name__=='__main__':raise SystemExit(main())

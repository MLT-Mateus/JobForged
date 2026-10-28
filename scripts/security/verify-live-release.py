#!/usr/bin/env python3
"""Final read-only release gate. Run before changing any Live deployment file."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.request
import urllib.error
from environment_profiles import Environment, authorize_live, private_file

def validate_rollback(evidence, expected, now=None):
    now=now or datetime.datetime.now(datetime.timezone.utc)
    if evidence.get('environment')!='live' or evidence.get('schema_checksums')!=expected or evidence.get('acceptance_passed') is not True or evidence.get('isolated') is not True:
        raise ValueError('Compatible isolated rollback acceptance required')
    if set(evidence.get('checks',[]))!={'auth','session_context','company_read','branding','storage','mfa'}:
        raise ValueError('Incomplete rollback acceptance')
    verified=datetime.datetime.fromisoformat(evidence['verified_at'])
    if not datetime.timedelta(0)<=now-verified<=datetime.timedelta(hours=2):raise ValueError('Recent rollback acceptance required')
    image=evidence.get('image','')
    if not re.fullmatch(r'ghcr\.io/mlt-mateus/jobforged:[a-f0-9]{40}',image):raise ValueError('Immutable approved rollback image required')
    if not evidence.get('evidence_reference'):raise ValueError('Identifiable rollback execution evidence required')
    return image

def maintenance_active(revision):
    result=subprocess.run(['docker','inspect','jbfd-live-maintenance'],capture_output=True,text=True)
    if result.returncode:return False
    row=json.loads(result.stdout)[0]
    if not row['State'].get('Running') or row['Config'].get('Image')!='ghcr.io/mlt-mateus/jobforged-security-gateway:'+revision:return False
    for path in ['/','/api/company/branding']:
        try:
            with urllib.request.urlopen('https://jobforged.com'+path,timeout=10) as response:status=response.status
        except urllib.error.HTTPError as error:status=error.code
        if status!=503:return False
    return True

def main():
    parser=argparse.ArgumentParser();parser.add_argument('revision');parser.add_argument('--authorization',default='/opt/jbfd/security-work/live-release-approval.json');parser.add_argument('--bootstrap',action='store_true');args=parser.parse_args()
    if not re.fullmatch('[a-f0-9]{40}',args.revision):raise SystemExit('Full revision required')
    environment=Environment('live');authorize_live(environment,args.revision,args.authorization)
    root=Path(__file__).resolve().parents[2]
    head=subprocess.run(['git','-C',str(root),'rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
    if head!=args.revision:raise SystemExit('Release source mismatch')
    subprocess.run(['git','-C',str(root),'fetch','origin','main'],capture_output=True,check=True,timeout=30)
    ancestry=subprocess.run(['git','-C',str(root),'merge-base','--is-ancestor',args.revision,'origin/main'],capture_output=True)
    if ancestry.returncode:raise SystemExit('Approved release must be integrated in main')
    with urllib.request.urlopen('https://test.jobforged.com/api/health',timeout=15) as response:test=json.load(response)
    if test.get('commit')!=args.revision or test.get('status')!='ok':raise SystemExit('Same release must be healthy in Test')
    check=subprocess.run(['bash',str(root/'scripts/supabase-migrate.sh'),'live','--check'],capture_output=True,text=True)
    if check.returncode:raise SystemExit('Live migrations or checksums are not ready')
    enforced="exists(select 1 from app_private.security_settings where singleton and admin_mfa_enforced)"
    statement='select '+enforced+(';' if args.bootstrap else " and exists(select 1 from public.platform_admins) and not exists(select 1 from public.platform_admins p where not exists(select 1 from auth.mfa_factors f where f.user_id=p.user_id and f.status='verified'));")
    state=subprocess.run(['docker','exec',environment.database,'psql','-XqAt','-U','postgres','-d','postgres','-c',statement],capture_output=True,text=True)
    if state.returncode or state.stdout.strip()!='t':raise SystemExit('Required enforced Live MFA state is not ready')
    expected={file.name:hashlib.sha256(file.read_bytes()).hexdigest() for file in sorted((root/'supabase/migrations').glob('[0-9]*.sql'))}
    approval=json.loads(private_file(args.authorization).read_text())
    hold=approval.get('rollback_strategy')=='hold-maintenance-for-operator-recovery'
    rollback=''
    if hold:
        if not maintenance_active(args.revision):raise SystemExit('Proven public maintenance required; incompatible automatic rollback forbidden')
    else:
        if args.bootstrap:raise SystemExit('Bootstrap requires maintenance and fail-closed recovery')
        proof=json.loads(private_file(approval['rollback_evidence']).read_text())
        rollback=validate_rollback(proof,expected)
        image=json.loads(subprocess.run(['docker','image','inspect',rollback],capture_output=True,text=True,check=True).stdout)[0]
        if image['Config'].get('Labels',{}).get('org.opencontainers.image.revision')!=rollback.rsplit(':',1)[1]:raise SystemExit('Rollback image identity mismatch')
    print(json.dumps({'environment':'live','revision':args.revision,'rollback_image':rollback,'hold_maintenance_on_failure':hold,'bootstrap_only':args.bootstrap,'gate':'verified'}))

if __name__=='__main__':main()

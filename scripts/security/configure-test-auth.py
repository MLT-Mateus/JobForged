#!/usr/bin/env python3
"""Shared Auth policy; Live requires approval plus its own restored offsite backup.

SMTP, signing keys and identities remain environment-specific and untouched.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
from environment_profiles import Environment, authorize_live, auth_policy

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()

def inspect(name):
    return json.loads(run(['docker','inspect',name]))[0]

def fingerprint(name):
    info=inspect(name)
    return hashlib.sha256(json.dumps({'image':info['Image'],'env':info['Config']['Env']},sort_keys=True).encode()).hexdigest()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--environment',choices=['test','live'],default='test');parser.add_argument('--authorization');options=parser.parse_args()
    environment=Environment(options.environment)
    if os.geteuid()!=0:raise SystemExit('Root required')
    os.umask(0o077)
    release=Path(__file__).resolve().parents[2]
    revision=run(['git','-C',str(release),'rev-parse','HEAD'])
    authorize_live(environment,revision,options.authorization)
    run(['bash',str(release/'scripts/supabase-migrate.sh'),environment.name,'--check'])
    policy=json.loads((release/'shared/password-policy.json').read_text())
    desired=auth_policy(policy)
    info=inspect(environment.auth);labels=info['Config']['Labels'];stack=environment.stack
    files=labels['com.docker.compose.project.config_files'].split(',')
    allowed=[str(stack/name) for name in ('docker-compose.yml',environment.override,'docker-compose.jbfd-email-template.override.yml','docker-compose.security.override.yml')]
    if any(name not in allowed for name in files) or labels.get('com.docker.compose.service')!='auth':raise SystemExit('Unexpected target Auth identity')
    if files[:2]!=allowed[:2]:raise SystemExit('Unexpected target compose files')
    before_live=fingerprint(environment.peer.auth)
    override=stack/'docker-compose.security.override.yml';previous=override.read_text() if override.exists() else None
    document=json.dumps({'services':{'auth':{'environment':desired}}},indent=2)+'\n'
    existing=dict(value.split('=',1) for value in info['Config']['Env'])
    if previous==document and all(existing.get(k)==v for k,v in desired.items()):
        print(json.dumps({'environment':environment.name,'auth_policy':'already verified',environment.peer.name+'_unchanged':fingerprint(environment.peer.auth)==before_live}));return
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    evidence=Path('/opt/jbfd/security-work')/(environment.name+'-auth-policy-'+stamp+'.json')
    evidence.write_text(json.dumps({'environment':environment.name,'before':{k:existing.get(k) for k in desired},'after':desired,'previous_override':previous},indent=2))
    active_files=[name for name in files if name!=str(override)]+[str(override)]
    def compose(paths):
        command=['docker','compose','--project-directory',str(stack)]
        for name in paths:command+=['-f',name]
        return command
    try:
        override.write_text(document)
        run(compose(active_files)+['config','--quiet'])
        run(compose(active_files)+['up','-d','--no-deps','--wait','--wait-timeout','120','auth'])
        actual=dict(value.split('=',1) for value in inspect(environment.auth)['Config']['Env'])
        if any(actual.get(k)!=v for k,v in desired.items()):raise RuntimeError('Auth policy mismatch')
        if fingerprint(environment.peer.auth)!=before_live:raise RuntimeError('Peer Auth fingerprint changed')
        print(json.dumps({'environment':environment.name,'jwt_seconds':900,'session_days':30,'inactivity_hours':24,'rotation_reuse_seconds':10,'password_min_bytes':8,'mfa_enrollment_available':True,environment.peer.name+'_unchanged':True,'evidence':str(evidence)}))
    except Exception:
        if previous is None:override.unlink(missing_ok=True)
        else:override.write_text(previous)
        rollback=[name for name in files if name!=str(override) or previous is not None]
        run(compose(rollback)+['up','-d','--no-deps','--wait','--wait-timeout','120','auth'])
        raise SystemExit('target Auth policy failed; previous configuration restored')

if __name__=='__main__':main()

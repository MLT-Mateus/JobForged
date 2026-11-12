"""Operational guard tests. No production credentials or mutable Docker actions."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts/security'))
import environment_profiles as profiles

class ProfilesTests(unittest.TestCase):
    def test_canonical_environment_identities_never_overlap(self):
        a,b=profiles.Environment('test'),profiles.Environment('live')
        for key in ['database','auth','storage','envoy','app','gateway','ingress','provider_network','stack','app_env','hostname']:
            self.assertNotEqual(getattr(a,key),getattr(b,key),key)
        self.assertEqual(a.peer,b)
        with self.assertRaises(ValueError):profiles.Environment('production')

    def test_shared_auth_policy_has_no_environment_secrets(self):
        policy=profiles.auth_policy(json.loads((ROOT/'shared/password-policy.json').read_text()))
        self.assertEqual(policy['GOTRUE_JWT_EXP'],'900')
        self.assertEqual(policy['GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED'],'true')
        self.assertFalse(any('SECRET' in key or 'SMTP' in key for key in policy))

    def test_studio_keeps_basic_auth_tls_and_host(self):
        source={'services':{'studio':{'labels':{'traefik.http.routers.studio.middlewares':'existing-auth','traefik.http.routers.studio.tls':'true','traefik.http.routers.studio.rule':'Host(`fixture.invalid`)','traefik.http.middlewares.existing-auth.basicauth.users':'fixture-only'}}}}
        for name in ['test','live']:
            value=profiles.private_studio_override(source,profiles.Environment(name),'172.20.0.1')
            labels=value['services']['studio']['labels']
            self.assertEqual(labels['traefik.http.routers.studio.middlewares'],'jbfd-'+name+'-studio-private,existing-auth')
            for key,previous in source['services']['studio']['labels'].items():
                if not key.endswith('.middlewares'):self.assertEqual(labels[key],previous)
            self.assertEqual(value,profiles.private_studio_override(value,profiles.Environment(name),'172.20.0.1'))
        self.assertEqual(source['services']['studio']['labels']['traefik.http.routers.studio.middlewares'],'existing-auth')
        with self.assertRaises(ValueError):profiles.private_studio_override(source,profiles.Environment('test'),'8.8.8.8')

    def test_live_guard_rejects_absent_wrong_or_expired_approval(self):
        live=profiles.Environment('live');revision='a'*40
        with self.assertRaises(ValueError):profiles.authorize_live(live,revision,None)
        now=datetime.datetime.now(datetime.timezone.utc)
        record={'environment':'live','revision':revision,'approved':True,'approval_reference':'human-approval-fixture','issued_at':now.isoformat(),'expires_at':(now+datetime.timedelta(hours=1)).isoformat(),'backup':'fixture'}
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'approval.json'
            for field,value in [('environment','test'),('revision','b'*40),('approved',False),('expires_at',(now-datetime.timedelta(seconds=1)).isoformat())]:
                path.write_text(json.dumps({**record,field:value}))
                with patch.object(profiles,'private_file',side_effect=lambda p:Path(p)):
                    with self.assertRaises(ValueError):profiles.authorize_live(live,revision,path,require_backup=False)
            path.write_text(json.dumps(record))
            with patch.object(profiles,'private_file',side_effect=lambda p:Path(p)),patch.object(profiles,'verified_backup') as backup:
                profiles.authorize_live(live,revision,path)
                backup.assert_called_once_with(live,'fixture')

    def test_live_mutators_stop_before_docker_or_database_changes(self):
        for filename in ['configure-test-auth.py','configure-test-gateway.py']:
            spec=importlib.util.spec_from_file_location('guard_fixture',ROOT/'scripts/security'/filename)
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            argv=[filename]+(['a'*40] if filename.endswith('gateway.py') else [])+['--environment','live']
            with patch.object(sys,'argv',argv),patch.object(module.os,'geteuid',return_value=0,create=True),patch.object(module,'run',return_value='a'*40) as run:
                with self.assertRaises(ValueError):module.main()
                self.assertEqual(run.call_count,1)
                self.assertEqual(run.call_args.args[0][0],'git')

    def test_readiness_never_uses_a_test_backup_for_live(self):
        with self.assertRaises(ValueError):profiles.verified_backup(profiles.Environment('live'),'/opt/jbfd/backups/security/test-20261028T000000Z')

    def test_maintenance_capability_cannot_authorize_other_operations(self):
        value={'environment':'live','revision':'a'*40,'scopes':['consistent-backup','bounded-orphan-maintenance'],'approval_reference':'human-approved-fixture'}
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/'maintenance.json';file.write_text(json.dumps(value))
            with patch.object(profiles,'private_file',return_value=file):
                profiles.authorize_maintenance(profiles.Environment('live'),'consistent-backup','a'*40)
                with self.assertRaises(ValueError):profiles.authorize_maintenance(profiles.Environment('live'),'deploy','a'*40)
                with self.assertRaises(ValueError):profiles.authorize_maintenance(profiles.Environment('live'),'consistent-backup','b'*40)
                file.write_text(json.dumps({**value,'environment':'test'}))
                with self.assertRaises(ValueError):profiles.authorize_maintenance(profiles.Environment('live'),'consistent-backup')

    def test_old_or_unverified_rollback_cannot_be_selected(self):
        spec=importlib.util.spec_from_file_location('rollback_fixture',ROOT/'scripts/security/verify-live-release.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        now=datetime.datetime.now(datetime.timezone.utc)
        expected={'0001_fixture.sql':'a'*64}
        evidence={'environment':'live','schema_checksums':expected,'acceptance_passed':True,'isolated':True,'checks':['auth','session_context','company_read','branding','storage','mfa'],'verified_at':now.isoformat(),'image':'ghcr.io/mlt-mateus/jobforged:'+('a'*40),'evidence_reference':'isolated-fixture-result'}
        self.assertEqual(module.validate_rollback(evidence,expected),evidence['image'])
        for change in [{'environment':'test'},{'schema_checksums':{}},{'acceptance_passed':False},{'checks':['auth']},{'image':'ghcr.io/mlt-mateus/jobforged:latest'},{'verified_at':(now-datetime.timedelta(hours=3)).isoformat()}]:
            with self.assertRaises(ValueError):module.validate_rollback({**evidence,**change},expected)

    def test_incomplete_corrupted_or_peer_restoration_is_denied(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);now=datetime.datetime.now(datetime.timezone.utc)
            folder=root/now.strftime('live-%Y%m%dT%H%M%SZ');folder.mkdir()
            checks={}
            for name in ['postgres.sql.gz','storage.tar.gz','objects.private.json','infrastructure-audit.jsonl']:
                (folder/name).write_bytes(b'synthetic backup');checks[name]=hashlib.sha256(b'synthetic backup').hexdigest()
            evidence={'environment':'live','counts_match':True,'network':'none','ports':[],'checksums':checks}
            def write(value):
                recovery=folder/'recovery.json';recovery.write_text(json.dumps(value))
                (folder/'offsite-receipt.json').write_text(json.dumps({'backup':folder.name,'recovery_sha256':hashlib.sha256(recovery.read_bytes()).hexdigest(),'encrypted_sha256':'a'*64}))
            def remap(value):return root if str(value)=='/opt/jbfd/backups/security' else Path(value)
            with patch.object(profiles,'Path',side_effect=remap),patch.object(profiles,'private_file',side_effect=lambda p:Path(p)):
                write(evidence);self.assertEqual(profiles.verified_backup(profiles.Environment('live'),folder),folder)
                for changes in [{'environment':'test'},{'counts_match':False},{'network':'bridge'},{'ports':[5432]},{'checksums':{}}]:
                    write({**evidence,**changes})
                    with self.assertRaises(ValueError):profiles.verified_backup(profiles.Environment('live'),folder)
                write(evidence);(folder/'storage.tar.gz').write_bytes(b'corrupted')
                with self.assertRaises(ValueError):profiles.verified_backup(profiles.Environment('live'),folder)

def validate_compose():
    with tempfile.TemporaryDirectory() as directory:
        for name in ['test','live']:
            profile=profiles.Environment(name);values=profiles.gateway_values(profile,'a'*40)
            env=Path(directory)/(name+'.env');private=Path(directory)/(name+'-private.env')
            private.write_text('DATABASE_URL=postgres://fixture.invalid/database\nRATE_SCOPE_SECRET='+('a'*64)+'\n')
            values['JBFD_SECURITY_GATEWAY_ENV_FILE']=str(private)
            values['APP_HOST_RULE']='Host(`'+profile.hostname+'`)'
            env.write_text(''.join(key+'='+value+'\n' for key,value in values.items()))
            result=subprocess.run(['docker','compose','--env-file',str(env),'-f',str(ROOT/'deploy/compose.security.yml'),'config','--format','json'],capture_output=True,text=True,check=True)
            data=json.loads(result.stdout);gateway=data['services']['gateway']
            assert gateway['container_name']==profile.gateway
            assert gateway['environment']['UPSTREAM_URL']=='http://'+profile.envoy+':8000'
            assert gateway['environment']['TRUSTED_BFF_HOST']==profile.app
            assert data['networks']['ingress']['name']==profile.ingress
            assert data['networks']['provider']['name']==profile.provider_network
            assert len(gateway['tmpfs'])==1 and not gateway.get('ports')
            assert gateway['read_only'] is True
            result=subprocess.run(['docker','compose','--env-file',str(env),'-f',str(ROOT/'deploy/compose.maintenance.yml'),'config','--format','json'],capture_output=True,text=True,check=True)
            maintenance=json.loads(result.stdout)['services']['maintenance']
            assert maintenance['container_name']=='jbfd-'+name+'-maintenance'
            assert maintenance['environment']['UPSTREAM_APP_URL']=='http://'+profile.app+':3000'
            assert 'DATABASE_URL' not in maintenance['environment'] and not maintenance.get('ports')
    print('Both environment Compose contracts validated without starting services')

if __name__=='__main__':
    if '--compose' in sys.argv:validate_compose()
    else:unittest.main()

"""Control-flow tests only. Native database/provider tests run separately."""
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('migration_gate',Path(__file__).resolve().parents[1]/'scripts/security/apply-test-migrations.py')
gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)

class MigrationGateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        now=datetime.datetime.now(datetime.timezone.utc)
        self.folder=self.root/'backups'/now.strftime('test-%Y%m%dT%H%M%SZ');self.folder.mkdir(parents=True)
        (self.root/'work').mkdir()
        checks={}
        for name in ['postgres.sql.gz','storage.tar.gz','objects.private.json','infrastructure-audit.jsonl']:
            file=self.folder/name;file.write_bytes(b'fixture');file.chmod(0o600);checks[name]=hashlib.sha256(b'fixture').hexdigest()
        self.evidence={'environment':'test','counts_match':True,'network':'none','ports':[],'checksums':checks}
        self.write_receipt();self.calls=[]
        def run(args,**kwargs):
            self.calls.append(args)
            if len(self.calls)==1:return types.SimpleNamespace(returncode=65,stdout='',stderr='Migration pendente: fixture.sql')
            return types.SimpleNamespace(returncode=0,stdout='verified',stderr='')
        self.run=run
    def tearDown(self):self.temp.cleanup()
    def write_receipt(self):
        recovery=self.folder/'recovery.json';recovery.write_text(json.dumps(self.evidence))
        (self.folder/'offsite-receipt.json').write_text(json.dumps({'backup':self.folder.name,'recovery_sha256':hashlib.sha256(recovery.read_bytes()).hexdigest(),'encrypted_sha256':'a'*64}))
    def execute(self):
        def path(value):
            if str(value)=='/opt/jbfd/backups/security':return self.root/'backups'
            if str(value)=='/opt/jbfd/security-work':return self.root/'work'
            return Path(value)
        with patch.object(gate,'Path',side_effect=path),patch.object(gate.os,'geteuid',return_value=0,create=True),patch.object(gate.subprocess,'run',side_effect=self.run):gate.main()
    def test_recent_restored_offsite_copy_allows_test_runner_only(self):
        self.execute();self.assertEqual(len(self.calls),3)
        self.assertTrue(all(args[2]=='test' for args in self.calls))
    def test_missing_receipt_blocks_without_applying(self):
        (self.folder/'offsite-receipt.json').unlink()
        with self.assertRaises(SystemExit):self.execute()
        self.assertEqual(len(self.calls),1)
    def test_corrupted_archive_blocks(self):
        (self.folder/'storage.tar.gz').write_bytes(b'changed')
        with self.assertRaises(SystemExit):self.execute()
        self.assertEqual(len(self.calls),1)
    def test_unrestored_archive_blocks(self):
        self.evidence['counts_match']=False;self.write_receipt()
        with self.assertRaises(SystemExit):self.execute()
    def test_old_backup_blocks(self):
        old=datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=3)
        self.folder.rename(self.folder.parent/old.strftime('test-%Y%m%dT%H%M%SZ'))
        with self.assertRaises(SystemExit):self.execute()
    def test_checksum_error_is_not_treated_as_pending(self):
        def failure(args,**kwargs):return types.SimpleNamespace(returncode=65,stdout='',stderr='Migration checksum mismatch')
        self.run=failure
        with self.assertRaises(SystemExit):self.execute()

if __name__=='__main__':unittest.main()

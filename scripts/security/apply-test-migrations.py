#!/usr/bin/env python3
"""Controlled Test migration gate: recent restored AND encrypted-offsite backup.

Used only after CI image availability is confirmed. No Live migration path.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import re

def main():
    if os.geteuid()!=0:raise SystemExit('Root required')
    os.umask(0o077)
    release=Path(__file__).resolve().parents[2];runner=release/'scripts/supabase-migrate.sh'
    check=subprocess.run(['bash',str(runner),'test','--check'],capture_output=True,text=True)
    if check.returncode==0:
        print(json.dumps({'environment':'test','migrations':'checksums verified; nothing pending'}));return
    if 'Migration pendente:' not in check.stderr:raise SystemExit('Migration check failed; application remains blocked')
    now=datetime.datetime.now(datetime.timezone.utc);selected=None
    for receipt in sorted(Path('/opt/jbfd/backups/security').glob('test-*/offsite-receipt.json'),reverse=True):
        folder=receipt.parent;stamp=datetime.datetime.strptime(folder.name,'test-%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
        if now-stamp>datetime.timedelta(hours=2) or stamp>now:continue
        data=json.loads(receipt.read_text());recovery=folder/'recovery.json';evidence=json.loads(recovery.read_text())
        if not re.fullmatch('[a-f0-9]{64}',data.get('encrypted_sha256','')):continue
        if evidence.get('environment')!='test' or evidence.get('counts_match') is not True or evidence.get('network')!='none' or evidence.get('ports')!=[]:continue
        if data.get('backup')!=folder.name or data.get('recovery_sha256')!=hashlib.sha256(recovery.read_bytes()).hexdigest():continue
        valid=True
        for name,digest in evidence['checksums'].items():
            if name not in ['postgres.sql.gz','storage.tar.gz','objects.private.json','infrastructure-audit.jsonl']:valid=False;break
            file=folder/name
            with file.open('rb') as stream:actual=hashlib.file_digest(stream,'sha256').hexdigest()
            if file.stat().st_mode&0o077 or actual!=digest:valid=False;break
        if valid:selected=folder;break
    if selected is None:raise SystemExit('Recent restored Test backup with encrypted offsite receipt required; migration/deploy blocked')
    result=subprocess.run(['bash',str(runner),'test'],capture_output=True,text=True)
    diagnostic=Path('/opt/jbfd/security-work')/('migration-'+now.strftime('%Y%m%dT%H%M%SZ')+'.private.log')
    diagnostic.write_text(result.stdout+result.stderr)
    if result.returncode:raise SystemExit('Test migration failed; dependent publication blocked; protected diagnostic retained')
    verified=subprocess.run(['bash',str(runner),'test','--check'],capture_output=True,text=True)
    if verified.returncode:raise SystemExit('Post-migration checksum verification failed; publication blocked')
    print(json.dumps({'environment':'test','migrations':'applied and checksums verified','restored_offsite_backup':selected.name,'diagnostic':str(diagnostic)}))

if __name__=='__main__':main()

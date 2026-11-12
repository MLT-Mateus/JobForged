#!/usr/bin/env python3
"""Record an encrypted workstation copy or a verified private GitHub artifact."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile

def main():
    if os.geteuid()!=0 or len(sys.argv) not in (4,5):raise SystemExit('Root and copy evidence required')
    name,plain,encrypted=sys.argv[1:4]
    artifact_id=sys.argv[4] if len(sys.argv)==5 else None
    if not re.fullmatch(r'(?:test|live)-[0-9]{8}T[0-9]{6}Z',name) or any(not re.fullmatch(r'[a-fA-F0-9]{64}',v) for v in (plain,encrypted)):raise SystemExit('Invalid receipt')
    if artifact_id is not None and not re.fullmatch(r'[0-9]{1,20}',artifact_id):raise SystemExit('Invalid artifact reference')
    folder=Path('/opt/jbfd/backups/security')/name
    recovery=json.loads((folder/'recovery.json').read_text())
    if recovery.get('environment')!=name.split('-',1)[0] or recovery.get('counts_match') is not True:raise SystemExit('Verified restoration required')
    digest=hashlib.file_digest((folder/'offsite.tar').open('rb'),'sha256').hexdigest()
    if digest!=plain.lower():raise SystemExit('Transferred archive differs')
    os.umask(0o077)
    receipt={'backup':name,'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'recovery_sha256':hashlib.sha256((folder/'recovery.json').read_bytes()).hexdigest(),'encrypted_sha256':encrypted.lower(),'archive_sha256':plain.lower()}
    if artifact_id is None:
        receipt['copy_destination']='workstation'
    else:
        receipt['artifact_id']=artifact_id
        receipt['artifact_repository']='MLT-Mateus/jobforged-backups'
    descriptor,temporary_name=tempfile.mkstemp(prefix='.offsite-receipt.',dir=folder)
    temporary=Path(temporary_name)
    try:
        with os.fdopen(descriptor,'w',encoding='utf-8') as stream:stream.write(json.dumps(receipt,sort_keys=True))
        os.chmod(temporary,0o600)
        os.replace(temporary,folder/'offsite-receipt.json')
    finally:
        temporary.unlink(missing_ok=True)
    print('Encrypted offsite copy receipt recorded')

if __name__=='__main__':main()

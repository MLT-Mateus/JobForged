#!/usr/bin/env python3
"""Receipt issued only after the workstation verifies authenticated decryption."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys

def main():
    if os.geteuid()!=0 or len(sys.argv)!=4:raise SystemExit('Root and copy evidence required')
    name,plain,encrypted=sys.argv[1:]
    if not re.fullmatch(r'(?:test|live)-[0-9]{8}T[0-9]{6}Z',name) or any(not re.fullmatch(r'[a-fA-F0-9]{64}',v) for v in (plain,encrypted)):raise SystemExit('Invalid receipt')
    folder=Path('/opt/jbfd/backups/security')/name
    recovery=json.loads((folder/'recovery.json').read_text())
    if recovery.get('environment')!=name.split('-',1)[0] or recovery.get('counts_match') is not True:raise SystemExit('Verified restoration required')
    digest=hashlib.file_digest((folder/'offsite.tar').open('rb'),'sha256').hexdigest()
    if digest!=plain.lower():raise SystemExit('Transferred archive differs')
    os.umask(0o077)
    (folder/'offsite-receipt.json').write_text(json.dumps({'backup':name,'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'recovery_sha256':hashlib.sha256((folder/'recovery.json').read_bytes()).hexdigest(),'encrypted_sha256':encrypted.lower(),'archive_sha256':plain.lower()}))
    print('Encrypted offsite copy receipt recorded')

if __name__=='__main__':main()

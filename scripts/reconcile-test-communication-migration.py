#!/usr/bin/env python3
"""One-time Test bookkeeping repair for the initial CRLF copy of migration0011.
The SQL body is not reapplied or edited. Refuses every difference beyond CRLF/LF.
Run only after a verified Test backup, with the canonical Git file copied beside it.
"""
from pathlib import Path
import hashlib
import os
import subprocess

name='0011_internal_communications.sql'
old_hash='7725bdb0480c83256f38afc90b9cfc6243ef2699009dd7aa85e4c92d95ac6dfa'
new_hash='ba31593665a224c2d5cd39aff3860e26ab923a2a751da4e3c8c26d9bdab50f7c'
base=Path('/opt/jbfd/preparation-communications')
if os.geteuid()!=0:
    raise SystemExit('Execute como root somente em Test.')
original=(base/'migrations'/name).read_bytes()
canonical=(base/'0011-canonical.sql').read_bytes()
if hashlib.sha256(original).hexdigest()!=old_hash or hashlib.sha256(canonical).hexdigest()!=new_hash or original.replace(b'\r\n',b'\n')!=canonical:
    raise SystemExit('Comparação recusada: diferença além da cópia CRLF conhecida.')
args=['docker','exec','-i','supabase-db','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-q','-At']
sql=f"""BEGIN;
DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.jbfd_schema_migrations WHERE filename='{name}' AND checksum='{old_hash}') THEN RAISE EXCEPTION 'unexpected checksum';END IF;
 UPDATE public.jbfd_schema_migrations SET checksum='{new_hash}' WHERE filename='{name}' AND checksum='{old_hash}';
END;$$;
COMMIT;
"""
subprocess.run(args,input=sql,text=True,check=True,capture_output=True)
# Preserve the exact initial applied copy and a protected operational audit record.
record=base/'0011-line-ending-reconciliation.txt'
record.write_text(f'Test only: {name}\nInitial applied CRLF: {old_hash}\nCanonical Git LF: {new_hash}\nVerified identical SQL after CRLF normalization. SQL not reapplied. Only registry checksum reconciled.\n',encoding='utf-8')
os.chmod(record,0o600)
print('Verified CRLF/LF equivalence; Test checksum registry reconciled. SQL and data unchanged.')

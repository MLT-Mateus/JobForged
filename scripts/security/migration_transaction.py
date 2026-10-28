"""Execute immutable legacy Storage policies with transaction-only ownership rights."""
from pathlib import Path
import argparse
import hashlib

STORAGE_LEGACY = {'0008_company_branding.sql', '0013_platform_banner_storage.sql'}

def operator(path):
    return 'supabase_admin' if path.name in STORAGE_LEGACY or path.read_text().startswith('-- migration-role: supabase_admin') else 'postgres'

def transaction(path, journal=False):
    body = path.read_text()
    statements = ['BEGIN;']
    if path.name in STORAGE_LEGACY:
        # A concurrent session never observes this grant: grant and revoke commit
        # together, and any migration error rolls back the whole transaction.
        # Existing memberships must never be silently revoked.
        statements += ["DO $$BEGIN IF pg_has_role('postgres','supabase_storage_admin','MEMBER') THEN RAISE EXCEPTION 'Unexpected pre-existing Storage operator membership'; END IF; END$$;",
                       'GRANT supabase_storage_admin TO postgres;', 'SET LOCAL ROLE postgres;']
    statements.append(body)
    if path.name in STORAGE_LEGACY:
        statements += ['RESET ROLE;', 'REVOKE supabase_storage_admin FROM postgres;']
    if journal:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        statements.append("INSERT INTO public.jbfd_schema_migrations(filename,checksum) VALUES ('"+path.name+"','"+digest+"');")
    return '\n'.join(statements + ['COMMIT;'])

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('path',type=Path);parser.add_argument('--operator',action='store_true');args=parser.parse_args()
    print(operator(args.path) if args.operator else transaction(args.path,journal=True))

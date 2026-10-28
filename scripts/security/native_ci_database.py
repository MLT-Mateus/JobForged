"""Disposable native-provider CI database: DDL/version metadata, no Test data."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
from migration_transaction import operator, transaction

def run(args,**kwargs):
    result=subprocess.run(args,capture_output=True,text=True,**kwargs)
    if result.returncode:
        # Report SQL diagnostics only, never SQL input or generated credentials.
        errors=[line for line in result.stderr.splitlines() if line.startswith(('ERROR:','DETAIL:','HINT:'))]
        if errors:raise AssertionError('Native CI bootstrap: '+'; '.join(errors))
        result.check_returncode()
    return result.stdout.strip()

def create_database(root):
    images=json.loads((root/'tests/native-provider-images.json').read_text())
    name='jbfd-security-restore-ci-'+str(os.getpid())+'-'+str(int(time.time()))
    os.umask(0o077)
    directory=Path(tempfile.mkdtemp(prefix='jbfd-native-ci-'));env=directory/'database.env'
    env.write_text('POSTGRES_USER=supabase_admin\nPOSTGRES_DB=postgres\nPOSTGRES_PASSWORD='+secrets.token_hex(32)+'\nPOSTGRES_INITDB_ARGS=--auth-local=trust --auth-host=scram-sha-256\n')
    stage='start'
    try:
        run(['docker','run','-d','--name',name,'--label','jbfd.security.disposable=true','--network','none','--memory','768m','--cpus','1','--env-file',str(env),images['database']])
        for _ in range(90):
            if subprocess.run(['docker','exec',name,'pg_isready','-h','127.0.0.1','-U','supabase_admin'],capture_output=True).returncode==0:break
            time.sleep(1)
        else:raise RuntimeError('Native CI database readiness failed')
        def sql(statement,user='supabase_admin'):
            return run(['docker','exec','-i',name,'psql','-Xq','-U',user,'-d','postgres','-v','ON_ERROR_STOP=1'],input=statement)
        stage='roles'
        sql('''create role postgres login bypassrls;
create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create role authenticator login noinherit;create role supabase_auth_admin login noinherit;
create role supabase_storage_admin login noinherit bypassrls;
alter role supabase_auth_admin set search_path=auth,public,extensions;
alter role supabase_storage_admin set search_path=storage,public,extensions;
grant anon,authenticated,service_role to authenticator,supabase_storage_admin;
create schema extensions;create extension pgcrypto with schema extensions;
create extension "uuid-ossp" with schema extensions;
''')
        # No application triggers/policies or user rows are present in this DDL.
        stage='provider schema'
        sql((root/'tests/native-provider-schema.sql').read_text())
        stage='provider grants'
        sql('''alter schema auth owner to supabase_auth_admin;alter schema storage owner to supabase_storage_admin;
grant usage on schema auth,storage,extensions to anon,authenticated,service_role,postgres,supabase_auth_admin,supabase_storage_admin;
grant all on all tables in schema auth to supabase_auth_admin;
grant all on all sequences in schema auth to supabase_auth_admin;
grant all on all functions in schema auth to supabase_auth_admin;
grant all on all tables in schema storage to supabase_storage_admin;
grant all on all sequences in schema storage to supabase_storage_admin;
grant all on all functions in schema storage to supabase_storage_admin;
grant select on all tables in schema auth to postgres;
grant execute on all functions in schema auth to anon,authenticated,service_role,postgres;
grant select,insert,update,delete on all tables in schema storage to authenticated,service_role;
grant usage on all sequences in schema storage to authenticated,service_role;
grant execute on all functions in schema storage to authenticated,service_role;
do $$declare r record;begin
for r in select oid::regclass object from pg_class where relnamespace='auth'::regnamespace and relkind in ('r','p') loop
execute format('alter table %s owner to postgres',r.object);end loop;
for r in select oid::regclass object from pg_class where relnamespace='storage'::regnamespace and relkind in ('r','p') loop
execute format('alter table %s owner to supabase_storage_admin',r.object);end loop;
end$$;
grant select on all tables in schema auth to postgres;
grant trigger on auth.users to postgres;
alter database postgres owner to supabase_admin;
grant create on database postgres to postgres;
grant usage,create on schema public to postgres;
grant select,insert,update,delete on all tables in schema storage to postgres;
''')
        stage='migration operator'
        sql('alter role postgres nosuperuser bypassrls;')
        stage='application migrations'
        for migration in sorted((root/'supabase/migrations').glob('[0-9]*.sql')):
            if migration.name=='0008_company_branding.sql':
                # Exercise failure rollback with the same ownership boundary.
                invalid=directory/migration.name
                invalid.write_text("select 1/0;")
                try:
                    try:sql(transaction(invalid),operator(invalid))
                    except AssertionError:pass
                    else:raise AssertionError('Expected migration failure')
                    if 't' in sql("select pg_has_role('postgres','supabase_storage_admin','MEMBER');").splitlines():raise AssertionError('Failed migration leaked Storage membership')
                finally:invalid.unlink(missing_ok=True)
            try:sql(transaction(migration),operator(migration))
            except AssertionError as error:raise AssertionError(migration.name+': '+str(error)) from None
            if migration.name.startswith('0002_'):
                sql("""insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('16000000-0000-4000-8000-000000000001','legacy-native@example.invalid',now(),'{}');
insert into public.companies(id,name,cnpj,phone) values('16000000-0000-4000-8000-000000000011','Legacy native fixture','11222333000181','11999999999');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values('16000000-0000-4000-8000-000000000011','16000000-0000-4000-8000-000000000001','legacy-native@example.invalid','Legacy fixture','owner','active');""")
                # Prove the production baseline path without copying Live data.
                # Restore the actual 0001/0002 database archive, then continue all
                # remaining migrations against that restored database. Both DBs
                # stay in this network-none container with synthetic identities.
                stage='legacy baseline backup and restoration'
                before=sql("select row_to_json(x) from (select (select count(*) from auth.users) users,(select count(*) from public.companies) companies,(select count(*) from public.company_members) members)x;")
                run(['docker','exec',name,'pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f','/tmp/jbfd-legacy-baseline.dump'])
                run(['docker','exec',name,'createdb','-U','supabase_admin','jbfd_baseline_restore'])
                run(['docker','exec',name,'pg_restore','-U','supabase_admin','--exit-on-error','--clean','--if-exists','-d','jbfd_baseline_restore','/tmp/jbfd-legacy-baseline.dump'])
                for statement in ['alter database postgres rename to jbfd_baseline_original;', 'alter database jbfd_baseline_restore rename to postgres;']:
                    run(['docker','exec',name,'psql','-Xq','-U','supabase_admin','-d','template1','-v','ON_ERROR_STOP=1','-c',statement])
                after=sql("select row_to_json(x) from (select (select count(*) from auth.users) users,(select count(*) from public.companies) companies,(select count(*) from public.company_members) members)x;")
                if before!=after:raise AssertionError('Restored legacy baseline count mismatch')
                stage='application migrations after restored legacy baseline'
        sql('''do $$declare r record;begin
for r in select oid::regclass object from pg_class where relnamespace='auth'::regnamespace and relkind in ('r','p') loop
execute format('alter table %s owner to supabase_auth_admin',r.object);end loop;
for r in select oid::regclass object from pg_class where relnamespace='storage'::regnamespace and relkind in ('r','p') loop
execute format('alter table %s owner to supabase_storage_admin',r.object);end loop;
end$$;
grant select on all tables in schema auth to postgres;
grant select on all tables in schema storage to postgres;
do $$begin
if not exists(select 1 from public.companies where id='16000000-0000-4000-8000-000000000011' and name='Legacy native fixture' and terms_revision is null) then raise exception 'legacy fixture changed';end if;
end$$;''')
        if 't' in sql("select pg_has_role('postgres','supabase_storage_admin','MEMBER');").splitlines():raise AssertionError('Storage migration privilege leaked')
        return name,images
    except Exception as error:
        subprocess.run(['docker','rm','-fv',name],capture_output=True)
        if isinstance(error,AssertionError):raise AssertionError(stage+': '+str(error)) from None
        raise
    finally:
        env.unlink(missing_ok=True);directory.rmdir()

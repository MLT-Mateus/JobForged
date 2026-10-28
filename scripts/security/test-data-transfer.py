"""Actual isolated PostgreSQL transfer; synthetic identities only, no email."""
from pathlib import Path
import copy
import json
import subprocess
from native_ci_database import create_database
from data_transfer import collect, import_transaction, sql, verify

root=Path(__file__).resolve().parents[2]
container,_=create_database(root)
try:
    sql(container,"update auth.users set role='authenticated',recovery_token='DO-NOT-COPY',raw_user_meta_data=jsonb_build_object('company_signup_nonce',repeat('a',64));")
    sql(container,"insert into auth.sessions(id,user_id,created_at,updated_at,aal) values('18000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001',now(),now(),'aal1');")
    sql(container,"insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at,secret) values('18000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000001','totp','verified',now(),now(),'DO-NOT-COPY');")
    sql(container,"insert into public.platform_admins(user_id,email,role) values('16000000-0000-4000-8000-000000000001','legacy-native@example.invalid','platform_admin');")
    package=collect(container,{'users':1,'companies':1,'objects':0},responsible_email='legacy-native@example.invalid')
    assert 'DO-NOT-COPY' not in json.dumps(package)
    assert 'company_signup_nonce' not in json.dumps(package)
    subprocess.run(['docker','exec',container,'pg_dump','-U','supabase_admin','-d','postgres','--schema-only','-Fc','-f','/tmp/transfer-schema.dump'],capture_output=True,check=True)
    subprocess.run(['docker','exec',container,'createdb','-U','supabase_admin','jbfd_transfer_target'],capture_output=True,check=True)
    subprocess.run(['docker','exec',container,'pg_restore','-U','supabase_admin','--exit-on-error','--clean','--if-exists','-d','jbfd_transfer_target','/tmp/transfer-schema.dump'],capture_output=True,check=True)
    # Failure after identity insert must leave no partial accounts or disabled triggers.
    bad=copy.deepcopy(package);bad['tables']['public.company_members'][0]['company_id']='19000000-0000-4000-8000-000000000099'
    try:sql(container,import_transaction(container,bad,'jbfd_transfer_target'),'jbfd_transfer_target')
    except RuntimeError:pass
    else:raise AssertionError('Foreign key failure was not enforced')
    assert sql(container,'select count(*) from auth.users;','jbfd_transfer_target')=='0'
    assert sql(container,"select count(*) from pg_trigger where not tgisinternal and tgenabled='D';",'jbfd_transfer_target')=='0'
    sql(container,import_transaction(container,package,'jbfd_transfer_target'),'jbfd_transfer_target')
    result=verify(container,package,'jbfd_transfer_target')
    try:sql(container,import_transaction(container,package,'jbfd_transfer_target'),'jbfd_transfer_target')
    except RuntimeError:pass
    else:raise AssertionError('Existing Live data could be overwritten')
    assert sql(container,'select count(*) from auth.sessions;')=='1'
    assert sql(container,'select count(*) from auth.mfa_factors;')=='1'
    import importlib.util
    spec=importlib.util.spec_from_file_location('bootstrap_fixture',Path(__file__).with_name('bootstrap-live-admin.py'));bootstrap=importlib.util.module_from_spec(spec);spec.loader.exec_module(bootstrap)
    sql(container,bootstrap.bootstrap_sql('legacy-native@example.invalid','isolated-human-approval-fixture',prepare_only=True),'jbfd_transfer_target')
    assert sql(container,'select count(*) from public.platform_admins;','jbfd_transfer_target')=='0'
    assert sql(container,'select admin_mfa_enforced from app_private.security_settings;','jbfd_transfer_target')=='t'
    print(json.dumps({'isolated_database_transfer':True,'foreign_keys_enforced':True,'failed_import_rolled_back':True,'existing_target_rejected':True,'source_unchanged':True,**result}))
finally:
    subprocess.run(['docker','rm','-fv',container],capture_output=True)

-- Disposable isolated database only; fixtures and schema sentinels roll back.
begin;
set local statement_timeout='20s';
-- Isolated, rollback-only fixture cleanup; never used by application code.
set local storage.allow_delete_query='true';
insert into auth.users(id,email,email_confirmed_at,role,raw_user_meta_data) values
('17000000-0000-4000-8000-000000000001','security-owner@example.invalid',now(),'authenticated','{}'),
('17000000-0000-4000-8000-000000000002','security-other@example.invalid',now(),'authenticated','{}'),
('17000000-0000-4000-8000-000000000003','security-unlinked@example.invalid',now(),'authenticated','{}'),
('17000000-0000-4000-8000-000000000004','security-platform@example.invalid',now(),'authenticated','{}');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
('17000000-0000-4000-8000-000000000101','17000000-0000-4000-8000-000000000001',now(),now(),'aal1'),
('17000000-0000-4000-8000-000000000102','17000000-0000-4000-8000-000000000002',now(),now(),'aal1'),
('17000000-0000-4000-8000-000000000103','17000000-0000-4000-8000-000000000003',now(),now(),'aal1'),
('17000000-0000-4000-8000-000000000104','17000000-0000-4000-8000-000000000004',now(),now(),'aal1');
insert into public.companies(id,name) values
('17000000-0000-4000-8000-000000000011','Security fixture A'),
('17000000-0000-4000-8000-000000000012','Security fixture B');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values
('17000000-0000-4000-8000-000000000011','17000000-0000-4000-8000-000000000001','security-owner@example.invalid','Fixture A','owner','active'),
('17000000-0000-4000-8000-000000000012','17000000-0000-4000-8000-000000000002','security-other@example.invalid','Fixture B','owner','active');
insert into public.platform_admins(user_id,email,role) values('17000000-0000-4000-8000-000000000004','security-platform@example.invalid','platform_admin');
alter table public.companies add column security_fixture_secret text default 'DO_NOT_EXPOSE';
-- Existing objects, including orphans, count toward both quota dimensions.
insert into storage.objects(bucket_id,name,metadata)
select 'company-branding','17000000-0000-4000-8000-000000000011/'||md5(n::text)||'.png',jsonb_build_object('size',1)
from generate_series(1,200) n;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","session_id":"17000000-0000-4000-8000-000000000101","aal":"aal1","role":"authenticated"}',true);
do $$begin
 begin perform public.reserve_company_image('17000000-0000-4000-8000-000000000301');raise exception '200 image quota bypass';exception when program_limit_exceeded then null;end;
end$$;
reset role;
delete from storage.objects where bucket_id='company-branding' and name like '17000000-0000-4000-8000-000000000011/%';
insert into storage.objects(bucket_id,name,metadata) values('company-branding','17000000-0000-4000-8000-000000000011/large.png','{"size":999999999}');
set local role authenticated;
do $$begin
 begin perform public.reserve_company_image('17000000-0000-4000-8000-000000000301');raise exception '1 GB quota bypass';exception when program_limit_exceeded then null;end;
end$$;
reset role;
delete from storage.objects where bucket_id='company-branding' and name like '17000000-0000-4000-8000-000000000011/%';
set local role authenticated;
do $$begin
 perform public.reserve_company_image('17000000-0000-4000-8000-000000000301');
 perform public.reserve_company_image('17000000-0000-4000-8000-000000000302');
 begin perform public.reserve_company_image('17000000-0000-4000-8000-000000000303');raise exception 'concurrency quota bypass';exception when too_many_connections then null;end;
 if not app_private.storage_image_access('17000000-0000-4000-8000-000000000011/17000000-0000-4000-8000-000000000301.png',true) then raise exception 'reserved upload refused';end if;
 if app_private.storage_image_access('17000000-0000-4000-8000-000000000011/17000000-0000-4000-8000-000000000303.png',true) then raise exception 'unreserved upload accepted';end if;
 if app_private.storage_image_access('17000000-0000-4000-8000-000000000012/17000000-0000-4000-8000-000000000301.png',true) then raise exception 'cross tenant upload accepted';end if;
 if app_private.storage_image_access('platform/17000000-0000-4000-8000-000000000301.png',true) then raise exception 'platform upload accepted for company';end if;
 begin
  insert into storage.objects(bucket_id,name,metadata) values('company-branding','17000000-0000-4000-8000-000000000012/17000000-0000-4000-8000-000000000301.png','{"size":1}');
  raise exception 'Storage RLS tenant bypass';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","session_id":"17000000-0000-4000-8000-000000000101","aal":"aal1","role":"authenticated"}',true);
do $$declare result jsonb;begin
 if public.session_context_v1()->>'company_id'<>'17000000-0000-4000-8000-000000000011' then raise exception 'session context failed';end if;
 if app_private.company_role('17000000-0000-4000-8000-000000000012')<>'' then raise exception 'tenant role leak';end if;
 result:=public.company_read_v1();
 if result->'company' ? 'security_fixture_secret' then raise exception 'column leak';end if;
 if result->'company'->>'id'<>'17000000-0000-4000-8000-000000000011' then raise exception 'tenant read leak';end if;
 begin perform * from public.company_members;raise exception 'direct select exposed';exception when insufficient_privilege then null;end;
 begin perform public.update_company_profile('17000000-0000-4000-8000-000000000012','Invalid cross tenant',null,null);raise exception 'cross tenant write';exception when insufficient_privilege then null;end;
 begin perform public.update_company_profile('17000000-0000-4000-8000-000000000011','Fixture','11111111111111',null);raise exception 'invalid CNPJ accepted';exception when check_violation then null;end;
 begin perform public.begin_password_recovery('recovery');raise exception 'password session minted recovery';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000003","session_id":"17000000-0000-4000-8000-000000000103","aal":"aal1","role":"authenticated"}',true);
do $$begin
 if app_private.company_role('17000000-0000-4000-8000-000000000011')<>'' then raise exception 'unlinked authorized';end if;
 begin perform public.company_read_v1();raise exception 'unlinked read';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
values('17000000-0000-4000-8000-000000000201','17000000-0000-4000-8000-000000000101','otp',now(),now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","session_id":"17000000-0000-4000-8000-000000000101","aal":"aal1","role":"authenticated"}',true);
do $$declare nonce text;begin
 nonce:=public.begin_password_recovery('recovery');
 if not public.consume_password_recovery(nonce) then raise exception 'recovery refused';end if;
 if public.consume_password_recovery(nonce) then raise exception 'recovery replay';end if;
 begin perform public.begin_password_recovery('recovery');raise exception 'consumed session reissued';exception when insufficient_privilege then null;end;
 perform public.revoke_current_session();
 if public.session_context_v1() is not null then raise exception 'revoked session accepted';end if;
 begin perform public.read_company_branding();raise exception 'revoked RPC accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
update app_private.security_settings set admin_mfa_enforced=true where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000004","session_id":"17000000-0000-4000-8000-000000000104","aal":"aal1","role":"authenticated"}',true);
do $$begin
 begin perform public.platform_read('overview');raise exception 'MFA bypass';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
values('17000000-0000-4000-8000-000000000204','17000000-0000-4000-8000-000000000104','totp',now(),now());
insert into auth.mfa_factors(id,user_id,status,factor_type,created_at,updated_at)
values('17000000-0000-4000-8000-000000000404','17000000-0000-4000-8000-000000000004','verified','totp',now(),now());
update auth.sessions set aal='aal2' where id='17000000-0000-4000-8000-000000000104';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000004","session_id":"17000000-0000-4000-8000-000000000104","aal":"aal2","role":"authenticated"}',true);
do $$declare result jsonb;begin
 perform public.platform_read('overview');
 result:=public.platform_read('company','','',1,'17000000-0000-4000-8000-000000000011');
 if result->'company' ? 'security_fixture_secret' then raise exception 'platform projection leak';end if;
end$$;
reset role;
update auth.mfa_amr_claims set updated_at=now()-interval '1 hour',created_at=now()-interval '1 hour' where session_id='17000000-0000-4000-8000-000000000104';
set local role authenticated;
do $$begin
 begin perform public.platform_read('overview');raise exception 'old factor accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
update auth.users set banned_until=now()+interval '1 hour' where id='17000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","session_id":"17000000-0000-4000-8000-000000000102","aal":"aal1","role":"authenticated"}',true);
do $$begin
 if app_private.company_role('17000000-0000-4000-8000-000000000012')<>'' then raise exception 'banned identity accepted';end if;
end$$;
reset role;
rollback;
select 'security_foundation_passed';

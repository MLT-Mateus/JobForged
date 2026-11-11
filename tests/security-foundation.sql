-- Disposable isolated database only; fixtures and schema sentinels roll back.
begin;
set local statement_timeout='20s';
-- Isolated, rollback-only fixture cleanup; never used by application code.
set local storage.allow_delete_query='true';
insert into auth.users(id,email,email_confirmed_at,role,raw_user_meta_data) values
('17000000-0000-4000-8000-000000000001','security-owner@example.invalid',now(),'authenticated','{}'),
('17000000-0000-4000-8000-000000000002','security-other@example.invalid',now(),'authenticated','{}'),
('17000000-0000-4000-8000-000000000003','security-unlinked@example.invalid',now(),'authenticated','{}'),
('17000000-0000-4000-8000-000000000004','security-platform@example.invalid',now(),'authenticated','{}'),
('17000000-0000-4000-8000-000000000005','security-member@example.invalid',now(),'authenticated','{}');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
('17000000-0000-4000-8000-000000000101','17000000-0000-4000-8000-000000000001',now(),now(),'aal1'),
('17000000-0000-4000-8000-000000000102','17000000-0000-4000-8000-000000000002',now(),now(),'aal1'),
('17000000-0000-4000-8000-000000000103','17000000-0000-4000-8000-000000000003',now(),now(),'aal1'),
('17000000-0000-4000-8000-000000000104','17000000-0000-4000-8000-000000000004',now(),now(),'aal1'),
('17000000-0000-4000-8000-000000000105','17000000-0000-4000-8000-000000000005',now(),now(),'aal1');
insert into public.companies(id,name) values
('17000000-0000-4000-8000-000000000011','Security fixture A'),
('17000000-0000-4000-8000-000000000012','Security fixture B');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values
('17000000-0000-4000-8000-000000000011','17000000-0000-4000-8000-000000000001','security-owner@example.invalid','Fixture A','owner','active'),
('17000000-0000-4000-8000-000000000012','17000000-0000-4000-8000-000000000002','security-other@example.invalid','Fixture B','owner','active'),
('17000000-0000-4000-8000-000000000011','17000000-0000-4000-8000-000000000005','security-member@example.invalid','Fixture Member','member','active');
insert into public.platform_admins(user_id,email,role) values('17000000-0000-4000-8000-000000000004','security-platform@example.invalid','platform_admin');
alter table public.companies add column security_fixture_secret text default 'DO_NOT_EXPOSE';
alter table public.company_members add column security_fixture_secret text default 'DO_NOT_EXPOSE';
alter table public.platform_settings add column security_fixture_secret text default 'DO_NOT_EXPOSE';
alter table public.platform_banners add column security_fixture_secret text default 'DO_NOT_EXPOSE';
alter table public.platform_communications add column security_fixture_secret text default 'DO_NOT_EXPOSE';
insert into public.company_branding(company_id,published_by,published_version)
values('17000000-0000-4000-8000-000000000011','17000000-0000-4000-8000-000000000001',1);
insert into public.platform_banner_assets(id,path,size,sha256,created_by)
values('17000000-0000-4000-8000-000000000501','platform/17000000-0000-4000-8000-000000000501.png',1,repeat('a',64),'17000000-0000-4000-8000-000000000004');
insert into public.platform_banners(title,image_id,created_by)
values('Security fixture banner','17000000-0000-4000-8000-000000000501','17000000-0000-4000-8000-000000000004');
insert into public.platform_communications(title,message,audience,channel,created_by)
values('Security fixture campaign','Fixture only','companies','inapp','17000000-0000-4000-8000-000000000004');
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
 if public.update_my_member_profile('Fixture owner changed') ? 'security_fixture_secret' then raise exception 'profile projection leak';end if;
 begin perform public.update_my_member_identity_v1('Fixture owner changed','11111111111',null);raise exception 'invalid CPF accepted';exception when invalid_parameter_value then null;end;
 result:=public.update_my_member_identity_v1('Fixture owner changed','52998224725','11987654321');
 if result->>'cpf'<>'52998224725' then raise exception 'identity save failed';end if;
 if public.account_read_v1()->>'phone'<>'11987654321' then raise exception 'identity read failed';end if;
 if not exists(select 1 from jsonb_array_elements(public.company_read_v1()->'members') m where m->>'cpf'='52998224725') then raise exception 'authorized roster identity missing';end if;
 perform public.update_my_member_profile('Fixture owner renamed');
 if public.account_read_v1()->>'cpf'<>'52998224725' then raise exception 'legacy update cleared identity';end if;
end$$;
reset role;
insert into public.company_audit_events(company_id,actor_user_id,action,details)
select '17000000-0000-4000-8000-000000000011','17000000-0000-4000-8000-000000000001','domain.register','{"private":"DO_NOT_EXPOSE"}' from generate_series(1,25);
insert into public.company_audit_events(company_id,action) values('17000000-0000-4000-8000-000000000012','domain.register');
set local role authenticated;
do $$declare first_page jsonb;second_page jsonb;mid uuid;begin
 first_page:=public.company_activity_v1(1,'domain');second_page:=public.company_activity_v1(2,'domain');
 if (first_page->>'total')::integer<>25 or jsonb_array_length(first_page->'items')<>10 or jsonb_array_length(public.company_activity_v1(3,'domain')->'items')<>5 then raise exception 'pagination or tenant isolation failed';end if;
 if exists(select 1 from jsonb_array_elements(first_page->'items') a join jsonb_array_elements(second_page->'items') b on a->>'id'=b->>'id') then raise exception 'pagination overlaps';end if;
 if first_page::text like '%DO_NOT_EXPOSE%' or first_page::text like '%52998224725%' then raise exception 'audit payload leaked';end if;
 if public.company_activity_v1(99,'domain')->>'page'<>'3' then raise exception 'page clamping failed';end if;
 begin perform public.company_activity_v1(0,'all');raise exception 'invalid page accepted';exception when invalid_parameter_value then null;end;
 select (m->>'id')::uuid into mid from jsonb_array_elements(public.company_read_v1()->'members') m where m->>'role'='member';
 perform public.update_company_member_identity_v1(mid,'Fixture identity completed','52998224725','11987654321');
 if not exists(select 1 from jsonb_array_elements(public.company_read_v1()->'members') m where m->>'id'=mid::text and m->>'full_name'='Fixture identity completed' and m->>'cpf'='52998224725') then raise exception 'manager identity not persisted';end if;
 begin perform public.update_company_member_identity_v1(mid,'Fixture invalid','11111111111',null);raise exception 'manager accepted invalid CPF';exception when invalid_parameter_value then null;end;
 begin perform public.update_company_member_identity_v1('17000000-0000-4000-8000-000000000012','Fixture foreign',null,null);raise exception 'foreign identity write accepted';exception when insufficient_privilege then null;end;
 -- Restore the earlier fixture expectation, without clearing the owner's identity.
 perform public.update_company_member_identity_v1(mid,'Fixture Member',null,null);
end$$;
do $$declare result jsonb;mid uuid;photo text:=encode(convert_to('RIFF1234WEBPfixture','UTF8'),'base64');begin
 result:=public.member_photo_write_v1(photo,photo);mid:=(result->>'memberId')::uuid;
 if result->>'photoVersion'<>'1' then raise exception 'photo version missing';end if;
 if public.member_photo_read_v1(mid,true)<>photo then raise exception 'thumbnail read failed';end if;
 if public.account_read_v1()->>'photoVersion'<>'1' then raise exception 'profile photo projection missing';end if;
 if not exists(select 1 from jsonb_array_elements(public.company_read_v1()->'members') m where m->>'id'=mid::text and m->>'photo_version'='1') then raise exception 'roster photo missing';end if;
 perform set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","session_id":"17000000-0000-4000-8000-000000000102","aal":"aal1","role":"authenticated"}',true);
 if public.member_photo_read_v1(mid,true) is not null then raise exception 'cross-tenant photo leak';end if;
 perform set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","session_id":"17000000-0000-4000-8000-000000000101","aal":"aal1","role":"authenticated"}',true);
 begin perform public.member_photo_write_v1('invalid','invalid');raise exception 'invalid photo accepted';exception when invalid_parameter_value then null;end;
 perform public.member_photo_write_v1(null,null);
 if public.member_photo_read_v1(mid,true) is not null or public.account_read_v1()->>'photoVersion'<>'0' then raise exception 'photo removal failed';end if;
end$$;

-- Persistent publication, tenant isolation, authorization and public projection.
do $$begin
 begin perform count(*) from app_private.company_jobs;raise exception 'private jobs table exposed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
insert into public.company_portals(company_id,slug,is_public) values('17000000-0000-4000-8000-000000000011','security-jobs-fixture',false) on conflict(company_id) do update set slug=excluded.slug,is_public=false;
update public.company_branding set published='{"fixture":true}' where company_id='17000000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","session_id":"17000000-0000-4000-8000-000000000101","aal":"aal1","role":"authenticated"}',true);
do $$declare d jsonb:='{"title":"Public job fixture","area":"Engineering","level":"Senior","contractType":"CLT","modality":"Remoto","country":"Brasil","state":"SP","city":"São Paulo","summary":"Public description","responsibilities":["One","Two","Three"],"requirements":["One","Two","Three"],"experience":"","weeklyHours":"","schedule":"","salaryMin":"12345","salaryMax":"67890","currency":"BRL","salaryConfidential":true,"softSkills":[],"differentiators":[],"certifications":[],"education":"","languages":[],"benefits":[],"additionalBenefits":"","careerPlan":"","performanceReviews":false,"promotionPossible":false,"teamDescription":"","reportsTo":"","teamSize":"","tools":[],"methodology":"","challenges":"","openingReason":"","autonomy":"","hierarchy":"","stages":[{"id":"triagem","name":"Triagem","required":true},{"id":"entrevista","name":"Entrevista","required":true}],"technicalTest":false,"interviewTypes":[],"applicationDeadline":"","responseSla":"","lgpd":true,"responsibleId":"PRIVATE_FIXTURE","currentStep":0}';j jsonb;uid uuid;begin
 j:=public.company_jobs_v1('save',null,d,'Rascunho');uid:=(j->>'id')::uuid;
 if public.company_jobs_v1('get',uid)->>'title'<>'Public job fixture' then raise exception 'job not persisted';end if;
 if public.public_jobs_v1('security-jobs-fixture')<>'[]'::jsonb then raise exception 'draft exposed';end if;
 begin perform public.company_jobs_v1('status',uid,null,'Publicada',1);raise exception 'unpublished portal accepted';exception when sqlstate 'PT422' then null;end;
 begin perform public.company_jobs_v1('save',uid,d||'{"unknown":"secret"}',null,1);raise exception 'unknown field accepted';exception when invalid_parameter_value then null;end;
 perform set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","session_id":"17000000-0000-4000-8000-000000000102","aal":"aal1","role":"authenticated"}',true);
 if public.company_jobs_v1('list')<>'[]'::jsonb then raise exception 'cross tenant list leak';end if;
 begin perform public.company_jobs_v1('get',uid);raise exception 'cross tenant get leak';exception when no_data_found then null;end;
 begin perform public.company_jobs_v1('status',uid,null,'Publicada',1);raise exception 'cross tenant write';exception when no_data_found then null;end;
 perform set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000005","session_id":"17000000-0000-4000-8000-000000000105","aal":"aal1","role":"authenticated"}',true);
 begin perform public.company_jobs_v1('status',uid,null,'Publicada',1);raise exception 'member published';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","session_id":"17000000-0000-4000-8000-000000000101","aal":"aal1","role":"authenticated"}',true);
end;$$;
reset role;
update public.company_portals set is_public=true where slug='security-jobs-fixture';
set local role authenticated;
do $$declare j jsonb;uid uuid;public_result jsonb;begin
 j:=public.company_jobs_v1('list')->0;uid:=(j->>'id')::uuid;
 begin perform public.company_jobs_v1('save',uid,(j-'id'-'organizationId'-'status'-'version'-'createdAt'-'updatedAt'-'applicationsCount')||'{"title":""}', 'Publicada',1);raise exception 'incomplete job published';exception when invalid_parameter_value then null;end;
 j:=public.company_jobs_v1('status',uid,null,'Publicada',1);
 public_result:=public.public_jobs_v1('security-jobs-fixture');
 if jsonb_array_length(public_result)<>1 then raise exception 'published job absent';end if;
 if public_result::text like '%PRIVATE_FIXTURE%' or public_result::text like '%12345%' or public_result::text like '%67890%' or public_result->0 ? 'organizationId' then raise exception 'public job secret leak';end if;
 begin perform public.company_jobs_v1('status',uid,null,'Pausada',1);raise exception 'stale version accepted';exception when serialization_failure then null;end;
 j:=public.company_jobs_v1('status',uid,null,'Pausada',2);
 if public.public_jobs_v1('security-jobs-fixture')<>'[]'::jsonb then raise exception 'paused job exposed';end if;
 j:=public.company_jobs_v1('status',uid,null,'Publicada',3);
 perform public.company_jobs_v1('delete',uid,null,null,4);
 if public.public_jobs_v1('security-jobs-fixture')<>'[]'::jsonb or public.company_jobs_v1('list')<>'[]'::jsonb then raise exception 'deleted job exposed';end if;
end;$$;
reset role;
update public.company_portals set is_public=false where slug='security-jobs-fixture';
update public.company_branding set published='{}' where company_id='17000000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000005","session_id":"17000000-0000-4000-8000-000000000105","aal":"aal1","role":"authenticated"}',true);
do $$declare result jsonb;begin
 begin perform public.company_activity_v1();raise exception 'member read audit';exception when insufficient_privilege then null;end;
 begin perform public.update_company_member_identity_v1('17000000-0000-4000-8000-000000000012','Denied write',null,null);raise exception 'member wrote identity';exception when insufficient_privilege then null;end;
 result:=public.company_read_v1();
 if exists(select 1 from jsonb_array_elements(result->'members') m where m ? 'email' or m ? 'cpf' or m ? 'phone' or m ? 'security_fixture_secret') then raise exception 'member roster projection leak';end if;
 if public.account_read_v1()->>'cpf' is not null then raise exception 'other account CPF leaked';end if;
 if public.read_company_branding()->>'publishedBy' is not null then raise exception 'member received colleague email';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000003","session_id":"17000000-0000-4000-8000-000000000103","aal":"aal1","role":"authenticated"}',true);
do $$begin
 if app_private.company_role('17000000-0000-4000-8000-000000000011')<>'' then raise exception 'unlinked authorized';end if;
 begin perform public.account_read_v1();raise exception 'unlinked profile read';exception when insufficient_privilege then null;end;
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
 if public.platform_read('settings') ? 'security_fixture_secret' then raise exception 'settings projection leak';end if;
 result:=public.communications_read('manage');
 if exists(select 1 from jsonb_array_elements(result->'banners') b where b ? 'security_fixture_secret') then raise exception 'banner projection leak';end if;
 if exists(select 1 from jsonb_array_elements(result->'campaigns') c where c ? 'security_fixture_secret') then raise exception 'campaign projection leak';end if;
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
update auth.users set email='changed-company@example.invalid'
where id='17000000-0000-4000-8000-000000000001';
do $$
begin
 if not exists (
  select 1 from public.company_members
  where user_id='17000000-0000-4000-8000-000000000001' and email='changed-company@example.invalid'
 ) then raise exception 'confirmed auth email did not synchronize to company membership'; end if;
end;
$$;
rollback;
select 'security_foundation_passed';

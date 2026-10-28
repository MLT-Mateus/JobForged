-- Run with psql ON_ERROR_STOP=1 against Test only; everything is rolled back.
-- Transaction is started by the isolated security harness.
-- Fictional administrator is created by security-session-fixtures.sql.
insert into auth.users(id,email,email_confirmed_at) values
 ('26000000-0000-0000-0000-000000000001','fixture-owner-26@example.invalid',now()),
 ('26000000-0000-0000-0000-000000000002','fixture-other-26@example.invalid',now()),
 ('26000000-0000-0000-0000-000000000003','fixture-invite-26@example.invalid',now());
insert into public.companies(id,name) values
 ('26000000-0000-0000-0000-000000000011','Fixture 26 A'),
 ('26000000-0000-0000-0000-000000000012','Fixture 26 B');
insert into public.company_members(id,company_id,user_id,email,full_name,role,status) values
 ('26000000-0000-0000-0000-000000000021','26000000-0000-0000-0000-000000000011','26000000-0000-0000-0000-000000000001','fixture-owner-26@example.invalid','Fixture A','owner','active'),
 ('26000000-0000-0000-0000-000000000022','26000000-0000-0000-0000-000000000012','26000000-0000-0000-0000-000000000002','fixture-other-26@example.invalid','Fixture B','owner','active');
set local role authenticated;
select pg_temp.assume_user('26000000-0000-0000-0000-000000000001');
do $$begin
 if public.company_read_v1()->'company'->>'id'<>'26000000-0000-0000-0000-000000000011' then raise exception 'company contract leak';end if;
 begin perform * from public.companies;raise exception 'direct company SELECT allowed';exception when insufficient_privilege then null;end;
 begin perform public.platform_read('overview');raise exception 'tenant reached platform';exception when insufficient_privilege then null;end;
 begin perform public.platform_manage('company.status','26000000-0000-0000-0000-000000000012',null,'{"status":"suspended"}','test denied');raise exception 'tenant mutation succeeded';exception when insufficient_privilege then null;end;
 begin insert into public.platform_audit_events(actor_user_id,action,reason) values(auth.uid(),'fake','test');raise exception 'audit mutable';exception when insufficient_privilege then null;end;
 begin insert into public.platform_admins(user_id,email,role) values(auth.uid(),'fixture-owner-26@example.invalid','platform_admin');raise exception 'platform escalation allowed';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user(current_setting('jbfd.test_admin')::uuid);
do $$declare result jsonb; token_value text; invitation uuid;begin
 perform public.platform_read('overview');
 perform public.platform_read('companies','Fixture 26');
 perform public.platform_read('users','fixture');
 perform public.platform_read('audit');
 perform public.platform_read('invitations');
 perform public.platform_read('company','','',1,'26000000-0000-0000-0000-000000000011');
 begin perform public.platform_manage('company.update','26000000-0000-0000-0000-000000000011',null,'{"name":"Fixture","cnpj":"","phone":"","plan_id":"paid"}','field allowlist test');raise exception 'unknown field accepted';exception when invalid_parameter_value then null;end;
 begin perform public.platform_manage('member.update','26000000-0000-0000-0000-000000000011','26000000-0000-0000-0000-000000000021','{"role":"member","status":"inactive"}','test last owner');raise exception 'last owner removed';exception when insufficient_privilege then null;end;
 begin perform public.platform_manage('company.update','26000000-0000-0000-0000-000000000011',null,'{"name":"Fixture","cnpj":"11111111111111","phone":""}','invalid CNPJ test');raise exception 'invalid cnpj accepted';exception when invalid_parameter_value then null;end;
 begin perform public.platform_manage('settings.update',null,null,'{"platform_name":"Fixture","support_email":"a@example.invalid","support_url":"javascript:alert(1)"}','invalid url test');raise exception 'unsafe url accepted';exception when invalid_parameter_value then null;end;
 perform public.platform_manage('company.update','26000000-0000-0000-0000-000000000011',null,'{"name":"Fixture 26 edited","cnpj":"","phone":""}','profile fixture test');
 perform public.platform_manage('settings.update',null,null,'{"platform_name":"JobForged Test fixture","support_email":"a@example.invalid","support_url":"https://example.invalid/support"}','settings fixture test');
 if public.platform_public_settings()->>'platform_name'<>'JobForged Test fixture' then raise exception 'settings not persisted';end if;
 result:=public.platform_manage('invitation.create','26000000-0000-0000-0000-000000000011',null,'{"email":"fixture-invite-26@example.invalid","role":"member"}','invitation fixture test');
 token_value:=result->>'token';invitation:=(result->>'id')::uuid;
 if not public.company_invitation_matches(token_value,'fixture-invite-26@example.invalid') then raise exception 'new token invalid';end if;
 perform public.platform_manage('invitation.revoke','26000000-0000-0000-0000-000000000011',invitation,'{}','revoke fixture test');
 if public.company_invitation_matches(token_value,'fixture-invite-26@example.invalid') then raise exception 'revoked token valid';end if;
 result:=public.platform_manage('invitation.resend','26000000-0000-0000-0000-000000000011',invitation,'{}','resend fixture test');
 if result->>'token'=token_value then raise exception 'token reused';end if;
 perform public.platform_manage('company.status','26000000-0000-0000-0000-000000000011',null,'{"status":"suspended"}','suspend fixture test');
 if public.company_invitation_matches(result->>'token','fixture-invite-26@example.invalid') then raise exception 'suspended invitation valid';end if;
end$$;
select pg_temp.assume_user('26000000-0000-0000-0000-000000000001');
do $$begin
 if public.session_context_v1() is not null then raise exception 'suspended context leak';end if;
 begin perform public.update_my_member_profile('Attempt suspended');raise exception 'suspended profile writable';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user(current_setting('jbfd.test_admin')::uuid);
select public.platform_manage('company.status','26000000-0000-0000-0000-000000000011',null,'{"status":"active"}','reactivate fixture test')->>'ok' reactivated;
select pg_temp.assume_user('26000000-0000-0000-0000-000000000001');
do $$begin if public.company_read_v1()->'company'->>'id'<>'26000000-0000-0000-0000-000000000011' then raise exception 'reactivation failed';end if;end$$;
select pg_temp.assume_user(current_setting('jbfd.test_admin')::uuid);
do $$declare result jsonb;begin
 result:=public.platform_manage('invitation.create','26000000-0000-0000-0000-000000000011',null,'{"email":"fixture-invite-26@example.invalid","role":"member"}','single use fixture test');
 perform set_config('jbfd.invite_token',result->>'token',true);
end$$;
select pg_temp.assume_user('26000000-0000-0000-0000-000000000003');
select public.accept_company_invitation(current_setting('jbfd.invite_token')) is not null accepted;
do $$begin
 begin perform public.accept_company_invitation(current_setting('jbfd.invite_token'));raise exception 'token accepted twice';exception when invalid_parameter_value then null;end;
end$$;
reset role;
update public.company_invitations set accepted_at=null,expires_at=now()-interval '1 minute' where email='fixture-invite-26@example.invalid' and company_id='26000000-0000-0000-0000-000000000011';
do $$begin if public.company_invitation_matches(current_setting('jbfd.invite_token'),'fixture-invite-26@example.invalid') then raise exception 'expired token valid';end if;end$$;
do $$begin
 if not exists(select 1 from public.platform_audit_events where company_id='26000000-0000-0000-0000-000000000011' and actor_user_id=current_setting('jbfd.test_admin')::uuid and action='platform.company.status') then raise exception 'audit missing';end if;
 if exists(select 1 from public.platform_audit_events where details::text like '%token%') then raise exception 'token in audit';end if;
end$$;
rollback;
\echo 'Backoffice database security assertions passed; fixtures rolled back.'

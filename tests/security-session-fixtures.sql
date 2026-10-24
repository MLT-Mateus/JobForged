-- Harness-only, inside a rollback transaction in an isolated database.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('19000000-0000-4000-8000-000000000001','isolated-security-admin@example.invalid',now(),'{}');
insert into public.platform_admins(user_id,email,role) values
('19000000-0000-4000-8000-000000000001','isolated-security-admin@example.invalid','platform_admin');
select set_config('jbfd.test_admin','19000000-0000-4000-8000-000000000001',true);
update app_private.security_settings set admin_mfa_enforced=true where singleton;
create function pg_temp.assume_user(person uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare sid uuid:=md5(person::text||'isolated-security-session')::uuid;administrator boolean;
begin
 administrator:=person='19000000-0000-4000-8000-000000000001'::uuid;
 insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(sid,person,now(),now(),'aal1') on conflict do nothing;
 if administrator then
  update auth.sessions set aal='aal2' where id=sid;
  insert into auth.mfa_factors(id,user_id,status,factor_type,created_at,updated_at)
  values('19000000-0000-4000-8000-000000000101',person,'verified','totp',now(),now()) on conflict do nothing;
  insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
  values('19000000-0000-4000-8000-000000000201',sid,'totp',now(),now()) on conflict do nothing;
 end if;
 perform set_config('request.jwt.claim.sub',person::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',person,'session_id',sid,'role','authenticated','aal',case when administrator then 'aal2' else 'aal1' end)::text,true);
end;$$;

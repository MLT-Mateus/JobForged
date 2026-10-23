-- migration-role: supabase_admin
-- Additive security foundation. Existing migrations and tenant identifiers stay immutable.
-- MFA enforcement is enabled only by an enrolled administrator with a fresh factor.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated;
alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role supabase_admin in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema app_private revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema app_private revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema app_private revoke execute on functions from public, anon, authenticated;
alter default privileges for role supabase_admin in schema app_private revoke all on tables from public, anon, authenticated;
alter default privileges for role supabase_admin in schema app_private revoke all on sequences from public, anon, authenticated;
alter default privileges for role supabase_admin in schema app_private revoke execute on functions from public, anon, authenticated;

create table app_private.security_settings (
 singleton boolean primary key default true check(singleton),
 admin_mfa_enforced boolean not null default false,
 step_up_seconds integer not null default 300 check(step_up_seconds between 60 and 900)
);
insert into app_private.security_settings(singleton) values(true);
create table app_private.session_revocations (
 session_id uuid primary key, user_id uuid not null, revoked_at timestamptz not null default now()
);
create table app_private.recovery_intents (
 nonce_hash text primary key check(nonce_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid not null, session_id uuid not null, purpose text not null check(purpose in ('recovery','invite')),
 expires_at timestamptz not null, used_at timestamptz
);
create index recovery_intents_expiration on app_private.recovery_intents(expires_at);
create table app_private.request_limits (
 scope text not null, window_start timestamptz not null, hits integer not null check(hits>0),
 primary key(scope,window_start)
);
revoke all on all tables in schema app_private from public, anon, authenticated;

create function app_private.current_session_id() returns uuid language sql stable
set search_path=pg_catalog as $$
 select case when coalesce(auth.jwt()->>'session_id','') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then (auth.jwt()->>'session_id')::uuid end;
$$;
create function app_private.identity_session_valid() returns boolean language sql stable security definer
set search_path=pg_catalog as $$
 select exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
 where u.id=auth.uid() and s.id=app_private.current_session_id()
 and u.email_confirmed_at is not null and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=now())
 and (s.not_after is null or s.not_after>now())
 and not exists(select 1 from app_private.session_revocations r where r.session_id=s.id));
$$;
create or replace function public.is_platform_admin() returns boolean language sql stable security definer
set search_path=pg_catalog as $$
 select app_private.identity_session_valid() and exists(
 select 1 from public.platform_admins p join auth.users u on u.id=p.user_id
 where p.user_id=auth.uid() and p.email=lower(u.email) and p.role='platform_admin');
$$;
create or replace function app_private.company_role(target_company_id uuid) returns text
language sql stable security definer set search_path=pg_catalog as $$
 select coalesce((select m.role from public.company_members m join public.companies c on c.id=m.company_id
 where app_private.identity_session_valid() and m.company_id=target_company_id
 and m.user_id=auth.uid() and m.status='active' and c.operational_status='active' limit 1),'');
$$;
create or replace function app_private.is_company_member(target_company_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select app_private.company_role(target_company_id)<>'';
$$;
create function app_private.require_admin_factor(force_enforcement boolean default false) returns void
language plpgsql stable security definer set search_path=pg_catalog as $$
declare settings app_private.security_settings;
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 select * into settings from app_private.security_settings where singleton;
 if force_enforcement or settings.admin_mfa_enforced then
  if coalesce(auth.jwt()->>'aal','')<>'aal2'
   or not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified')
   or not exists(select 1 from auth.sessions s where s.id=app_private.current_session_id() and s.aal='aal2')
   or not exists(
   select 1 from auth.mfa_amr_claims a where a.session_id=app_private.current_session_id()
   and a.authentication_method in ('totp','mfa/totp','mfa/phone','phone','webauthn','mfa/webauthn')
   and greatest(a.created_at,a.updated_at)>now()-make_interval(secs=>settings.step_up_seconds)) then
   raise exception 'recent MFA required' using errcode='42501';
  end if;
 end if;
end;$$;
create function app_private.security_gate(admin_operation boolean default false) returns void
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not app_private.identity_session_valid() then raise exception 'session unavailable' using errcode='42501';end if;
 if admin_operation then perform app_private.require_admin_factor();end if;
end;$$;

-- Wrap every existing authenticated business RPC. Original grants to legacy
-- implementations are removed so a direct REST/RPC call cannot skip the guard.
do $$
declare f record; arguments text; identity_arguments text; result_type text; call_arguments text; body text;
begin
 for f in select p.*,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f' and p.proname not in
 ('is_platform_admin','handle_new_company_admin','touch_updated_at','company_invitation_matches','platform_public_settings')
 loop
  arguments:=pg_get_function_arguments(f.oid);identity_arguments:=pg_get_function_identity_arguments(f.oid);
  result_type:=pg_get_function_result(f.oid);
  select string_agg('$'||i,',' order by i) into call_arguments from generate_series(1,f.pronargs) i;
  call_arguments:=coalesce(call_arguments,'');
  execute format('alter function public.%I(%s) rename to %I',f.proname,identity_arguments,'security_legacy_'||f.proname);
  execute format('alter function public.%I(%s) set schema app_private','security_legacy_'||f.proname,identity_arguments);
  execute format('revoke all on function app_private.%I(%s) from public,anon,authenticated,service_role','security_legacy_'||f.proname,identity_arguments);
  body:=format('begin perform app_private.security_gate(%L); %s app_private.%I(%s); end;',
   f.proname like 'platform_%' or f.proname in ('communications_manage','claim_communication_email','finish_communication_email','register_platform_banner_asset'),
   case when f.prorettype='void'::regtype then 'perform' when f.proretset then 'return query select * from' else 'return' end,
   'security_legacy_'||f.proname,call_arguments);
  execute format('create function public.%I(%s) returns %s language plpgsql security definer set search_path=pg_catalog as %L',f.proname,arguments,result_type,body);
  execute format('revoke all on function public.%I(%s) from public,anon',f.proname,identity_arguments);
  execute format('grant execute on function public.%I(%s) to authenticated',f.proname,identity_arguments);
 end loop;
end;$$;

create function public.session_context_v1() returns jsonb language sql stable security definer
set search_path=pg_catalog as $$
 select jsonb_build_object('id',m.id,'company_id',m.company_id,'role',m.role,'full_name',m.full_name,
 'companies',jsonb_build_object('id',c.id,'name',c.name))
 from public.company_members m join public.companies c on c.id=m.company_id
 where m.user_id=auth.uid() and m.status='active' and app_private.is_company_member(c.id) limit 1;
$$;
create function public.company_read_v1() returns jsonb language plpgsql stable security definer
set search_path=pg_catalog as $$
declare cid uuid; actor_role text;
begin
 perform app_private.security_gate();
 select m.company_id into cid from public.company_members m where m.user_id=auth.uid() and m.status='active' limit 1;
 actor_role:=app_private.company_role(cid);
 if actor_role='' or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 return jsonb_build_object('role',actor_role,'company',(select jsonb_build_object(
  'id',c.id,'name',c.name,'cnpj',c.cnpj,'phone',c.phone,'plan_id',c.plan_id,'plan_status',c.plan_status,'created_at',c.created_at)
  from public.companies c where c.id=cid),
 'members',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',m.id,'full_name',m.full_name,'role',m.role,
  'email',case when actor_role in ('owner','admin') then m.email end,
  'status',case when actor_role in ('owner','admin') then m.status end,'created_at',m.created_at)) order by m.created_at),'[]')
  from public.company_members m where m.company_id=cid and (actor_role in ('owner','admin') or m.status='active')),
 'audit',case when actor_role in ('owner','admin') then
  (select coalesce(jsonb_agg(x),'[]') from (select id,action,target_id,details,created_at
  from public.company_audit_events where company_id=cid order by created_at desc,id desc limit 30)x) else '[]'::jsonb end);
end;$$;
revoke select on public.companies,public.company_members,public.company_audit_events from authenticated;

create function public.revoke_current_session() returns void language plpgsql security definer
set search_path=pg_catalog as $$
begin
 if auth.uid() is null or app_private.current_session_id() is null then raise exception 'session required' using errcode='42501';end if;
 insert into app_private.session_revocations(session_id,user_id) values(app_private.current_session_id(),auth.uid()) on conflict do nothing;
 delete from app_private.recovery_intents where user_id=auth.uid() and session_id=app_private.current_session_id();
end;$$;
create function public.security_status() returns jsonb language plpgsql stable security definer
set search_path=pg_catalog as $$
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 return jsonb_build_object('mfaEnforced',(select admin_mfa_enforced from app_private.security_settings where singleton),
 'aal',coalesce(auth.jwt()->>'aal','aal1'),'verifiedFactors',
 (select count(*) from auth.mfa_factors where user_id=auth.uid() and status='verified'));
end;$$;
create function public.enable_admin_mfa() returns void language plpgsql security definer
set search_path=pg_catalog as $$
begin
 perform app_private.require_admin_factor(true);
 if exists(select 1 from public.platform_admins p where not exists(select 1 from auth.mfa_factors f where f.user_id=p.user_id and f.status='verified')) then
  raise exception 'administrative enrollment incomplete' using errcode='42501';end if;
 update app_private.security_settings set admin_mfa_enforced=true where singleton;
 insert into public.platform_audit_events(actor_user_id,action,reason,details)
 values(auth.uid(),'platform.security.mfa_enabled','Administrative factors verified','{}');
end;$$;

alter table public.company_members add constraint security_member_role check(role in ('owner','admin','member')) not valid;
alter table public.company_members add constraint security_member_status check(status in ('active','inactive')) not valid;
alter table public.companies add constraint security_company_name check(length(trim(name)) between 2 and 160) not valid;
alter table public.companies add constraint security_company_cnpj check(cnpj is null or app_private.valid_cnpj(cnpj)) not valid;
alter table public.companies add constraint security_company_phone check(phone is null or phone ~ '^([0-9]{10,13})?$') not valid;
alter table public.company_members validate constraint security_member_role;
alter table public.company_members validate constraint security_member_status;
alter table public.companies validate constraint security_company_name;
alter table public.companies validate constraint security_company_cnpj;
alter table public.companies validate constraint security_company_phone;
create index security_members_company_status_role on public.company_members(company_id,status,role);
create index security_company_audit_tenant_time on public.company_audit_events(company_id,created_at desc,id desc);

revoke all on all functions in schema app_private from public,anon,authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.company_role(uuid),app_private.is_company_member(uuid) to authenticated;
revoke all on function public.session_context_v1(),public.company_read_v1(),public.revoke_current_session(),public.security_status(),public.enable_admin_mfa() from public,anon;
grant execute on function public.session_context_v1(),public.company_read_v1(),public.revoke_current_session(),public.security_status(),public.enable_admin_mfa() to authenticated;

alter table app_private.security_settings owner to postgres;
alter table app_private.session_revocations owner to postgres;
alter table app_private.recovery_intents owner to postgres;
alter table app_private.request_limits owner to postgres;

-- Keep application SECURITY DEFINER routines owned by the non-superuser
-- postgres role even when a privileged migration operator sets default ACLs.
do $$declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','app_private') and pg_get_userbyid(p.proowner)='supabase_admin' loop
 execute format('alter function %s owner to postgres',r.signature);end loop;
end;$$;

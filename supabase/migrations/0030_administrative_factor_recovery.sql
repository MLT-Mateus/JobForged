-- migration-role: supabase_admin
-- Root-operated recovery grants authorize exactly one factor enrollment for a
-- particular freshly authenticated session. They never bypass business MFA.
create table app_private.administrative_factor_recovery(
 user_id uuid primary key references auth.users(id) on delete cascade,session_id uuid not null references auth.sessions(id) on delete cascade,
 approved_at timestamptz not null default now(),expires_at timestamptz not null,
 used_at timestamptz,reason text not null check(length(trim(reason)) between 10 and 500),
 check(expires_at>approved_at and expires_at<=approved_at+interval '15 minutes')
);
revoke all on app_private.administrative_factor_recovery from public,anon,authenticated,service_role,jbfd_security_gateway;
create table app_private.administrative_recovery_audit(
 id bigint generated always as identity primary key,user_id uuid not null,session_id uuid not null,
 action text not null,reason text not null,created_at timestamptz not null default now(),operator text not null
);
revoke all on app_private.administrative_recovery_audit from public,anon,authenticated,service_role,jbfd_security_gateway;
create function app_private.audit_factor_recovery() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
 insert into app_private.administrative_recovery_audit(user_id,session_id,action,reason,operator)
 values(new.user_id,new.session_id,case when new.used_at is null then 'root.enrollment_approved' else 'session.enrollment_consumed' end,new.reason,session_user);
 return new;
end;$$;
create trigger audit_factor_recovery after insert or update on app_private.administrative_factor_recovery
for each row execute function app_private.audit_factor_recovery();
create function app_private.gateway_session_active(person uuid,session uuid,claimed_aal text,sensitive boolean,operation text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform set_config('request.jwt.claim.sub',person::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',person,'session_id',session,'aal',claimed_aal,'role','authenticated')::text,true);
 if operation='POST /auth/v1/factors' and app_private.identity_session_valid() and public.is_platform_admin()
 and not exists(select 1 from auth.mfa_factors where user_id=person and status='verified') then
  update app_private.administrative_factor_recovery set used_at=now()
  where user_id=person and session_id=session and used_at is null and expires_at>now();
  if found then return true;end if;
 end if;
 return app_private.gateway_session_active(person,session,claimed_aal,sensitive);
end;$$;
alter table app_private.administrative_factor_recovery owner to postgres;
alter table app_private.administrative_recovery_audit owner to postgres;
alter function app_private.audit_factor_recovery() owner to postgres;
revoke all on function app_private.audit_factor_recovery() from public,anon,authenticated,service_role,jbfd_security_gateway;
alter function app_private.gateway_session_active(uuid,uuid,text,boolean,text) owner to postgres;
revoke all on function app_private.gateway_session_active(uuid,uuid,text,boolean,text) from public,anon,authenticated,service_role;
grant execute on function app_private.gateway_session_active(uuid,uuid,text,boolean,text) to jbfd_security_gateway;

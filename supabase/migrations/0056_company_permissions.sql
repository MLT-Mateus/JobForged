-- migration-role: supabase_admin
-- Tenant-scoped permissions. Owner always retains control; no client-side-only grants.
create table app_private.company_member_permissions(member_id uuid primary key references public.company_members(id) on delete cascade, grants jsonb not null default '{}',version bigint not null default 1,updated_at timestamptz not null default now());
alter table app_private.company_member_permissions owner to postgres;
revoke all on app_private.company_member_permissions from public,anon,authenticated,service_role;
create function app_private.permission_keys() returns text[] language sql immutable set search_path=pg_catalog as $$select array['dashboards.view','jobs.view','jobs.create','jobs.edit','jobs.delete','branches.view','branches.manage','applications.view','applications.move','applications.decide','applications.notes','applications.resume','agenda.view','agenda.manage','appearance.manage','admins.view','admins.manage','admins.permissions','settings.manage','finance.view']::text[]$$;
create function app_private.current_company_id() returns uuid language sql stable security definer set search_path=pg_catalog as $$select m.company_id from public.company_members m where m.user_id=auth.uid() and app_private.is_company_member(m.company_id) limit 1$$;
create function app_private.company_can(permission text) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select coalesce((select case when m.role='owner' then true when p.member_id is not null then coalesce((p.grants->>permission)::boolean,false) else m.role='admin' and permission not in ('finance.view','admins.permissions') end from public.company_members m left join app_private.company_member_permissions p on p.member_id=m.id where m.user_id=auth.uid() and app_private.is_company_member(m.company_id) limit 1),false) and permission=any(app_private.permission_keys()) and not public.is_platform_admin();
$$;
create function app_private.require_company_permission(permission text) returns void language plpgsql security definer set search_path=pg_catalog as $$begin perform app_private.security_gate();if not app_private.company_can(permission) then raise exception 'permission denied' using errcode='42501';end if;end;$$;
-- Preserve the former restricted member role as a restricted administrator.
insert into app_private.company_member_permissions(member_id,grants) select id,'{"jobs.view":true,"branches.view":true}' from public.company_members where role='member';
update public.company_members set role='admin' where role='member';
create function public.company_access_v1(operation text default 'read',member_id uuid default null,permissions jsonb default null,expected_version bigint default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid:=app_private.current_company_id();target public.company_members;p app_private.company_member_permissions;k text;g jsonb;
begin
 perform app_private.security_gate();if cid is null or public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if operation='save' then
  perform app_private.require_company_permission('admins.permissions');
  select * into target from public.company_members m where m.id=member_id and m.company_id=cid for update;
  if target.id is null or target.role='owner' or target.user_id=auth.uid() then raise exception 'protected account' using errcode='42501';end if;
  if jsonb_typeof(permissions) is distinct from 'object' or octet_length(permissions::text)>4000 then raise exception 'invalid permissions' using errcode='22023';end if;
  for k in select jsonb_object_keys(permissions) loop
   if not k=any(app_private.permission_keys()) or jsonb_typeof(permissions->k)<>'boolean' or (permissions->>k='true' and not app_private.company_can(k)) then raise exception 'invalid grant' using errcode='42501';end if;
  end loop;
  select * into p from app_private.company_member_permissions x where x.member_id=target.id;
  if coalesce(p.version,0) is distinct from expected_version then raise exception 'conflict' using errcode='40001';end if;
  insert into app_private.company_member_permissions(member_id,grants) values(target.id,permissions) on conflict on constraint company_member_permissions_pkey do update set grants=excluded.grants,version=company_member_permissions.version+1,updated_at=now();
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details) values(cid,auth.uid(),'member.permissions',target.id,jsonb_build_object('permissions',permissions));
 elsif operation<>'read' then raise exception 'invalid operation' using errcode='22023';end if;
 if member_id is not null then
  perform app_private.require_company_permission('admins.view');
  select * into target from public.company_members m where m.id=member_id and m.company_id=cid;
 else select * into target from public.company_members m where m.user_id=auth.uid() and m.company_id=cid;end if;
 if target.id is null then raise exception 'not found' using errcode='P0002';end if;
 select * into p from app_private.company_member_permissions x where x.member_id=target.id;
 select jsonb_object_agg(key,case when target.role='owner' then true when p.member_id is not null then coalesce((p.grants->>key)::boolean,false) else target.role='admin' and key not in ('finance.view','admins.permissions') end) into g from unnest(app_private.permission_keys()) key;
 return jsonb_build_object('companyId',cid,'memberId',target.id,'role',target.role,'permissions',g,'version',coalesce(p.version,0),'limitsEnforced',false);
end;$$;
-- Enforce permissions inside existing RPCs too (including direct PostgREST calls).
do $$declare r record;definition text;guard text;begin
 for r in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public' and l.lanname='plpgsql' and p.proname=any(array['company_jobs_v1','company_branches_v1','create_company_invitation','update_company_member','update_company_member_identity_v1','revoke_company_invitation','write_company_branding','reserve_company_image','register_company_image','write_company_portal','publish_portal_with_domain','company_domain','company_domain_with_preferences','update_company_profile','job_assistant_issue']) loop
 guard:=case r.proname
 when 'company_jobs_v1' then 'perform app_private.require_company_permission(case when operation in (''list'',''get'') then ''jobs.view'' when operation=''delete'' then ''jobs.delete'' when operation=''save'' and job_id is null then ''jobs.create'' else ''jobs.edit'' end);'
 when 'company_branches_v1' then 'perform app_private.require_company_permission(case when operation in (''list'',''get'') then ''branches.view'' else ''branches.manage'' end);'
 when 'job_assistant_issue' then 'if not(app_private.company_can(''jobs.create'') or app_private.company_can(''jobs.edit'')) then raise exception ''denied'' using errcode=''42501'';end if;'
 when 'update_company_profile' then 'perform app_private.require_company_permission(''settings.manage'');'
 when 'create_company_invitation' then 'perform app_private.require_company_permission(''admins.manage'');if invite_role<>''admin'' then raise exception ''invalid role'' using errcode=''22023'';end if;'
 when 'update_company_member' then 'perform app_private.require_company_permission(''admins.manage'');if new_role<>''admin'' then raise exception ''invalid role'' using errcode=''42501'';end if;'
 when 'update_company_member_identity_v1' then 'perform app_private.require_company_permission(''admins.manage'');if exists(select 1 from public.company_members where id=target_member_id and role=''owner'') then raise exception ''protected owner'' using errcode=''42501'';end if;'
 when 'revoke_company_invitation' then 'perform app_private.require_company_permission(''admins.manage'');'
 when 'company_domain' then 'if operation<>''read'' then perform app_private.require_company_permission(''appearance.manage'');end if;'
 when 'company_domain_with_preferences' then 'if operation<>''read'' then perform app_private.require_company_permission(''appearance.manage'');end if;'
 else 'perform app_private.require_company_permission(''appearance.manage'');' end;
 definition:=pg_get_functiondef(r.oid);definition:=regexp_replace(definition,'\mBEGIN\M','BEGIN '||guard,'i');execute definition;
 end loop;
end;$$;
do $$declare r record;begin for r in select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname=any(array['permission_keys','current_company_id','company_can','require_company_permission','company_access_v1']) loop execute format('alter function %s owner to postgres',r.signature);execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);end loop;end;$$;
grant execute on function public.company_access_v1(text,uuid,jsonb,bigint) to authenticated;
notify pgrst,'reload schema';

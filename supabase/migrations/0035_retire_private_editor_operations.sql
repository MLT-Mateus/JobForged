-- migration-role: supabase_admin
-- An old tab saying "Save draft" must never silently publish after the policy change.
-- Keep explicit legacy Publish compatible; current editor uses the public-on-save contract.
alter function public.write_company_branding(text,bigint,jsonb,uuid) rename to branding_write_public_v1;
alter function public.branding_write_public_v1(text,bigint,jsonb,uuid) set schema app_private;
revoke all on function app_private.branding_write_public_v1(text,bigint,jsonb,uuid) from public,anon,authenticated,service_role;
create function public.write_company_branding(operation text,expected_version bigint,configuration jsonb default null,history_id uuid default null)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;actual text;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 if operation in ('save','reset','restore') then
  raise exception 'editor updated; reload before saving' using errcode='PT409',detail='editor_contract_retired';
 end if;
 actual:=case operation when 'save_public' then 'save' when 'reset_public' then 'reset' when 'restore_public' then 'restore' else operation end;
 return app_private.branding_write_public_v1(actual,expected_version,configuration,history_id);
end;$$;
alter function public.write_company_branding(text,bigint,jsonb,uuid) owner to postgres;
revoke all on function public.write_company_branding(text,bigint,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.write_company_branding(text,bigint,jsonb,uuid) to authenticated;
create or replace function public.write_company_portal(operation text,expected_version bigint,requested_slug text default null,branding_version bigint default null,configuration jsonb default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;row public.company_portals;v bigint;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 -- Same lock order as branding mutations and suspension; prevents a portal/branding deadlock.
 perform 1 from public.companies where id=cid for update;
 perform app_private.consume_operation_budget('portal-operation',cid,60,60);
 select * into row from public.company_portals where company_id=cid for update;
 if expected_version is null or expected_version<>row.version then raise exception 'portal conflict' using errcode='PT409';end if;
 if operation='address' then
  if not app_private.valid_portal_slug(requested_slug) then raise exception 'invalid slug' using errcode='22023';end if;
 elsif operation in ('publish','save') then v:=public.write_company_branding('save_public',branding_version,configuration);
 else raise exception 'invalid operation' using errcode='22023';end if;
 update public.company_portals set slug=case when operation='address' then requested_slug else slug end,is_public=true,
 version=version+1,updated_at=now(),updated_by=auth.uid() where company_id=cid;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 values(cid,auth.uid(),'portal.'||operation,cid,jsonb_build_object('previousSlug',row.slug,'slug',case when operation='address' then requested_slug else row.slug end,'version',row.version+1));
 return public.read_company_portal();
end;$$;
notify pgrst,'reload schema';

-- migration-role: supabase_admin
-- Product decision: saving updates the public company page; no private draft state.
-- Retain legacy columns and signatures for compatible application rollback.
create or replace function public.write_company_branding(operation text,expected_version bigint,configuration jsonb default null,history_id uuid default null)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;row public.company_branding;next_value jsonb;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 perform 1 from public.companies where id=cid for update;
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 perform app_private.consume_operation_budget('branding-save',cid,60,60);
 insert into public.company_branding(company_id) values(cid) on conflict do nothing;
 select * into row from public.company_branding where company_id=cid for update;
 if expected_version is null or row.version<>expected_version then raise exception 'branding conflict' using errcode='PT409';end if;
 if operation='discard' then return row.version;
 elsif operation in ('save','publish','reset') then next_value:=configuration;
 elsif operation='restore' then select snapshot into next_value from public.company_branding_history where id=history_id and company_id=cid;
 else raise exception 'invalid operation' using errcode='22023';end if;
 if next_value is null or next_value='{}'::jsonb then raise exception 'version unavailable' using errcode='22023';end if;
 perform app_private.validate_branding(cid,next_value);
 update public.company_branding set draft=next_value,published=next_value,version=version+1,published_version=version+1,
 updated_at=now(),updated_by=auth.uid(),published_at=now(),published_by=auth.uid() where company_id=cid returning * into row;
 insert into public.company_branding_history(company_id,version,snapshot,actor_id) values(cid,row.version,next_value,auth.uid());
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 values(cid,auth.uid(),'branding.'||operation,cid,jsonb_build_object('version',row.version,'restored_from',history_id,'public_on_save',true));
 return row.version;
end;$$;
-- Preserve the previously saved configuration and all historical versions.
do $$declare b public.company_branding;begin
 for b in select * from public.company_branding where draft<>'{}'::jsonb and draft is distinct from published loop
  if b.updated_by is null then raise exception 'saved branding author missing';end if;
  insert into public.company_branding_history(company_id,version,snapshot,actor_id) values(b.company_id,b.version+1,b.draft,b.updated_by);
  update public.company_branding set published=draft,version=version+1,published_version=version+1,published_at=now(),published_by=updated_by where company_id=b.company_id;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
  values(b.company_id,b.updated_by,'portal.public_on_save',b.company_id,jsonb_build_object('version',b.version+1,'source','saved_configuration'));
 end loop;
end$$;
alter table public.company_portals alter column is_public set default true;
update public.company_portals set is_public=true,version=version+1,updated_at=now() where not is_public;
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
 elsif operation in ('publish','save') then v:=public.write_company_branding('save',branding_version,configuration);
 else raise exception 'invalid operation' using errcode='22023';end if;
 update public.company_portals set slug=case when operation='address' then requested_slug else slug end,is_public=true,
 version=version+1,updated_at=now(),updated_by=auth.uid() where company_id=cid;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 values(cid,auth.uid(),'portal.'||operation,cid,jsonb_build_object('previousSlug',row.slug,'slug',case when operation='address' then requested_slug else row.slug end,'version',row.version+1));
 return public.read_company_portal();
end;$$;
create or replace function public.read_public_company_portal(requested_slug text) returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('slug',p.slug,'version',coalesce(b.published_version,0),'configuration',coalesce(app_private.public_portal_document(p.company_id,p.slug),jsonb_build_object('displayName',c.name,'shortName',left(c.name,24))))
 from public.company_portals p join public.companies c on c.id=p.company_id left join public.company_branding b on b.company_id=p.company_id
 where app_private.valid_portal_slug(requested_slug) and p.slug=requested_slug and p.is_public and c.operational_status='active';
$$;
revoke all on function public.write_company_branding(text,bigint,jsonb,uuid),public.write_company_portal(text,bigint,text,bigint,jsonb) from public,anon,service_role;
grant execute on function public.write_company_branding(text,bigint,jsonb,uuid),public.write_company_portal(text,bigint,text,bigint,jsonb) to authenticated;
notify pgrst,'reload schema';

-- Additive banner formats and derived account setup. No completion flags can be supplied by clients.
alter table public.platform_banners add column mobile_image_id uuid references public.platform_banner_assets(id);

alter function public.communications_manage(text,uuid,integer,jsonb) set schema app_private;
revoke all on function app_private.communications_manage(text,uuid,integer,jsonb) from public,anon,authenticated;
create function public.communications_manage(operation text,record_id uuid default null,expected_version integer default 0,values_json jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb; mobile uuid;
begin
 if operation='banner.save' then
  if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
  if values_json ? 'mobile_image_id' then
   mobile:=nullif(values_json->>'mobile_image_id','')::uuid;
   if mobile is not null and not exists(select 1 from public.platform_banner_assets where id=mobile) then raise exception 'image unavailable';end if;
  end if;
 end if;
 result:=app_private.communications_manage(operation,record_id,expected_version,values_json);
 if operation='banner.save' and values_json ? 'mobile_image_id' then
  update public.platform_banners set mobile_image_id=mobile where id=(result->>'id')::uuid;
 end if;
 return result;
end; $$;
revoke all on function public.communications_manage(text,uuid,integer,jsonb) from public,anon;
grant execute on function public.communications_manage(text,uuid,integer,jsonb) to authenticated;

alter function public.communications_read(text,integer) set schema app_private;
revoke all on function app_private.communications_read(text,integer) from public,anon,authenticated;
create function public.communications_read(section text default 'inbox',page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb; field_name text; items jsonb;
begin
 result:=app_private.communications_read(section,page_number);
 if section in ('banners','manage') then
  field_name:=case when section='manage' then 'banners' else 'items' end;
  select coalesce(jsonb_agg(e.value||jsonb_build_object('mobile_image_id',b.mobile_image_id) order by e.ordinality),'[]'::jsonb) into items from jsonb_array_elements(result->field_name) with ordinality e(value,ordinality) join public.platform_banners b on b.id=(e.value->>'id')::uuid;
  result:=jsonb_set(result,array[field_name],items);
 end if;
 return result;
end; $$;
revoke all on function public.communications_read(text,integer) from public,anon;
grant execute on function public.communications_read(text,integer) to authenticated;

create or replace function public.read_platform_banner_asset(asset_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if not app_private.communications_access() then raise exception 'not authorized' using errcode='42501'; end if;
 select jsonb_build_object('path',a.path,'size',a.size,'sha256',a.sha256) into result from public.platform_banner_assets a where a.id=asset_id and (public.is_platform_admin() or exists(select 1 from public.platform_banners b where (b.image_id=a.id or b.mobile_image_id=a.id) and b.active));
 if result is null then raise exception 'asset unavailable' using errcode='42501'; end if;return result;
end; $$;

create function public.company_setup_status() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
declare cid uuid:=app_private.branding_company(); result jsonb;
begin
 select jsonb_build_object('companyId',c.id,'canManage',m.role in ('owner','admin'),
  'profileComplete',length(trim(coalesce(m.full_name,'')))>=3,
  'emailConfirmed',u.email_confirmed_at is not null,
  'companyComplete',coalesce(length(trim(c.name))>=2 and c.cnpj ~ '^[0-9]{14}$' and c.phone ~ '^[0-9]{10,11}$',false),
  'brandingPublished',coalesce(b.published_version,0)>0,
  'teamAdded',(select count(*)>1 from public.company_members where company_id=cid and status='active')) into result
 from public.companies c join public.company_members m on m.company_id=c.id and m.user_id=auth.uid() and m.status='active'
 join auth.users u on u.id=m.user_id left join public.company_branding b on b.company_id=c.id where c.id=cid;
 return result;
end; $$;
revoke all on function public.company_setup_status() from public,anon;
grant execute on function public.company_setup_status() to authenticated;
notify pgrst,'reload schema';

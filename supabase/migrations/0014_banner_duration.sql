-- Additive duration; old application versions retain existing values when omitted.
alter table public.platform_banners add column duration_seconds integer not null default 8 check(duration_seconds between 5 and 120);

create or replace function public.communications_manage(operation text,record_id uuid default null,expected_version integer default 0,values_json jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb; mobile uuid; duration integer; previous_duration integer;
begin
 if operation='banner.save' then
  if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
  if values_json ? 'duration_seconds' then
   if jsonb_typeof(values_json->'duration_seconds')<>'number' or values_json->>'duration_seconds' !~ '^[0-9]{1,3}$' then raise exception 'invalid duration' using errcode='22023';end if;
   duration:=(values_json->>'duration_seconds')::integer;
   if duration not between 5 and 120 then raise exception 'duration must be between 5 and 120 seconds' using errcode='22023';end if;
  end if;
  if values_json ? 'mobile_image_id' then
   mobile:=nullif(values_json->>'mobile_image_id','')::uuid;
   if mobile is not null and not exists(select 1 from public.platform_banner_assets where id=mobile) then raise exception 'image unavailable';end if;
  end if;
 end if;
 result:=app_private.communications_manage(operation,record_id,expected_version,values_json);
 if operation='banner.save' and values_json ? 'mobile_image_id' then
  update public.platform_banners set mobile_image_id=mobile where id=(result->>'id')::uuid;
 end if;
 if operation='banner.save' and duration is not null then
  select duration_seconds into previous_duration from public.platform_banners where id=(result->>'id')::uuid;
  update public.platform_banners set duration_seconds=duration where id=(result->>'id')::uuid;
  if duration<>previous_duration then
   insert into public.platform_audit_events(actor_user_id,target_id,action,reason,details)
    values(auth.uid(),(result->>'id')::uuid,'platform.banner.duration','Tempo de exibição do banner alterado',jsonb_build_object('before',previous_duration,'after',duration));
  end if;
 end if;
 return result;
end; $$;
revoke all on function public.communications_manage(text,uuid,integer,jsonb) from public,anon;
grant execute on function public.communications_manage(text,uuid,integer,jsonb) to authenticated;

revoke all on function app_private.communications_read(text,integer) from public,anon,authenticated;
create or replace function public.communications_read(section text default 'inbox',page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb; field_name text; items jsonb;
begin
 result:=app_private.communications_read(section,page_number);
 if section in ('banners','manage') then
  field_name:=case when section='manage' then 'banners' else 'items' end;
  select coalesce(jsonb_agg(e.value||jsonb_build_object('mobile_image_id',b.mobile_image_id,'duration_seconds',b.duration_seconds) order by e.ordinality),'[]'::jsonb) into items from jsonb_array_elements(result->field_name) with ordinality e(value,ordinality) join public.platform_banners b on b.id=(e.value->>'id')::uuid;
  result:=jsonb_set(result,array[field_name],items);
 end if;
 return result;
end; $$;
revoke all on function public.communications_read(text,integer) from public,anon;
grant execute on function public.communications_read(text,integer) to authenticated;

notify pgrst,'reload schema';

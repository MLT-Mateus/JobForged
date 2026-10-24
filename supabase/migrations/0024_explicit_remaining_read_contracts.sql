-- migration-role: supabase_admin
create function app_private.project_fields(value jsonb,fields text[]) returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select case when value is null then null else coalesce(jsonb_object_agg(key,val),'{}'::jsonb) end
 from jsonb_each(value) entry(key,val) where key=any(fields);
$$;
revoke all on function app_private.project_fields(jsonb,text[]) from public,anon,authenticated,service_role;
alter function app_private.project_fields(jsonb,text[]) owner to postgres;

drop function public.update_my_member_profile(text);
create function public.update_my_member_profile(new_full_name text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare member public.company_members;
begin
 perform app_private.security_gate();
 member:=app_private.security_legacy_update_my_member_profile(new_full_name);
 return jsonb_build_object('id',member.id,'user_id',member.user_id,'company_id',member.company_id,
  'email',member.email,'full_name',member.full_name,'role',member.role,'status',member.status,'created_at',member.created_at);
end;$$;
revoke all on function public.update_my_member_profile(text) from public,anon;
grant execute on function public.update_my_member_profile(text) to authenticated;
alter function public.update_my_member_profile(text) owner to postgres;

create or replace function public.read_company_brand_asset(asset_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform app_private.security_gate();
 return app_private.project_fields(app_private.security_legacy_read_company_brand_asset(asset_id),array['path','size','sha256']);
end;$$;

create or replace function public.communications_read(section text default 'inbox',page_number integer default 1) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;items jsonb;
begin
 perform app_private.security_gate(section='manage');
 result:=app_private.security_legacy_communications_read(section,page_number);
 if section='manage' then
  select coalesce(jsonb_agg(app_private.project_fields(item,array['id','title','description','image_id','mobile_image_id','link','active','position','version','duration_seconds','created_by','updated_at'])),'[]')
  into items from jsonb_array_elements(result->'banners') item;
  result:=jsonb_set(result,'{banners}',items);
  select coalesce(jsonb_agg(app_private.project_fields(item,array['id','title','message','link','audience','company_id','channel','state','version','created_by','created_at','dispatched_at','eligible','recipients','pending','sent','attention'])),'[]')
  into items from jsonb_array_elements(result->'campaigns') item;
  result:=jsonb_set(result,'{campaigns}',items);
 end if;
 return result;
end;$$;

-- These strings are exact migration-owned definitions, never client content.
do $$declare definition text;begin
 definition:=pg_get_functiondef('app_private.security_legacy_platform_read(text,text,text,integer,uuid)'::regprocedure);
 definition:=replace(definition,'to_jsonb(s)','app_private.project_fields(to_jsonb(s),array[''singleton'',''platform_name'',''support_email'',''support_url'',''updated_at''])');
 execute definition;
 definition:=pg_get_functiondef('app_private.security_legacy_platform_manage(text,uuid,uuid,jsonb,text)'::regprocedure);
 definition:=replace(definition,'to_jsonb(settings)','app_private.project_fields(to_jsonb(settings),array[''singleton'',''platform_name'',''support_email'',''support_url'',''updated_at''])');
 definition:=replace(definition,'to_jsonb(platform_settings.*)','app_private.project_fields(to_jsonb(platform_settings.*),array[''singleton'',''platform_name'',''support_email'',''support_url'',''updated_at''])');
 execute definition;
 definition:=pg_get_functiondef('app_private.security_legacy_read_company_branding()'::regprocedure);
 definition:=replace(definition,'''publishedBy'',u.email','''publishedBy'',case when editable then u.email end');
 execute definition;
end;$$;
alter function public.read_company_brand_asset(uuid) owner to postgres;
alter function public.communications_read(text,integer) owner to postgres;

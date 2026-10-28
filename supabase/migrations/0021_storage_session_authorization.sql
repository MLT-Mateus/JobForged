-- migration-role: supabase_admin
-- Immutable objects; ordinary sessions can access only their authorized context.
create function app_private.storage_image_access(object_name text,writing boolean) returns boolean
language plpgsql stable security definer set search_path=pg_catalog as $$
declare cid uuid; asset uuid;
begin
 if not app_private.identity_session_valid() then return false;end if;
 if object_name !~ '^(platform|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$' then return false;end if;
 asset:=replace(split_part(object_name,'/',2),'.png','')::uuid;
 if split_part(object_name,'/',1)='platform' then
  if public.is_platform_admin() then perform app_private.require_admin_factor();return true;end if;
  return not writing and app_private.communications_access() and exists(
   select 1 from public.platform_banner_assets a join public.platform_banners b on b.image_id=a.id or b.mobile_image_id=a.id
   where a.id=asset and a.path=object_name and b.active);
 end if;
 cid:=split_part(object_name,'/',1)::uuid;
 if writing then
  return app_private.company_role(cid) in ('owner','admin') and exists(
   select 1 from app_private.company_upload_reservations r where r.asset_id=asset and r.company_id=cid
   and r.user_id=auth.uid() and r.session_id=app_private.current_session_id() and r.expires_at>now());
 end if;
 return app_private.company_role(cid) in ('owner','admin') or (
  app_private.company_role(cid)<>'' and exists(select 1 from public.company_branding_assets a
   join public.company_branding b on b.company_id=a.company_id
   where a.id=asset and a.company_id=cid and a.path=object_name
   and position('/api/company/branding/assets/'||asset::text in b.published::text)>0));
end;$$;
alter function app_private.storage_image_access(text,boolean) owner to postgres;
revoke all on function app_private.storage_image_access(text,boolean) from public,anon,service_role;
grant execute on function app_private.storage_image_access(text,boolean) to authenticated;
drop policy "Branding server reads private images" on storage.objects;
drop policy "Branding server inserts immutable images" on storage.objects;
create policy "Session reads authorized immutable images" on storage.objects for select to authenticated
 using(bucket_id='company-branding' and app_private.storage_image_access(name,false));
create policy "Session inserts reserved immutable images" on storage.objects for insert to authenticated
 with check(bucket_id='company-branding' and app_private.storage_image_access(name,true));
-- No UPDATE or DELETE policy: replacing an image must create a new object.

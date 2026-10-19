-- A member can read images from the published identity, never draft-only assets.
create or replace function public.read_company_brand_asset(asset_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare cid uuid:=app_private.branding_company();result jsonb;
begin
 select to_jsonb(a) into result from public.company_branding_assets a where a.id=asset_id and a.company_id=cid
  and (app_private.company_role(cid) in ('owner','admin') or exists(
   select 1 from public.company_branding b where b.company_id=cid
   and position('/api/company/branding/assets/'||asset_id::text in b.published::text)>0));
 return result;
end;$$;
revoke all on function public.read_company_brand_asset(uuid) from public,anon;
grant execute on function public.read_company_brand_asset(uuid) to authenticated;

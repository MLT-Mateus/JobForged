-- migration-role: supabase_admin
-- Reuse the existing, validated portal.coverImage slot; no historical snapshots are rewritten.
alter function app_private.public_portal_document(uuid,text) rename to public_portal_document_before_panorama;
revoke all on function app_private.public_portal_document_before_panorama(uuid,text) from public,anon,authenticated,service_role;
create function app_private.public_portal_document(cid uuid,address text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare answer jsonb;image text;
begin
 answer:=app_private.public_portal_document_before_panorama(cid,address);
 if answer is null then return null;end if;
 select published#>>'{portal,coverImage}' into image from public.company_branding where company_id=cid;
 if answer#>>'{portal,layout}'='panorama' and coalesce(answer#>>'{portal,presentation,showImage}','true')='true' and coalesce(image,'')<>'' then
  answer:=jsonb_set(answer,'{portal,coverImage}',to_jsonb(replace(image,'/api/company/branding/assets/','/api/portals/'||address||'/assets/')));
 end if;
 return answer;
end;$$;
alter function app_private.public_portal_document(uuid,text) owner to postgres;
revoke all on function app_private.public_portal_document(uuid,text) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';

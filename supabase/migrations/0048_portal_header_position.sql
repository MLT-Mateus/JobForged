-- migration-role: supabase_admin
alter function app_private.validate_branding(uuid,jsonb) rename to validate_branding_before_header_position;
revoke all on function app_private.validate_branding_before_header_position(uuid,jsonb) from public,anon,authenticated,service_role;
create function app_private.validate_branding(cid uuid,c jsonb) returns void
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if (c->'portal')?'headerPosition' and coalesce(c#>>'{portal,headerPosition}','') not in ('static','floating') then
  raise exception 'invalid portal header position' using errcode='22023';
 end if;
 perform app_private.validate_branding_before_header_position(cid,c#-'{portal,headerPosition}');
end;$$;
alter function app_private.validate_branding(uuid,jsonb) owner to postgres;
revoke all on function app_private.validate_branding(uuid,jsonb) from public,anon,authenticated,service_role;

alter function app_private.public_portal_document(uuid,text) rename to public_portal_document_before_header_position;
revoke all on function app_private.public_portal_document_before_header_position(uuid,text) from public,anon,authenticated,service_role;
create function app_private.public_portal_document(cid uuid,address text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare answer jsonb; position text;
begin
 answer:=app_private.public_portal_document_before_header_position(cid,address);
 if answer is null then return null;end if;
 select published#>>'{portal,headerPosition}' into position from public.company_branding where company_id=cid;
 if position in ('static','floating') then
  answer:=jsonb_set(answer,'{portal,headerPosition}',to_jsonb(position));
 end if;
 return answer;
end;$$;
alter function app_private.public_portal_document(uuid,text) owner to postgres;
revoke all on function app_private.public_portal_document(uuid,text) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';

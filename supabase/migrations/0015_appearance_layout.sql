-- Optional, additive layout inside the company branding document; legacy snapshots remain valid.
alter function app_private.validate_branding(uuid,jsonb) rename to validate_branding_before_layout;
revoke all on function app_private.validate_branding_before_layout(uuid,jsonb) from public,anon,authenticated;
create function app_private.validate_branding(cid uuid,c jsonb)
returns void language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if (c->'portal') ? 'layout' then
  if jsonb_typeof(c#>'{portal,layout}') is distinct from 'string' or c#>>'{portal,layout}' not in ('classico','equipe','panorama','vagas','essencial') then
   raise exception 'invalid appearance layout' using errcode='22023';
  end if;
 end if;
 perform app_private.validate_branding_before_layout(cid,c#-'{portal,layout}');
end;$$;
revoke all on function app_private.validate_branding(uuid,jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';

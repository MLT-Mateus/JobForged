-- migration-role: supabase_admin
-- Additive, optional presentation contracts. Existing documents are left intact.
alter function app_private.validate_branding(uuid,jsonb) rename to validate_branding_before_chrome;
revoke all on function app_private.validate_branding_before_chrome(uuid,jsonb) from public,anon,authenticated,service_role;
create function app_private.validate_branding(cid uuid,c jsonb) returns void language plpgsql stable security definer set search_path=pg_catalog as $$
declare mode text;row jsonb;item jsonb;candidate text;a double precision;b double precision;
begin
 if c is null or octet_length(c::text)>131072 then raise exception 'branding too large' using errcode='22023';end if;
 if (c->'portal')?'chrome' then
  if not app_private.branding_shape(c#>'{portal,chrome}','{"light":{"headerBackground":"","headerText":"","footerBackground":"","footerText":""},"dark":{"headerBackground":"","headerText":"","footerBackground":"","footerText":""}}'::jsonb) then raise exception 'invalid chrome shape' using errcode='22023';end if;
  foreach mode in array array['light','dark'] loop
   row:=c#>array['portal','chrome',mode];
   for candidate in select value from jsonb_each_text(row) loop if candidate !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid chrome color' using errcode='22023';end if;end loop;
   foreach candidate in array array['header','footer'] loop
    a:=app_private.branding_luminance(row->>(candidate||'Background'));b:=app_private.branding_luminance(row->>(candidate||'Text'));
    if (greatest(a,b)+0.05)/(least(a,b)+0.05)<4.5 then raise exception 'insufficient chrome contrast' using errcode='22023';end if;
   end loop;
  end loop;
 end if;
 if (c->'portal')?'navigation' then
  if not app_private.branding_shape(c#>'{portal,navigation}','[{"label":"","href":""}]'::jsonb) or jsonb_array_length(c#>'{portal,navigation}')>5 then raise exception 'invalid navigation' using errcode='22023';end if;
  for item in select value from jsonb_array_elements(c#>'{portal,navigation}') loop
   candidate:=item->>'href';
   if length(trim(item->>'label')) not between 1 and 60 or length(candidate)>2048 or (candidate<>'' and candidate !~ '^(#(vagas|cultura|contato)|/[a-zA-Z0-9/_#?=.-]*|https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:]<>"\\]*)?)$') or candidate like '//%' then raise exception 'invalid navigation link' using errcode='22023';end if;
  end loop;
 end if;
 perform app_private.validate_branding_before_chrome(cid,(c#-'{portal,chrome}')#-'{portal,navigation}');
end;$$;
alter function app_private.validate_branding(uuid,jsonb) owner to postgres;
revoke all on function app_private.validate_branding(uuid,jsonb) from public,anon,authenticated,service_role;
-- Preserve the narrow public projection and add only validated page colors/navigation.
alter function app_private.public_portal_document(uuid,text) rename to public_portal_document_before_chrome;
revoke all on function app_private.public_portal_document_before_chrome(uuid,text) from public,anon,authenticated,service_role;
create function app_private.public_portal_document(cid uuid,address text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare answer jsonb;c jsonb;
begin
 answer:=app_private.public_portal_document_before_chrome(cid,address);if answer is null then return null;end if;
 select published into c from public.company_branding where company_id=cid;
 if (c->'portal')?'chrome' then answer:=jsonb_set(answer,'{portal,chrome}',c#>'{portal,chrome}');end if;
 if (c->'portal')?'navigation' and coalesce(c#>>'{structure,showHeader}','true')<>'false' then answer:=jsonb_set(answer,'{portal,navigation}',c#>'{portal,navigation}');end if;
 return answer;
end;$$;
alter function app_private.public_portal_document(uuid,text) owner to postgres;
revoke all on function app_private.public_portal_document(uuid,text) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';

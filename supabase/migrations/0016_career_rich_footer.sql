-- Additive document fields. Existing snapshots remain valid and untouched.
alter function app_private.validate_branding(uuid,jsonb) rename to validate_branding_before_rich_footer;
revoke all on function app_private.validate_branding_before_rich_footer(uuid,jsonb) from public,anon,authenticated;
create function app_private.validate_branding(cid uuid,c jsonb)
returns void language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare f jsonb;v jsonb;base jsonb;candidate text;key text;
begin
 if octet_length(c::text)>131072 then raise exception 'branding too large' using errcode='22023';end if;
 if (c->'portal')?'footer' then
  f:=c#>'{portal,footer}';
  if not app_private.branding_shape(f,'{"description":"","legal":"","eyebrow":"","title":"","email":"","phone":"","phoneUrl":"","links":[{"label":"","href":""}]}'::jsonb)
   or jsonb_array_length(f->'links')>6 or length(f->>'email')>254 or length(f->>'phone')>64
   or (f->>'email'<>'' and f->>'email' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'invalid footer' using errcode='22023';end if;
  for candidate in select f->>'phoneUrl' union all select x->>'href' from jsonb_array_elements(f->'links') x loop
   if candidate<>'' and candidate !~ '^(/[a-zA-Z0-9/_#?=.-]*|https://[a-zA-Z0-9][a-zA-Z0-9.-]*([/?#][^[:space:]<>"\\]*)?)$' or candidate like '//%' then raise exception 'invalid footer URL' using errcode='22023';end if;
  end loop;
 end if;
 if (c->'portal')?'content' then
  if jsonb_typeof(c#>'{portal,content}') is distinct from 'object' then raise exception 'invalid rich copy' using errcode='22023';end if;
  for key,v in select * from jsonb_each(c#>'{portal,content}') loop
   if key !~ '^(eyebrow|cultureLink|heroNote|photoTitle|photoSubtitle|photoChip|cultureEyebrow|cultureTitle|opportunitiesEyebrow|opportunitiesTitle|opportunitiesDescription|invitationTitle|invitationDescription|invitationButton|highlight[0-3](Title|Text)|value[0-2](Title|Text))$' or jsonb_typeof(v) is distinct from 'string' or length(v#>>'{}')>4000 then raise exception 'invalid rich copy field' using errcode='22023';end if;
  end loop;
 end if;
 -- Keep legacy field checks; title limit applies to visible characters, not formatting.
 base:=(c#-'{portal,footer}')#-'{portal,content}';
 if length(c#>>'{portal,headline}')>4000 then raise exception 'headline markup too large' using errcode='22023';end if;
 base:=jsonb_set(base,'{portal,headline}',to_jsonb(regexp_replace(c#>>'{portal,headline}','<[^>]*>','','g')));
 perform app_private.validate_branding_before_rich_footer(cid,base);
end;$$;
revoke all on function app_private.validate_branding(uuid,jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';

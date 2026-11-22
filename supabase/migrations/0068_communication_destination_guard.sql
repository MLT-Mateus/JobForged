-- migration-role: supabase_admin
-- Revalidate stored destinations at dispatch, including drafts saved before this release.
create function app_private.communication_audience_link(destination text,audience text)
returns boolean language sql immutable set search_path=pg_catalog as $$
 select coalesce(destination,'')='' or (
  app_private.communication_link(destination) and
  (audience='platform_admins' or destination !~* '^https://(www\.)?(test\.)?jobforged\.com(:443)?/+(backoffice|design-system)(/|[?#]|$)') and
  (audience not in ('candidates','public') or destination !~* '^https://(www\.)?(test\.)?jobforged\.com(:443)?/+app(/|[?#]|$)')
 );
$$;
alter function app_private.communication_audience_link(text,text) owner to postgres;
revoke all on function app_private.communication_audience_link(text,text) from public,anon,authenticated,service_role;

create or replace function public.communications_manage(operation text,record_id uuid default null,expected_version integer default 0,values_json jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare destination text; audience_name text;
begin
 perform app_private.security_gate(true);
 if not public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if operation='campaign.dispatch' then
  select c.link,c.audience into destination,audience_name from public.platform_communications c where c.id=record_id for update;
 elsif operation in ('banner.save','campaign.save') then
  destination:=values_json->>'link';audience_name:=case when operation='banner.save' then 'companies' else values_json->>'audience' end;
 end if;
 if operation in ('banner.save','campaign.save','campaign.dispatch') and not app_private.communication_audience_link(destination,audience_name) then
  raise exception 'destination unavailable for audience' using errcode='22023';
 end if;
 return app_private.security_legacy_communications_manage(operation,record_id,expected_version,values_json);
end;$$;
alter function public.communications_manage(text,uuid,integer,jsonb) owner to postgres;
revoke all on function public.communications_manage(text,uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.communications_manage(text,uuid,integer,jsonb) to authenticated;
notify pgrst,'reload schema';

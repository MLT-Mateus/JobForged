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
-- The audit and read-only Test inspection identified these exact demonstration
-- assets in the operational Home. Unpublish reversibly; preserve files/history.
-- A release is a system action, never attributed to the original uploader.
-- Application mutations still derive their actor from the authenticated session.
alter table public.platform_audit_events alter column actor_user_id drop not null;
with retired as (
 update public.platform_banners set active=false,version=version+1,updated_at=now()
 where active and (
  (title='Validação técnica de upload' and image_id='63b5389f-09b0-4cbc-8ec2-08dfe0769279') or
  (title='Teste' and image_id='999952d4-1e5f-4f94-896c-83434e944355')
 ) returning id,title
)
insert into public.platform_audit_events(target_id,action,reason,details)
select id,'platform.banner.save','Auditoria UX H01: retirar demonstração da Home operacional',jsonb_build_object('title',title,'active',false,'source','0068_communication_destination_guard') from retired;
notify pgrst,'reload schema';

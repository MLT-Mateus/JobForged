-- migration-role: supabase_admin
alter table public.company_domains
 add column address_kind text,
 add column dns_zone text,
 add column preferences_hostname text;

create function public.company_domain_with_preferences(
 operation text, requested_hostname text, expected_version bigint, requested_kind text, requested_zone text
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 result jsonb;
 saved_kind text;
 saved_zone text;
 cid uuid;
begin
 if operation='register' and (
  requested_kind is null or requested_zone is null or requested_hostname is null or
  length(requested_zone) not between 4 and 253 or
  requested_zone !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$' or
  not (
   (requested_kind='root' and requested_hostname=requested_zone) or
   (requested_kind='subdomain' and right(requested_hostname,length(requested_zone)+1)='.'||requested_zone)
  )
 ) then
  raise exception 'invalid domain preferences' using errcode='22023';
 end if;
 result:=public.company_domain(operation,requested_hostname,expected_version);
 cid:=app_private.branding_company();
 if operation='register' then
  update public.company_domains set address_kind=requested_kind,dns_zone=requested_zone,preferences_hostname=requested_hostname
  where company_id=cid;
 end if;
 select address_kind,dns_zone into saved_kind,saved_zone
 from public.company_domains where company_id=cid and preferences_hostname=hostname;
 if saved_kind is not null then
  result:=result||jsonb_build_object('kind',saved_kind,'zone',saved_zone);
 end if;
 return result;
end;$$;

revoke all on function public.company_domain_with_preferences(text,text,bigint,text,text) from public,anon,authenticated,service_role;
grant execute on function public.company_domain_with_preferences(text,text,bigint,text,text) to authenticated;
notify pgrst,'reload schema';

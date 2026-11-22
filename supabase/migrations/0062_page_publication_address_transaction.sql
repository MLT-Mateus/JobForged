-- migration-role: supabase_admin
-- DNS preparation is not publication. A replacement is promoted only after the
-- independent reconciler verifies DNS and TLS; the previous route stays active.
create table app_private.company_domain_requests(
 company_id uuid primary key references public.companies(id) on delete cascade,hostname text not null,
 address_kind text not null check(address_kind in ('root','subdomain')),dns_zone text not null,
 verification_token text not null default encode(extensions.gen_random_bytes(32),'hex'),
 version bigint not null default 1,current_version bigint not null default 0,
 status text not null default 'draft' check(status in ('draft','pending','verified')),
 requested_at timestamptz not null default now(),checked_at timestamptz,
 check(length(hostname) between 4 and 253 and hostname=lower(hostname) and hostname~'^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$'
 and hostname<>'jobforged.com' and hostname not like '%.jobforged.com' and hostname not like '%.localhost' and hostname not like '%.local')
);
create unique index domain_request_claim on app_private.company_domain_requests(hostname) where status<>'draft';
alter table app_private.company_domain_requests owner to postgres;
revoke all on app_private.company_domain_requests from public,anon,authenticated,service_role;

create function public.page_domain_v2(operation text default 'read',hostname text default null,kind text default null,zone text default null,current_version bigint default null,request_version bigint default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; current_domain public.company_domains; candidate app_private.company_domain_requests; result jsonb;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if operation not in ('read','prepare') or operation is null then raise exception 'invalid operation' using errcode='22023';end if;
 if operation='prepare' then
  if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'denied' using errcode='42501';end if;
  perform 1 from public.companies where id=cid for update;
  select * into current_domain from public.company_domains where company_id=cid for update;
  select * into candidate from app_private.company_domain_requests where company_id=cid for update;
  if current_version is distinct from coalesce(current_domain.version,0) or request_version is distinct from coalesce(candidate.version,0) then raise exception 'domain changed' using errcode='PT409';end if;
  if zone is null or hostname is null or kind is null or length(zone) not between 4 and 253 or zone !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$' or not ((kind='root' and hostname=zone) or (kind='subdomain' and right(hostname,length(zone)+1)='.'||zone)) then raise exception 'invalid address' using errcode='22023';end if;
  if current_domain.status='active' and current_domain.hostname=hostname then raise exception 'already active' using errcode='22023';end if;
  perform app_private.consume_operation_budget('domain-prepare',cid,20,3600);
  insert into app_private.company_domain_requests(company_id,hostname,address_kind,dns_zone,current_version) values(cid,hostname,kind,zone,current_version)
  on conflict(company_id) do update set hostname=excluded.hostname,address_kind=excluded.address_kind,dns_zone=excluded.dns_zone,current_version=excluded.current_version,verification_token=excluded.verification_token,version=company_domain_requests.version+1,status='draft',requested_at=now(),checked_at=null;
 end if;
 result:=public.company_domain_with_preferences('read',null,null,null,null);
 select * into candidate from app_private.company_domain_requests where company_id=cid;
 if candidate.company_id is not null and app_private.company_role(cid) in ('owner','admin') then result:=result||jsonb_build_object('request',jsonb_build_object('hostname',candidate.hostname,'kind',candidate.address_kind,'zone',candidate.dns_zone,'version',candidate.version,'status',candidate.status,'proof','jobforged-verification='||candidate.verification_token,'checkedAt',candidate.checked_at));end if;
 return result;
end;$$;

create function public.publish_company_page_v2(expected_version bigint,branding_version bigint,configuration jsonb,requested_slug text default null,domain_action text default 'keep',domain_version bigint default null,request_version bigint default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; portal public.company_portals; current_domain public.company_domains; candidate app_private.company_domain_requests; next_config jsonb; result jsonb; desired_domain text;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'denied' using errcode='42501';end if;
 perform 1 from public.companies where id=cid for update;
 select * into portal from public.company_portals where company_id=cid for update;
 if requested_slug is not null and not app_private.valid_portal_slug(requested_slug) then raise exception 'invalid address' using errcode='22023';end if;
 if domain_action not in ('keep','set','disconnect') or domain_action is null then raise exception 'invalid domain action' using errcode='22023';end if;
 select * into current_domain from public.company_domains where company_id=cid for update;
 select * into candidate from app_private.company_domain_requests where company_id=cid for update;
 desired_domain:=coalesce(current_domain.hostname,'');
 if current_domain.status='disabled' then desired_domain:='';end if;
 if candidate.status in ('pending','verified') then desired_domain:=candidate.hostname;end if;
 if domain_action<>'keep' then
  if domain_version is distinct from coalesce(current_domain.version,0) then raise exception 'domain changed' using errcode='PT409';end if;
  if domain_action='set' then
   if candidate.company_id is null or candidate.version is distinct from request_version or candidate.current_version is distinct from coalesce(current_domain.version,0) then raise exception 'preparation changed' using errcode='PT409';end if;
   perform pg_advisory_xact_lock(hashtextextended(candidate.hostname,62));
   if exists(select 1 from public.company_domains d where d.hostname=candidate.hostname and d.company_id<>cid and d.status<>'disabled') then raise exception 'domain claimed' using errcode='23505';end if;
   desired_domain:=candidate.hostname;
   update app_private.company_domain_requests set status='pending',requested_at=now(),checked_at=null where company_id=cid;
  else
   desired_domain:='';delete from app_private.company_domain_requests where company_id=cid;
   if current_domain.company_id is not null then perform public.company_domain('disconnect',null,domain_version);end if;
  end if;
 end if;
 next_config:=jsonb_set(jsonb_set(configuration,'{portal,jobforgedDomain}',to_jsonb(coalesce(requested_slug,portal.slug))),'{portal,customDomain}',to_jsonb(desired_domain));
 -- Existing function checks versions and records the single branding revision.
 result:=public.write_company_portal('save',expected_version,null,branding_version,next_config);
 if requested_slug is not null and requested_slug<>portal.slug then update public.company_portals set slug=requested_slug where company_id=cid;end if;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details) values(cid,auth.uid(),'portal.version',cid,jsonb_build_object('version',result->'brandingVersion','previousSlug',portal.slug,'slug',coalesce(requested_slug,portal.slug),'domainAction',domain_action,'domain',desired_domain));
 return public.read_company_portal();
end;$$;

-- DNS-verified candidates can be routed for HTTPS readiness, without changing
-- the active company address returned to authenticated users.
create or replace function public.resolve_company_domain(requested_hostname text) returns text language sql stable security definer set search_path=pg_catalog as $$
 select p.slug from public.company_portals p join public.companies c on c.id=p.company_id where p.is_public and c.operational_status='active' and (
 exists(select 1 from public.company_domains d where d.company_id=p.company_id and d.hostname=requested_hostname and d.status in ('verified','active') and d.checked_at>now()-interval '20 minutes') or
 exists(select 1 from app_private.company_domain_requests d where d.company_id=p.company_id and d.hostname=requested_hostname and d.status='verified' and d.checked_at>now()-interval '20 minutes')) limit 1;
$$;
alter function public.page_domain_v2(text,text,text,text,bigint,bigint) owner to postgres;
alter function public.publish_company_page_v2(bigint,bigint,jsonb,text,text,bigint,bigint) owner to postgres;
revoke all on function public.page_domain_v2(text,text,text,text,bigint,bigint),public.publish_company_page_v2(bigint,bigint,jsonb,text,text,bigint,bigint) from public,anon,authenticated,service_role;
grant execute on function public.page_domain_v2(text,text,text,text,bigint,bigint),public.publish_company_page_v2(bigint,bigint,jsonb,text,text,bigint,bigint) to authenticated;
notify pgrst,'reload schema';

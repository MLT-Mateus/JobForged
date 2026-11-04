-- migration-role: supabase_admin
-- Domain ownership is established by the isolated DNS/TLS reconciler, never by browser flags.
create table public.company_domains(
 company_id uuid primary key references public.companies(id),hostname text not null,
 verification_token text not null default encode(extensions.gen_random_bytes(32),'hex'),
 status text not null default 'pending' check(status in ('pending','verified','active','disabled')),
 version bigint not null default 0,requested_at timestamptz not null default now(),verified_at timestamptz,checked_at timestamptz,
 check(length(hostname) between 4 and 253 and hostname=lower(hostname) and hostname~'^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$'
 and hostname<>'jobforged.com' and hostname not like '%.jobforged.com' and hostname not like '%.localhost' and hostname not like '%.local')
);
create unique index company_domain_active_claim on public.company_domains(hostname) where status<>'disabled';
alter table public.company_domains enable row level security;
revoke all on public.company_domains from public,anon,authenticated,service_role;
create function public.company_domain(operation text default 'read',requested_hostname text default null,expected_version bigint default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;row public.company_domains;v bigint;
begin
 if operation is null then raise exception 'invalid operation' using errcode='22023';end if;
 perform app_private.security_gate();cid:=app_private.branding_company();
 select * into row from public.company_domains where company_id=cid;
 if operation<>'read' then
  if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
  perform 1 from public.companies where id=cid for update;
  select * into row from public.company_domains where company_id=cid for update;
  if expected_version is null or expected_version<>coalesce(row.version,0) then raise exception 'domain conflict' using errcode='PT409';end if;
  perform app_private.consume_operation_budget('company-domain',cid,10,3600);
  if operation='register' then
   insert into public.company_domains(company_id,hostname,version) values(cid,requested_hostname,1)
   on conflict(company_id) do update set hostname=excluded.hostname,verification_token=excluded.verification_token,status='pending',version=company_domains.version+1,requested_at=now(),verified_at=null,checked_at=null;
  elsif operation='disconnect' then update public.company_domains set status='disabled',version=version+1 where company_id=cid;
  else raise exception 'invalid operation' using errcode='22023';end if;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details) values(cid,auth.uid(),'domain.'||operation,cid,jsonb_build_object('hostname',requested_hostname));
  select * into row from public.company_domains where company_id=cid;
 end if;
 if row.company_id is null then return jsonb_build_object('version',0,'status','none');end if;
 return jsonb_build_object('hostname',row.hostname,'version',row.version,'status',row.status,'record','_jobforged.'||row.hostname,'proof','jobforged-verification='||row.verification_token,'checkedAt',row.checked_at);
end;$$;
create function public.resolve_company_domain(requested_hostname text) returns text language sql stable security definer set search_path=pg_catalog as $$
 select p.slug from public.company_domains d join public.company_portals p on p.company_id=d.company_id join public.companies c on c.id=d.company_id
 where d.hostname=requested_hostname and d.status in ('verified','active') and d.checked_at>now()-interval '20 minutes' and p.is_public and c.operational_status='active';
$$;
alter table public.company_domains owner to postgres;
alter function public.company_domain(text,text,bigint) owner to postgres;
alter function public.resolve_company_domain(text) owner to postgres;
revoke all on function public.company_domain(text,text,bigint),public.resolve_company_domain(text) from public,anon,authenticated,service_role;
grant execute on function public.company_domain(text,text,bigint) to authenticated;
grant execute on function public.resolve_company_domain(text) to anon,authenticated;
notify pgrst,'reload schema';

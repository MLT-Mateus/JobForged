-- migration-role: supabase_admin
create table app_private.company_branches (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 document jsonb not null, version bigint not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table app_private.company_branches owner to postgres;
revoke all on app_private.company_branches from public,anon,authenticated,service_role;
create index company_branches_company on app_private.company_branches(company_id);
create function public.company_branches_v1(operation text,branch_id uuid default null,document jsonb default null,expected_version bigint default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; b app_private.company_branches; result jsonb; k text; photo jsonb;
begin
 perform app_private.security_gate();
 select m.company_id into cid from public.company_members m where m.user_id=auth.uid() and app_private.is_company_member(m.company_id) limit 1;
 if cid is null or public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if operation='list' then
  select coalesce(jsonb_agg(x.document||jsonb_build_object('id',x.id,'version',x.version) order by x.updated_at desc),'[]') into result from app_private.company_branches x where x.company_id=cid;return result;
 end if;
 if operation not in ('save','delete') or operation is null or app_private.company_role(cid) not in ('owner','admin') then raise exception 'denied' using errcode='42501';end if;
 perform app_private.consume_operation_budget('company-branches',cid,120,3600);
 perform pg_advisory_xact_lock(hashtextextended(cid::text,52));
 if branch_id is not null then
  select * into b from app_private.company_branches x where x.id=branch_id and x.company_id=cid for update;
  if b.id is null then raise exception 'not found' using errcode='P0002';end if;
  if expected_version is distinct from b.version then raise exception 'conflict' using errcode='40001';end if;
 end if;
 if operation='delete' then
  if b.id is null then raise exception 'not found' using errcode='P0002';end if;
  if exists(select 1 from app_private.company_jobs j where j.company_id=cid and j.deleted_at is null and b.document->'jobIds' ? j.id::text) then raise exception 'linked jobs' using errcode='PT422';end if;
  delete from app_private.company_branches where id=b.id;
 else
  if document is null or jsonb_typeof(document)<>'object' or octet_length(document::text)>32000 then raise exception 'invalid document' using errcode='22023';end if;
  if exists(select 1 from jsonb_object_keys(document) t(k) where not(t.k=any(array['name','type','cnpj','corporateName','description','region','postalCode','street','number','complement','district','city','state','status','mapsUrl','photos','jobIds']))) then raise exception 'unknown field' using errcode='22023';end if;
  foreach k in array array['name','type','cnpj','corporateName','description','region','postalCode','street','number','complement','district','city','state','status','mapsUrl'] loop
   if jsonb_typeof(document->k) is distinct from 'string' or length(document->>k)>2000 then raise exception 'invalid field' using errcode='22023';end if;
  end loop;
  foreach k in array array['name','type','street','number','district','city'] loop
   if length(trim(document->>k)) not between 1 and 200 then raise exception 'required field' using errcode='22023';end if;
  end loop;
  if document->>'status' not in ('Ativo','Inativo') or document->>'postalCode' !~ '^[0-9]{8}$' or document->>'state' !~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$' then raise exception 'invalid address' using errcode='22023';end if;
  if document->>'mapsUrl'<>'' and document->>'mapsUrl' !~ '^https://' then raise exception 'invalid map' using errcode='22023';end if;
  if jsonb_typeof(document->'jobIds') is distinct from 'array' then raise exception 'invalid jobs' using errcode='22023';end if;
  if jsonb_array_length(document->'jobIds')>500 then raise exception 'job limit' using errcode='22023';end if;
  for photo in select value from jsonb_array_elements(document->'jobIds') loop
   if jsonb_typeof(photo)<>'string' or not exists(select 1 from app_private.company_jobs j where j.id::text=photo#>>'{}' and j.company_id=cid and j.deleted_at is null) then raise exception 'invalid job' using errcode='42501';end if;
   if exists(select 1 from app_private.company_branches x where x.company_id=cid and x.id is distinct from b.id and x.document->'jobIds' @> jsonb_build_array(photo)) then raise exception 'job already assigned' using errcode='PT409';end if;
  end loop;
  if jsonb_typeof(document->'photos') is distinct from 'array' then raise exception 'invalid photos' using errcode='22023';end if;
  if jsonb_array_length(document->'photos')>10 then raise exception 'photo limit' using errcode='22023';end if;
  for photo in select value from jsonb_array_elements(document->'photos') loop
   if not app_private.branding_shape(photo,'{"id":"","alt":""}'::jsonb) or length(photo->>'alt')>200 then raise exception 'invalid photo' using errcode='22023';end if;
   if not exists(select 1 from public.company_branding_assets a where a.id::text=photo->>'id' and a.company_id=cid) then raise exception 'invalid asset' using errcode='42501';end if;
  end loop;
  if b.id is null then
   if (select count(*) from app_private.company_branches where company_id=cid)>=500 then raise exception 'branch limit' using errcode='PT429';end if;
   insert into app_private.company_branches(company_id,document) values(cid,document) returning * into b;
  else
   update app_private.company_branches x set document=company_branches_v1.document,version=x.version+1,updated_at=now() where x.id=b.id returning * into b;
  end if;
 end if;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'branch.'||operation,b.id);
 return case when operation='delete' then 'null'::jsonb else b.document||jsonb_build_object('id',b.id,'version',b.version) end;
end;$$;
alter function public.company_branches_v1(text,uuid,jsonb,bigint) owner to postgres;
revoke all on function public.company_branches_v1(text,uuid,jsonb,bigint) from public,anon,authenticated,service_role;
grant execute on function public.company_branches_v1(text,uuid,jsonb,bigint) to authenticated;
notify pgrst,'reload schema';

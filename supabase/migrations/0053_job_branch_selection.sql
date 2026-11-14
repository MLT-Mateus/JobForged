-- migration-role: supabase_admin
create or replace function app_private.job_result(j app_private.company_jobs) returns jsonb language sql stable set search_path=pg_catalog as $$
 select j.document||jsonb_build_object('branchIds',coalesce((select jsonb_agg(b.id order by b.id) from app_private.company_branches b where b.company_id=j.company_id and b.document->'jobIds' ? j.id::text),'[]'::jsonb))||jsonb_build_object('id',j.id,'organizationId',j.company_id,'status',j.status,'version',j.version,'createdAt',j.created_at,'updatedAt',j.updated_at,'applicationsCount',0);
$$;
create or replace function public.company_jobs_v1(operation text,job_id uuid default null,document jsonb default null,requested_status text default null,expected_version bigint default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;j app_private.company_jobs; answer jsonb;k text; next_status text; selected jsonb; item jsonb;
begin
 perform app_private.security_gate();
 select m.company_id into cid from public.company_members m where m.user_id=auth.uid() and app_private.is_company_member(m.company_id) limit 1;
 if cid is null or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(cid::text,52));
 if operation='list' then
  select coalesce(jsonb_agg(app_private.job_result(x) order by x.updated_at desc),'[]') into answer from app_private.company_jobs x where x.company_id=cid and x.deleted_at is null;return answer;
 end if;
 if job_id is not null then
  select * into j from app_private.company_jobs x where x.id=job_id and x.company_id=cid and x.deleted_at is null for update;
  if j.id is null then raise exception 'not found' using errcode='P0002';end if;
 end if;
 if operation='get' then return case when j.id is null then null else app_private.job_result(j) end;end if;
 if operation is null or operation not in ('save','status','delete') or app_private.company_role(cid) not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 perform app_private.consume_operation_budget('company-jobs',cid,120,3600);
 if j.id is not null and expected_version is distinct from j.version then raise exception 'conflict' using errcode='40001';end if;
 if operation='delete' then
  if j.id is null then raise exception 'not found' using errcode='P0002';end if;
  update app_private.company_jobs set deleted_at=now(),status='Arquivada',version=version+1,updated_at=now() where id=j.id;
 else
  if operation='status' and j.id is null then raise exception 'not found' using errcode='P0002';end if;
  if operation='save' then
   selected:=coalesce(document->'branchIds',app_private.job_result(j)->'branchIds','[]'::jsonb);
   if jsonb_typeof(selected)<>'array' then raise exception 'invalid branches' using errcode='22023';end if;
   if jsonb_array_length(selected)>100 then raise exception 'branch limit' using errcode='22023';end if;
   for item in select value from jsonb_array_elements(selected) loop
    if jsonb_typeof(item)<>'string' or not exists(select 1 from app_private.company_branches b where b.company_id=cid and b.id::text=item#>>'{}' and (b.document->>'status'='Ativo' or b.document->'jobIds' ? j.id::text)) then raise exception 'invalid branch' using errcode='22023';end if;
   end loop;
   document:=document-'branchIds';
  end if;
  if operation='save' and not app_private.job_document_valid(document) then raise exception 'invalid fields' using errcode='22023';end if;
  if operation='status' then document:=j.document;end if;
  next_status:=coalesce(requested_status,j.status,'Rascunho');
  if next_status not in ('Rascunho','Publicada','Pausada','Encerrada','Arquivada') then raise exception 'invalid status' using errcode='22023';end if;
  if next_status='Publicada' then
   foreach k in array array['title','area','level','contractType','modality','country','state','city','summary'] loop
    if length(trim(document->>k))=0 then raise exception 'complete required fields' using errcode='22023';end if;
   end loop;
   if jsonb_array_length(document->'responsibilities')<3 or jsonb_array_length(document->'requirements')<3 or jsonb_array_length(document->'stages')<1 or document->>'lgpd'<>'true' then raise exception 'complete required fields' using errcode='22023';end if;
   if not exists(select 1 from public.company_portals p join public.company_branding b on b.company_id=p.company_id where p.company_id=cid and p.is_public and b.published<>'{}'::jsonb) then raise exception 'publish company portal first' using errcode='PT422';end if;
  end if;
  if j.id is null then
   perform pg_advisory_xact_lock(hashtextextended(cid::text,46));
   if (select count(*) from app_private.company_jobs x where x.company_id=cid and x.deleted_at is null)>=500 then raise exception 'job limit' using errcode='PT429';end if;
   insert into app_private.company_jobs(company_id,document,status) values(cid,document,next_status) returning * into j;
  else
   update app_private.company_jobs x set document=company_jobs_v1.document,status=next_status,version=x.version+1,updated_at=now() where x.id=j.id returning * into j;
  end if;
 end if;
 if operation in ('save','delete') then
  if operation='delete' then selected:='[]'::jsonb;end if;
  update app_private.company_branches b set document=jsonb_set(b.document,'{jobIds}',
   (b.document->'jobIds' - j.id::text) || case when selected ? b.id::text then jsonb_build_array(j.id::text) else '[]'::jsonb end),version=b.version+1,updated_at=now()
  where b.company_id=cid and ((b.document->'jobIds' ? j.id::text) is distinct from (selected ? b.id::text));
 end if;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'job.'||operation,j.id);
 return case when operation='delete' then 'null'::jsonb else app_private.job_result(j) end;
end;$$;

create or replace function public.company_branches_v1(operation text,branch_id uuid default null,document jsonb default null,expected_version bigint default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; b app_private.company_branches; result jsonb; k text; photo jsonb; previous_jobs jsonb;
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
 previous_jobs:=coalesce(b.document->'jobIds','[]'::jsonb);
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
 if operation='save' then
  update app_private.company_jobs j set version=j.version+1,updated_at=now() where j.company_id=cid and j.deleted_at is null and ((previous_jobs ? j.id::text) is distinct from (document->'jobIds' ? j.id::text));
 end if;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'branch.'||operation,b.id);
 return case when operation='delete' then 'null'::jsonb else b.document||jsonb_build_object('id',b.id,'version',b.version) end;
end;$$;

create or replace function public.public_jobs_v1(requested_slug text) returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(jsonb_agg(jsonb_build_object('branches',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.document->>'name','city',f.document->>'city','state',f.document->>'state','street',f.document->>'street','number',f.document->>'number','district',f.document->>'district','description',f.document->>'description') order by f.document->>'name') from app_private.company_branches f where f.company_id=j.company_id and f.document->>'status'='Ativo' and f.document->'jobIds' ? j.id::text),'[]'::jsonb),'id',j.id,'title',j.document->'title','area',j.document->'area','level',j.document->'level','contractType',j.document->'contractType','modality',j.document->'modality','city',j.document->'city','state',j.document->'state','summary',j.document->'summary','responsibilities',j.document->'responsibilities','requirements',j.document->'requirements','benefits',j.document->'benefits','teamDescription',j.document->'teamDescription','salaryMin',case when j.document->>'salaryConfidential'='true' then '' else j.document->>'salaryMin' end,'salaryMax',case when j.document->>'salaryConfidential'='true' then '' else j.document->>'salaryMax' end,'currency',j.document->'currency') order by j.updated_at desc),'[]')
 from app_private.company_jobs j join public.company_portals p on p.company_id=j.company_id join public.companies c on c.id=j.company_id join public.company_branding b on b.company_id=j.company_id
 where p.slug=requested_slug and p.is_public and c.operational_status='active' and b.published<>'{}'::jsonb and j.status='Publicada' and j.deleted_at is null;
$$;

notify pgrst,'reload schema';

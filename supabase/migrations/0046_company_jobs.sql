-- migration-role: supabase_admin
create table app_private.company_jobs(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 document jsonb not null, status text not null check(status in ('Rascunho','Publicada','Pausada','Encerrada','Arquivada')),
 version bigint not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index company_jobs_company on app_private.company_jobs(company_id,updated_at desc);
alter table app_private.company_jobs owner to postgres;
revoke all on app_private.company_jobs from public,anon,authenticated,service_role;
create function app_private.job_document_valid(d jsonb) returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare k text; item jsonb;
begin
 if d is null or jsonb_typeof(d)<>'object' or octet_length(d::text)>65536 then return false;end if;
 if exists(select 1 from jsonb_object_keys(d) t(k) where not (t.k=any(array['title','area','level','contractType','modality','country','state','city','summary','experience','weeklyHours','schedule','salaryMin','salaryMax','currency','education','additionalBenefits','careerPlan','teamDescription','reportsTo','teamSize','methodology','challenges','openingReason','autonomy','hierarchy','applicationDeadline','responseSla','responsibleId','responsibilities','requirements','softSkills','differentiators','certifications','benefits','tools','interviewTypes','languages','stages','salaryConfidential','performanceReviews','promotionPossible','technicalTest','lgpd','currentStep'])) ) then return false;end if;
 foreach k in array array['title','area','level','contractType','modality','country','state','city','summary','experience','weeklyHours','schedule','salaryMin','salaryMax','currency','education','additionalBenefits','careerPlan','teamDescription','reportsTo','teamSize','methodology','challenges','openingReason','autonomy','hierarchy','applicationDeadline','responseSla','responsibleId'] loop
  if jsonb_typeof(d->k) is distinct from 'string' or length(d->>k)>6000 then return false;end if;
 end loop;
 if length(d->>'title')>180 then return false;end if;
 foreach k in array array['responsibilities','requirements','softSkills','differentiators','certifications','benefits','tools','interviewTypes'] loop
  if jsonb_typeof(d->k) is distinct from 'array' then return false;end if;
  if jsonb_array_length(d->k)>50 then return false;end if;
  for item in select value from jsonb_array_elements(d->k) loop
   if jsonb_typeof(item)<>'string' or length(item#>>'{}') not between 1 and 2000 then return false;end if;
  end loop;
 end loop;
 foreach k in array array['salaryConfidential','performanceReviews','promotionPossible','technicalTest','lgpd'] loop
  if jsonb_typeof(d->k) is distinct from 'boolean' then return false;end if;
 end loop;
 if coalesce(d->>'currentStep','') !~ '^[0-5]$' then return false;end if;
 foreach k in array array['languages','stages'] loop
  if jsonb_typeof(d->k) is distinct from 'array' then return false;end if;
  if jsonb_array_length(d->k)>20 then return false;end if;
  for item in select value from jsonb_array_elements(d->k) loop
   if jsonb_typeof(item)<>'object' then return false;end if;
   if k='languages' then
    if not app_private.branding_shape(item,'{"language":"","level":""}'::jsonb) or length(item->>'language')>120 or length(item->>'level')>120 then return false;end if;
   else
    if not app_private.branding_shape(item,'{"id":"","name":"","required":true}'::jsonb) or length(item->>'id') not between 1 and 100 or length(trim(item->>'name')) not between 1 and 120 then return false;end if;
   end if;
  end loop;
 end loop;
 return true;
end;$$;
create function app_private.job_result(j app_private.company_jobs) returns jsonb language sql immutable set search_path=pg_catalog as $$
 select j.document||jsonb_build_object('id',j.id,'organizationId',j.company_id,'status',j.status,'version',j.version,'createdAt',j.created_at,'updatedAt',j.updated_at,'applicationsCount',0);
$$;
create function public.company_jobs_v1(operation text,job_id uuid default null,document jsonb default null,requested_status text default null,expected_version bigint default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;j app_private.company_jobs; answer jsonb;k text; next_status text;
begin
 perform app_private.security_gate();
 select m.company_id into cid from public.company_members m where m.user_id=auth.uid() and app_private.is_company_member(m.company_id) limit 1;
 if cid is null or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
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
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'job.'||operation,j.id);
 return case when operation='delete' then 'null'::jsonb else app_private.job_result(j) end;
end;$$;
create function public.public_jobs_v1(requested_slug text) returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'title',j.document->'title','area',j.document->'area','level',j.document->'level','contractType',j.document->'contractType','modality',j.document->'modality','city',j.document->'city','state',j.document->'state','summary',j.document->'summary','responsibilities',j.document->'responsibilities','requirements',j.document->'requirements','benefits',j.document->'benefits','teamDescription',j.document->'teamDescription','salaryMin',case when j.document->>'salaryConfidential'='true' then '' else j.document->>'salaryMin' end,'salaryMax',case when j.document->>'salaryConfidential'='true' then '' else j.document->>'salaryMax' end,'currency',j.document->'currency') order by j.updated_at desc),'[]')
 from app_private.company_jobs j join public.company_portals p on p.company_id=j.company_id join public.companies c on c.id=j.company_id join public.company_branding b on b.company_id=j.company_id
 where p.slug=requested_slug and p.is_public and c.operational_status='active' and b.published<>'{}'::jsonb and j.status='Publicada' and j.deleted_at is null;
$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('job_document_valid','job_result','company_jobs_v1','public_jobs_v1') and n.nspname in ('public','app_private') loop
 execute format('alter function %s owner to postgres',f.signature);execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end;$$;
grant execute on function public.company_jobs_v1(text,uuid,jsonb,text,bigint) to authenticated;
grant execute on function public.public_jobs_v1(text) to anon,authenticated;
notify pgrst,'reload schema';

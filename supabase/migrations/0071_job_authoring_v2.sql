-- migration-role: supabase_admin
-- Additive: legacy readers and RPCs remain available for application rollback.
alter table app_private.company_jobs add column published_document jsonb;
alter table app_private.company_jobs add column published_version bigint;
alter table app_private.company_jobs add column legacy_process jsonb;
update app_private.company_jobs set legacy_process=document->'stages';
alter table app_private.company_jobs add column color_token integer not null default 0 check(color_token between 0 and 11);
update app_private.company_jobs set published_document=document||jsonb_build_object('branchIds',coalesce((select jsonb_agg(b.id order by b.id) from app_private.company_branches b where b.company_id=company_jobs.company_id and b.document->'jobIds' ? company_jobs.id::text),'[]')),published_version=version where status in ('Publicada','Pausada','Encerrada');
with ranked as(select id,(row_number() over(partition by company_id order by created_at,id)-1)%12 token from app_private.company_jobs)
update app_private.company_jobs j set color_token=r.token from ranked r where r.id=j.id;

alter function app_private.job_document_valid(jsonb) rename to job_document_valid_legacy;
create function app_private.job_document_valid(d jsonb) returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare k text;
begin
 if not app_private.job_document_valid_legacy(d-array['schemaVersion','remoteScope','noPrerequisites','positions','example','resumeRequired']) then return false;end if;
 if d ? 'schemaVersion' and d->>'schemaVersion'<>'2' then return false;end if;
 if d ? 'remoteScope' and (jsonb_typeof(d->'remoteScope')<>'string' or length(d->>'remoteScope')>500) then return false;end if;
 foreach k in array array['noPrerequisites','example','resumeRequired'] loop if d ? k and jsonb_typeof(d->k)<>'boolean' then return false;end if;end loop;
 if d ? 'positions' and (jsonb_typeof(d->'positions')<>'number' or coalesce(d->>'positions','') !~ '^[1-9][0-9]{0,4}$') then return false;end if;
 return true;
end;$$;
alter function app_private.job_document_valid(jsonb) owner to postgres;
revoke all on function app_private.job_document_valid(jsonb) from public,anon,authenticated,service_role;

create function app_private.job_plain(value text) returns text language sql immutable set search_path=pg_catalog as $$
 select trim(regexp_replace(regexp_replace(replace(coalesce(value,''),'&nbsp;',' '),'<[^>]*>','','g'),'\[/?(b|i|u|color|size)(=[^]]*)?\]','','gi'));
$$;
create function app_private.job_issues(d jsonb,cid uuid,selected jsonb) returns jsonb language plpgsql stable set search_path=pg_catalog as $$
declare issues jsonb:='[]';k text;keys text[]:=array['title','area','contractType','modality','journey','description','attributions','requirements','positions','branchIds'];labels text[]:=array['Cargo','Área','Contratação','Modalidade','Jornada','Apresentação','Atividades','Requisitos','Quantidade','Local de trabalho'];i integer;ok boolean;remote boolean:=d->>'modality' in ('Remoto','Home Office');v text;
begin
 for i in 1..10 loop
  k:=keys[i];ok:=length(trim(coalesce(d->>k,'')))>0;
  if k='title' then ok:=ok and length(trim(d->>k))<=120;
  elsif k='modality' then ok:=d->>'modality' in ('Presencial','Híbrido','Remoto','Home Office');
  elsif k='journey' then ok:=ok and (d->>'journey' not in ('Horário definido','Escala') or length(trim(coalesce(d->>'schedule','')))>0);
  elsif k='description' then ok:=length(app_private.job_plain(coalesce(nullif(d->>'description',''),d->>'summary')))>0;
  elsif k='attributions' then ok:=length(app_private.job_plain(coalesce(nullif(d->>'attributions',''),array_to_string(array(select jsonb_array_elements_text(d->'responsibilities')),E'\n'))))>0;
  elsif k='requirements' then ok:=coalesce(d->>'noPrerequisites','false')='true' or exists(select 1 from jsonb_array_elements_text(d->'requirements') x where length(trim(x))>0);
  elsif k='positions' then ok:=coalesce(d->>'positions','1') ~ '^[1-9][0-9]{0,4}$';
  elsif k='branchIds' then
   if remote then k:='remoteScope';ok:=length(trim(coalesce(d->>'remoteScope','')))>0;
   else ok:=jsonb_array_length(selected)>0 and length(trim(coalesce(d->>'city','')))>0 and length(trim(coalesce(d->>'state','')))>0 and not exists(select 1 from jsonb_array_elements_text(selected) x where not exists(select 1 from app_private.company_branches b where b.company_id=cid and b.id::text=x and b.document->>'status'='Ativo'));end if;
  end if;
  if not coalesce(ok,false) then issues:=issues||jsonb_build_array(jsonb_build_object('key',k,'section',case when i in(6,7,8) then 1 else 0 end,'message','Confira '||lower(labels[i])||'.'));end if;
 end loop;
 if d->>'lgpd' is distinct from 'true' then issues:=issues||'[{"key":"lgpd","section":2,"message":"Confirme a revisão e a privacidade dos candidatos."}]';end if;
 if coalesce(d->>'example','false')='true' then issues:=issues||'[{"key":"example","section":2,"message":"Converta o exemplo em uma vaga real após revisar os dados fictícios."}]';end if;
 if not exists(select 1 from public.company_portals p join public.company_branding b on b.company_id=p.company_id where p.company_id=cid and p.is_public and b.published<>'{}') then issues:=issues||'[{"key":"portal","section":2,"message":"Publique a página da empresa em Personalização."}]';end if;
 foreach k in array array['salaryMin','salaryMax'] loop
  if coalesce(d->>k,'')<>'' and d->>k !~ '^[0-9]+([.][0-9]{1,2})?$' then issues:=issues||jsonb_build_array(jsonb_build_object('key','salaryRange','section',0,'message','Corrija a remuneração ou remova o complemento.'));end if;
 end loop;
 if coalesce(d->>'salaryMin','') ~ '^[0-9]+([.][0-9]{1,2})?$' and coalesce(d->>'salaryMax','') ~ '^[0-9]+([.][0-9]{1,2})?$' and (d->>'salaryMin')::numeric>(d->>'salaryMax')::numeric then issues:=issues||'[{"key":"salaryRange","section":0,"message":"O valor máximo deve ser maior ou igual ao mínimo."}]';end if;
 if d->>'salaryRange'='Informar valores' and d->>'salaryConfidential'<>'true' and coalesce(d->>'salaryMin','')='' then issues:=issues||'[{"key":"salaryRange","section":0,"message":"Informe o valor ou escolha outra opção de remuneração."}]';end if;
 if coalesce(d->>'contactEmail','')<>'' and (length(d->>'contactEmail')>254 or d->>'contactEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then issues:=issues||'[{"key":"contactEmail","section":1,"message":"Corrija o e-mail de contato ou remova este complemento."}]';end if;
 foreach k in array array['contactPhone','contactWhatsapp'] loop
  if coalesce(d->>k,'')<>'' and length(regexp_replace(d->>k,'[^0-9]','','g')) not between 10 and 13 then issues:=issues||jsonb_build_array(jsonb_build_object('key',k,'section',1,'message','Corrija o telefone com DDD ou remova este complemento.'));end if;
 end loop;
 v:=coalesce(d->>'applicationDeadline','');
 if v<>'' then begin
  if v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char(v::date,'YYYY-MM-DD')<>v then raise exception 'invalid date';end if;
 exception when others then issues:=issues||'[{"key":"applicationDeadline","section":1,"message":"Informe uma data válida ou remova o prazo."}]';end;end if;
 return issues;
end;$$;

create function public.company_jobs_v2(operation text,job_id uuid default null,document jsonb default null,requested_status text default null,expected_version bigint default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid:=app_private.current_company_id();j app_private.company_jobs;selected jsonb;issues jsonb;next_status text;answer jsonb;opts jsonb;
begin
 perform app_private.require_company_permission(case when operation in('list','get','context') then 'jobs.view' when operation='delete' then 'jobs.delete' when operation in('save','validate') and job_id is null then 'jobs.create' else 'jobs.edit' end);
 if operation='context' then return jsonb_build_object('portalReady',exists(select 1 from public.company_portals p join public.company_branding b on b.company_id=p.company_id where p.company_id=cid and p.is_public and b.published<>'{}'));end if;
 if operation='list' then select coalesce(jsonb_agg(app_private.job_result_v2(x) order by x.updated_at desc),'[]') into answer from app_private.company_jobs x where x.company_id=cid and x.deleted_at is null;return answer;end if;
 if job_id is not null then select * into j from app_private.company_jobs where id=job_id and company_id=cid and deleted_at is null for update;if j.id is null then raise exception 'not found' using errcode='P0002';end if;end if;
 if operation='get' then return case when j.id is null then null else app_private.job_result_v2(j) end;end if;
 if operation='validate' and job_id is null then perform app_private.require_company_permission('jobs.create');end if;
 if operation not in('save','publish','status','validate','delete','color') then raise exception 'invalid operation' using errcode='22023';end if;
 if operation='color' then
  if j.id is null then raise exception 'not found' using errcode='P0002';end if;
  if expected_version is distinct from j.version then raise exception 'conflict' using errcode='40001';end if;
  if jsonb_typeof(document->'colorToken') is distinct from 'number' or document->>'colorToken' !~ '^([0-9]|1[01])$' then raise exception 'invalid color' using errcode='22023';end if;
  update app_private.company_jobs set color_token=(document->>'colorToken')::integer,version=version+1,updated_at=now() where id=j.id returning * into j;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'job.color',j.id);
  return app_private.job_result_v2(j);
 end if;
 if operation='delete' then return public.company_jobs_v1('delete',job_id,null,null,expected_version);end if;
 if operation in('publish','status') then if j.id is null then raise exception 'not found' using errcode='P0002';end if;document:=app_private.job_result_v2(j);end if;
 selected:=coalesce(document->'branchIds','[]');
 document:=document-array['branchIds','id','organizationId','createdAt','updatedAt','status','version','applicationsCount','colorToken','hasUnpublishedChanges','publishedVersion','portalReady'];
 if not app_private.job_document_valid(document||jsonb_build_object('contactEmail','','contactPhone','','contactWhatsapp','')) or jsonb_typeof(selected)<>'array' then raise exception 'invalid fields' using errcode='22023';end if;
 if jsonb_array_length(selected)>100 or exists(select 1 from jsonb_array_elements_text(selected) x where not exists(select 1 from app_private.company_branches b where b.company_id=cid and b.id::text=x)) then raise exception 'invalid branches' using errcode='22023';end if;
 issues:=app_private.job_issues(document,cid,selected);
 if operation='validate' then return jsonb_build_object('issues',issues,'canPublish',issues='[]');end if;
 if not app_private.job_document_valid(document) then raise exception 'invalid complement' using errcode='PT423',detail=issues::text;end if;
 perform app_private.consume_operation_budget('company-jobs',cid,120,3600);
 if j.id is not null and expected_version is distinct from j.version then raise exception 'conflict' using errcode='40001';end if;
 next_status:=case when operation='publish' then 'Publicada' when operation='status' then requested_status else coalesce(j.status,'Rascunho') end;
 if next_status not in('Publicada','Rascunho','Pausada','Encerrada','Arquivada') then raise exception 'invalid status' using errcode='22023';end if;
 if (operation='publish' or operation='status' and next_status='Publicada') and issues<>'[]' then raise exception 'publication needs attention' using errcode='PT423',detail=issues::text;end if;
 if j.id is null then
  perform pg_advisory_xact_lock(hashtextextended(cid::text,46));
  if(select count(*) from app_private.company_jobs where company_id=cid and deleted_at is null)>=500 then raise exception 'job limit' using errcode='PT429';end if;
  insert into app_private.company_jobs(company_id,document,status,color_token) values(cid,document,next_status,(select count(*)%12 from app_private.company_jobs where company_id=cid)) returning * into j;
 else
  update app_private.company_jobs x set document=company_jobs_v2.document,status=next_status,version=x.version+1,updated_at=now() where x.id=j.id returning * into j;
 end if;
 if operation='publish' or operation='status' and next_status='Publicada' then update app_private.company_jobs set published_document=company_jobs_v2.document||jsonb_build_object('branchIds',selected),published_version=j.version where id=j.id returning * into j;end if;
 update app_private.company_branches b set document=jsonb_set(b.document,'{jobIds}',((b.document->'jobIds')-j.id::text)||case when selected ? b.id::text then jsonb_build_array(j.id::text) else '[]'::jsonb end),version=b.version+1,updated_at=now() where b.company_id=cid and ((b.document->'jobIds' ? j.id::text) is distinct from (selected ? b.id::text));
 if operation='publish' or operation='status' and next_status='Publicada' or j.published_document is null then
 select o.document into opts from app_private.company_job_options o where o.job_id=j.id;
 insert into app_private.company_job_options(job_id,document) values(j.id,coalesce(opts,'{"acceptApplications":true,"resumeRequired":true,"positions":1,"notifyApplication":true,"notifyStage":true}')||jsonb_build_object('positions',coalesce((document->>'positions')::integer,1),'resumeRequired',coalesce((document->>'resumeRequired')::boolean,true))) on conflict(job_id) do update set document=excluded.document,version=company_job_options.version+1;
 end if;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'job.'||operation,j.id);
 answer:=app_private.job_result_v2(j);return answer;
end;$$;

-- Preserve the existing, curated public field allowlist and use the published revision.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.public_jobs_v1(text)'::regprocedure);
 definition:=replace(definition,'from app_private.company_jobs j join','from (select x.id,x.company_id,coalesce(x.published_document,x.document) as document,x.status,x.deleted_at,x.updated_at from app_private.company_jobs x) j join');
 definition:=replace(definition,$source$f.document->'jobIds' ? j.id::text$source$,$replacement$case when j.document ? 'branchIds' then j.document->'branchIds' ? f.id::text else f.document->'jobIds' ? j.id::text end$replacement$);
 definition:=replace(definition,$source$jsonb_build_object('tools',$source$,$replacement$jsonb_build_object('resumeRequired',coalesce((select o.document->'resumeRequired' from app_private.company_job_options o where o.job_id=j.id),'true'),'schemaVersion',j.document->'schemaVersion','remoteScope',j.document->'remoteScope','noPrerequisites',j.document->'noPrerequisites','positions',j.document->'positions','tools',$replacement$);
 execute definition;
end;$$;

create function app_private.job_result_v2(j app_private.company_jobs) returns jsonb language sql stable set search_path=pg_catalog as $$
 select j.document||jsonb_build_object('branchIds',coalesce((select jsonb_agg(b.id order by b.id) from app_private.company_branches b where b.company_id=j.company_id and b.document->'jobIds' ? j.id::text),'[]'),
 'id',j.id,'organizationId',j.company_id,'status',j.status,'version',j.version,'createdAt',j.created_at,'updatedAt',j.updated_at,'colorToken',j.color_token,'publishedVersion',j.published_version,
 'hasUnpublishedChanges',j.published_document is not null and j.published_document is distinct from (j.document||jsonb_build_object('branchIds',coalesce((select jsonb_agg(b.id order by b.id) from app_private.company_branches b where b.company_id=j.company_id and b.document->'jobIds' ? j.id::text),'[]'))),
 'applicationsCount',(select count(*) from app_private.job_applications a where a.job_id=j.id),
 'positions',coalesce(j.document->'positions',(select o.document->'positions' from app_private.company_job_options o where o.job_id=j.id),'1'),
 'resumeRequired',coalesce(j.document->'resumeRequired',(select o.document->'resumeRequired' from app_private.company_job_options o where o.job_id=j.id),'true'));
$$;
alter function public.company_jobs_v2(text,uuid,jsonb,text,bigint) owner to postgres;
revoke all on function public.company_jobs_v2(text,uuid,jsonb,text,bigint),app_private.job_plain(text),app_private.job_issues(jsonb,uuid,jsonb),app_private.job_result_v2(app_private.company_jobs) from public,anon,authenticated,service_role;
grant execute on function public.company_jobs_v2(text,uuid,jsonb,text,bigint) to authenticated;
notify pgrst,'reload schema';

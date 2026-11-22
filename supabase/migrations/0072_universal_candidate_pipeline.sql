-- migration-role: supabase_admin
-- Legacy stage values remain readable by the previous release.
alter table app_private.job_applications add column stage_key text not null default 'screening' check(stage_key in('screening','interview','approved','hired'));
alter table app_private.job_applications add column outcome text not null default 'active' check(outcome in('active','rejected','withdrawn'));
alter table app_private.job_applications add column pipeline_version text not null default 'universal-v1';
alter table app_private.job_applications add column legacy_stage text;
alter table app_private.job_applications add column review_needed boolean not null default false;
alter table app_private.job_applications add column stage_entered_at timestamptz;
update app_private.job_applications set stage_key=case stage when 'Entrevista' then 'interview' when 'Contratação' then 'hired' else 'screening' end,outcome=case stage when 'Reprovada' then 'rejected' when 'Desistência' then 'withdrawn' else 'active' end,legacy_stage=stage,review_needed=stage in('Pré-aprovação','Pré-reprovação');
create index job_applications_pipeline on app_private.job_applications(company_id,outcome,stage_key,created_at,id);
create index job_applications_job_pipeline on app_private.job_applications(company_id,job_id,outcome,stage_key,created_at,id);
create function app_private.sync_pipeline_legacy() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='INSERT' then new.stage_entered_at:=coalesce(new.stage_entered_at,new.created_at);end if;
 if tg_op='INSERT' or new.stage is distinct from old.stage and new.stage_key is not distinct from old.stage_key and new.outcome is not distinct from old.outcome then
  new.stage_key:=case new.stage when 'Entrevista' then 'interview' when 'Contratação' then 'hired' else 'screening' end;
  new.outcome:=case new.stage when 'Reprovada' then 'rejected' when 'Desistência' then 'withdrawn' else 'active' end;
  new.review_needed:=new.stage in('Pré-aprovação','Pré-reprovação');
 end if;
 if tg_op='UPDATE' and (new.stage_key is distinct from old.stage_key or new.outcome is distinct from old.outcome) then new.stage_entered_at:=now();end if;
 return new;
end;$$;
create trigger job_pipeline_compatibility before insert or update on app_private.job_applications for each row execute function app_private.sync_pipeline_legacy();
create function app_private.pipeline_label(key text,result text default 'active') returns text language sql immutable set search_path=pg_catalog as $$
 select case result when 'rejected' then 'Não selecionado' when 'withdrawn' then 'Desistência' else case key when 'interview' then 'Entrevista' when 'approved' then 'Aprovação' when 'hired' then 'Contratação' else 'Triagem' end end;
$$;
create function app_private.application_card(a app_private.job_applications) returns jsonb language sql stable set search_path=pg_catalog as $$
 select jsonb_build_object('id',a.id,'jobId',a.job_id,'jobTitle',j.document->>'title','name',c.full_name,'stage',app_private.pipeline_label(a.stage_key,a.outcome),'stageKey',a.stage_key,'outcome',a.outcome,'version',a.version,'createdAt',a.created_at,'updatedAt',a.updated_at,'stageEnteredAt',a.stage_entered_at,'reviewNeeded',a.review_needed,'legacyStage',a.legacy_stage,'hasResume',a.resume_id is not null,'colorToken',j.color_token,
 'nextInterview',(select jsonb_build_object('id',e.id,'startsAt',e.starts_at,'status',e.status) from app_private.company_interviews e where e.application_id=a.id and e.status in('A agendar','Agendada') order by e.starts_at nulls last limit 1))
 from public.candidate_accounts c join app_private.company_jobs j on j.id=a.job_id where c.user_id=a.candidate_id;
$$;
create function public.company_applications_v2(operation text default 'list',record_id uuid default null,document jsonb default '{}',expected_version bigint default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid:=app_private.current_company_id();a app_private.job_applications;target text;result text;why text;filter_job uuid;filter_stage text;filter_outcome text;q text;page_no integer;page_size integer;answer jsonb;items jsonb;total bigint;
begin
 perform app_private.require_company_permission('applications.view');
 if document is null or jsonb_typeof(document)<>'object' or octet_length(document::text)>20000 then raise exception 'invalid data' using errcode='22023';end if;
 if record_id is not null then select * into a from app_private.job_applications where id=record_id and company_id=cid for update;if a.id is null then raise exception 'not found' using errcode='P0002';end if;end if;
 if operation in('move','note') then
  if a.id is null then raise exception 'not found' using errcode='P0002';end if;
  if expected_version is distinct from a.version then raise exception 'conflict' using errcode='40001';end if;
  perform app_private.require_company_permission(case operation when 'note' then 'applications.notes' else 'applications.move' end);
  if operation='note' then
   if jsonb_typeof(document->'notes') is distinct from 'string' or length(document->>'notes')>10000 then raise exception 'invalid note' using errcode='22023';end if;
   update app_private.job_applications set notes=document->>'notes',version=version+1,updated_at=now() where id=a.id;
   insert into app_private.application_events(application_id,actor,action) values(a.id,auth.uid(),'Anotação atualizada');
  else
   target:=coalesce(document->>'stageKey',a.stage_key);result:=coalesce(document->>'outcome','active');why:=trim(coalesce(document->>'reason',''));
   if target not in('screening','interview','approved','hired') or result not in('active','rejected') or length(why)>2000 then raise exception 'invalid destination' using errcode='22023';end if;
   if a.outcome='withdrawn' then raise exception 'candidate withdrew' using errcode='PT422';end if;
   if target in('approved','hired') or result='rejected' or a.outcome<>'active' or a.stage_key in('approved','hired') then perform app_private.require_company_permission('applications.decide');end if;
   if (result='rejected' or a.outcome='rejected' or a.stage_key='hired' and target<>'hired' or a.stage_key='screening' and target in('approved','hired')) and length(why)<3 then raise exception 'reason required' using errcode='22023';end if;
   if target=a.stage_key and result=a.outcome then return app_private.application_card(a);end if;
   update app_private.job_applications set stage_key=target,outcome=result,stage=case result when 'rejected' then 'Reprovada' else case target when 'screening' then 'Triagem' when 'interview' then 'Entrevista' when 'approved' then 'Pré-aprovação' else 'Contratação' end end,reason=why,review_needed=false,version=version+1,updated_at=now() where id=a.id;
   insert into app_private.application_events(application_id,actor,action,details) values(a.id,auth.uid(),'Etapa alterada',jsonb_build_object('from',app_private.pipeline_label(a.stage_key,a.outcome),'to',app_private.pipeline_label(target,result),'reason',why,'pipeline','universal-v1'));
   if target='interview' and result='active' and not exists(select 1 from app_private.company_interviews where application_id=a.id and status in('A agendar','Agendada')) then insert into app_private.company_interviews(company_id,application_id,title) select cid,a.id,'Entrevista · '||full_name from public.candidate_accounts where user_id=a.candidate_id;end if;
   if result='rejected' or target='hired' then update app_private.company_interviews set status='Cancelada',version=version+1,updated_at=now() where application_id=a.id and status in('A agendar','Agendada') and (starts_at is null or starts_at>now());end if;
   if coalesce((select o.document->>'notifyStage' from app_private.company_job_options o where o.job_id=a.job_id),'true')='true' then
    insert into app_private.company_alerts(company_id,user_id,event_key,title,body,link) select cid,m.user_id,'stage:'||a.id||':'||(a.version+1),'Candidatura atualizada',app_private.pipeline_label(target,result),'/app/candidaturas?application='||a.id from public.company_members m where m.company_id=cid and m.status='active' and (m.role='owner' or exists(select 1 from app_private.company_interviews e where e.application_id=a.id and e.responsible_id=m.id)) on conflict do nothing;
   end if;
  end if;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'application.'||operation,a.id);
  select * into a from app_private.job_applications where id=a.id;return app_private.application_card(a);
 end if;
 if operation='detail' then
  if a.id is null then raise exception 'not found' using errcode='P0002';end if;
  return app_private.application_card(a)||jsonb_build_object('email',(select email from auth.users where id=a.candidate_id),'notes',a.notes,'reason',a.reason,'resume',case when app_private.company_can('applications.resume') then (select name from app_private.candidate_documents where id=a.resume_id) else null end);
 end if;
 page_no:=greatest(1,least(coalesce((document->>'page')::integer,1),100000));page_size:=greatest(1,least(coalesce((document->>'pageSize')::integer,20),100));
 if operation='history' then
  if a.id is null then raise exception 'not found' using errcode='P0002';end if;
  select count(*) into total from app_private.application_events e where e.application_id=a.id;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from(select e.id,e.action,e.details,e.created_at as "createdAt",coalesce(m.full_name,'Candidato') as actor from app_private.application_events e left join public.company_members m on m.user_id=e.actor and m.company_id=cid where e.application_id=a.id order by e.created_at desc,e.id limit page_size offset (page_no-1)*page_size)x;
  return jsonb_build_object('items',items,'total',total,'page',page_no);
 end if;
 if operation not in('list','board') then raise exception 'invalid operation' using errcode='22023';end if;
 filter_job:=nullif(document->>'jobId','')::uuid;filter_stage:=nullif(document->>'stageKey','');filter_outcome:=coalesce(nullif(document->>'outcome',''),'active');q:=left(trim(coalesce(document->>'query','')),200);
 if filter_stage is not null and filter_stage not in('screening','interview','approved','hired') or filter_outcome not in('active','closed','rejected','withdrawn') then raise exception 'invalid filter' using errcode='22023';end if;
 with filtered as(select x.* from app_private.job_applications x join public.candidate_accounts c on c.user_id=x.candidate_id join auth.users u on u.id=c.user_id join app_private.company_jobs j on j.id=x.job_id where x.company_id=cid and (filter_job is null or x.job_id=filter_job) and (filter_outcome='closed' and x.outcome<>'active' or x.outcome=filter_outcome) and (q='' or strpos(lower(c.full_name||' '||u.email||' '||coalesce(j.document->>'title','')),lower(q))>0))
 select jsonb_build_object('total',(select count(*) from filtered where filter_stage is null or stage_key=filter_stage),'counts',(select coalesce(jsonb_object_agg(stage_key,n),'{}') from(select stage_key,count(*) n from filtered group by stage_key)c),'items',(select coalesce(jsonb_agg(app_private.application_card(x::app_private.job_applications)),'[]') from(select * from filtered where filter_stage is null or stage_key=filter_stage order by coalesce(stage_entered_at,created_at),id limit page_size offset(page_no-1)*page_size)x)) into answer;
 return answer||jsonb_build_object('companyId',cid,'access',public.company_access_v1(),'page',page_no,'jobs',case when app_private.company_can('jobs.view') then (select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'title',j.document->>'title','colorToken',j.color_token) order by j.updated_at desc),'[]') from app_private.company_jobs j where j.company_id=cid and j.deleted_at is null) else '[]'::jsonb end);
end;$$;

-- Read only status labels for the candidate. Legacy operations stay transacted.
create function public.candidate_applications_v2(operation text default 'list',job_id uuid default null,accepted boolean default false) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
 result:=public.candidate_applications_v1(operation,job_id,accepted);
 return (select coalesce(jsonb_agg(item||jsonb_build_object('stage',app_private.pipeline_label(a.stage_key,a.outcome))),'[]') from jsonb_array_elements(result) item join app_private.job_applications a on a.id=(item->>'id')::uuid and a.candidate_id=auth.uid());
end;$$;
alter function public.company_applications_v2(text,uuid,jsonb,bigint) owner to postgres;
alter function public.candidate_applications_v2(text,uuid,boolean) owner to postgres;
revoke all on function public.company_applications_v2(text,uuid,jsonb,bigint),public.candidate_applications_v2(text,uuid,boolean),app_private.application_card(app_private.job_applications),app_private.pipeline_label(text,text),app_private.sync_pipeline_legacy() from public,anon,authenticated,service_role;
grant execute on function public.company_applications_v2(text,uuid,jsonb,bigint),public.candidate_applications_v2(text,uuid,boolean) to authenticated;
notify pgrst,'reload schema';

-- migration-role: supabase_admin
create table app_private.job_applications(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),job_id uuid not null references app_private.company_jobs(id),candidate_id uuid not null references public.candidate_accounts(user_id),resume_id uuid references app_private.candidate_documents(id),stage text not null default 'Candidatura' check(stage in ('Candidatura','Triagem','Pré-aprovação','Pré-reprovação','Entrevista','Contratação','Reprovada','Desistência')),notes text not null default '',reason text not null default '',version bigint not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(job_id,candidate_id));
create index applications_company on app_private.job_applications(company_id,created_at desc);
create table app_private.application_events(id uuid primary key default gen_random_uuid(),application_id uuid not null references app_private.job_applications(id),actor uuid references auth.users(id),action text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create table app_private.company_interviews(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),application_id uuid references app_private.job_applications(id),title text not null,starts_at timestamptz,ends_at timestamptz,responsible_id uuid references public.company_members(id),meeting_url text not null default 'https://meet.google.com/',notes text not null default '',status text not null default 'A agendar' check(status in ('A agendar','Agendada','Concluída','Cancelada')),version bigint not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at>starts_at));
create index interviews_company on app_private.company_interviews(company_id,starts_at);
create table app_private.company_alerts(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),user_id uuid not null references auth.users(id),event_key text not null,title text not null,body text not null,link text not null,read_at timestamptz,created_at timestamptz not null default now(),unique(user_id,event_key));
create table app_private.company_job_options(job_id uuid primary key references app_private.company_jobs(id),document jsonb not null default '{"acceptApplications":true,"resumeRequired":true,"positions":1,"notifyApplication":true,"notifyStage":true}',version bigint not null default 1);
create table app_private.company_recruitment_preferences(company_id uuid primary key references public.companies(id),document jsonb not null default '{"reminderDay":true,"reminderTenMinutes":true}',version bigint not null default 1);
do $$declare name text;begin foreach name in array array['job_applications','application_events','company_interviews','company_alerts','company_job_options','company_recruitment_preferences'] loop execute format('alter table app_private.%I owner to postgres',name);execute format('revoke all on app_private.%I from public,anon,authenticated,service_role',name);end loop;end;$$;
create function app_private.application_json(a app_private.job_applications) returns jsonb language sql stable security definer set search_path=pg_catalog as $$select jsonb_build_object('id',a.id,'jobId',a.job_id,'jobTitle',j.document->>'title','name',c.full_name,'email',u.email,'stage',a.stage,'notes',a.notes,'reason',a.reason,'version',a.version,'createdAt',a.created_at,'updatedAt',a.updated_at,'resume',d.name,'history',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'details',e.details,'createdAt',e.created_at,'actor',coalesce(m.full_name,'Candidato')) order by e.created_at desc),'[]') from app_private.application_events e left join public.company_members m on m.user_id=e.actor and m.company_id=a.company_id where e.application_id=a.id)) from app_private.company_jobs j join public.candidate_accounts c on c.user_id=a.candidate_id join auth.users u on u.id=c.user_id left join app_private.candidate_documents d on d.id=a.resume_id where j.id=a.job_id$$;
create function public.candidate_applications_v1(operation text default 'list',job_id uuid default null,accepted boolean default false) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare j app_private.company_jobs;a app_private.job_applications;opts jsonb;answer jsonb;resume uuid;
begin
 if public.candidate_context() is null then raise exception 'candidate only' using errcode='42501';end if;
 if operation='apply' then
  select * into j from app_private.company_jobs x where x.id=job_id and x.deleted_at is null and x.status='Publicada' for update;
  if j.id is null or not exists(select 1 from public.company_portals p join public.companies c on c.id=p.company_id where p.company_id=j.company_id and p.is_public and c.operational_status='active') then raise exception 'closed job' using errcode='PT422';end if;
  if accepted is not true then raise exception 'consent required' using errcode='22023';end if;
  select o.document into opts from app_private.company_job_options o where o.job_id=j.id;
  if coalesce(opts->>'acceptApplications','true')<>'true' or (coalesce(j.document->>'applicationDeadline','')<>'' and (j.document->>'applicationDeadline')::date<current_date) then raise exception 'closed job' using errcode='PT422';end if;
  select id into resume from app_private.candidate_documents where user_id=auth.uid() and state='current';
  if coalesce(opts->>'resumeRequired','true')='true' and resume is null then raise exception 'resume required' using errcode='PT422';end if;
  perform app_private.consume_operation_budget('application-create',auth.uid(),60,3600);
  insert into app_private.job_applications(company_id,job_id,candidate_id,resume_id) values(j.company_id,j.id,auth.uid(),resume) on conflict on constraint job_applications_job_id_candidate_id_key do nothing returning * into a;
  if a.id is not null then
   insert into app_private.application_events(application_id,actor,action,details) values(a.id,auth.uid(),'Candidatura recebida','{"consent":true}');
   insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(j.company_id,auth.uid(),'application.created',a.id);
   if coalesce(opts->>'notifyApplication','true')='true' then insert into app_private.company_alerts(company_id,user_id,event_key,title,body,link) select j.company_id,m.user_id,'application:'||a.id,'Nova candidatura',j.document->>'title','/app/candidaturas?application='||a.id from public.company_members m where m.company_id=j.company_id and m.status='active' and m.role='owner' on conflict do nothing;end if;
  end if;
 elsif operation='withdraw' then
  update app_private.job_applications x set stage='Desistência',version=x.version+1,updated_at=now() where x.job_id=candidate_applications_v1.job_id and candidate_id=auth.uid() and stage not in ('Contratação','Desistência') returning * into a;
  if a.id is not null then insert into app_private.application_events(application_id,actor,action) values(a.id,auth.uid(),'Desistência informada');end if;
 elsif operation<>'list' then raise exception 'invalid operation' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'jobId',x.job_id,'title',j.document->>'title','company',c.name,'stage',x.stage,'createdAt',x.created_at) order by x.created_at desc),'[]') into answer from app_private.job_applications x join app_private.company_jobs j on j.id=x.job_id join public.companies c on c.id=x.company_id where x.candidate_id=auth.uid();return answer;
end;$$;
create function public.company_operations_v1(operation text default 'snapshot',record_id uuid default null,document jsonb default '{}',expected_version bigint default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid:=app_private.current_company_id();a app_private.job_applications;e app_private.company_interviews;j app_private.company_jobs;k text;v bigint;answer jsonb;cfg jsonb;recipient uuid;
begin
 perform app_private.security_gate();if cid is null or public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if document is null or jsonb_typeof(document)<>'object' or octet_length(document::text)>20000 then raise exception 'invalid data' using errcode='22023';end if;
 if operation in ('move','note','resume') then
  perform app_private.require_company_permission(case operation when 'note' then 'applications.notes' when 'resume' then 'applications.resume' else 'applications.move' end);
  select * into a from app_private.job_applications x where x.id=record_id and x.company_id=cid for update;
  if a.id is null then raise exception 'not found' using errcode='P0002';end if;
  if operation='resume' then return (select jsonb_build_object('path',path,'name',name,'sha256',sha256,'size',size) from app_private.candidate_documents where id=a.resume_id);end if;
  if expected_version is distinct from a.version then raise exception 'conflict' using errcode='40001';end if;
  if operation='move' then
   if document->>'stage' not in ('Candidatura','Triagem','Pré-aprovação','Pré-reprovação','Entrevista','Contratação','Reprovada') or document->>'stage' is null then raise exception 'invalid stage' using errcode='22023';end if;
   if document->>'stage' in ('Pré-aprovação','Pré-reprovação','Contratação','Reprovada') then perform app_private.require_company_permission('applications.decide');end if;
   if length(coalesce(document->>'reason',''))>2000 or document->>'stage' in ('Pré-reprovação','Reprovada') and length(trim(coalesce(document->>'reason','')))<3 then raise exception 'reason required' using errcode='22023';end if;
   update app_private.job_applications set stage=document->>'stage',reason=coalesce(document->>'reason',''),version=version+1,updated_at=now() where id=a.id;
   insert into app_private.application_events(application_id,actor,action,details) values(a.id,auth.uid(),'Etapa alterada',jsonb_build_object('from',a.stage,'to',document->>'stage','reason',document->>'reason'));
   if document->>'stage'='Entrevista' and not exists(select 1 from app_private.company_interviews where application_id=a.id and status in ('A agendar','Agendada')) then insert into app_private.company_interviews(company_id,application_id,title) select cid,a.id,'Entrevista · '||full_name from public.candidate_accounts where user_id=a.candidate_id;end if;
   if document->>'stage' in ('Reprovada','Contratação') then update app_private.company_interviews set status='Cancelada',version=version+1,updated_at=now() where application_id=a.id and status in ('Agendada','A agendar') and (starts_at is null or starts_at>now());end if;
  else
   if length(coalesce(document->>'notes',''))>10000 then raise exception 'notes too long' using errcode='22023';end if;
   update app_private.job_applications set notes=coalesce(document->>'notes',''),version=version+1,updated_at=now() where id=a.id;
   insert into app_private.application_events(application_id,actor,action) values(a.id,auth.uid(),'Anotação atualizada');
  end if;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'application.'||operation,a.id);
  if operation='move' and coalesce((select o.document->>'notifyStage' from app_private.company_job_options o where o.job_id=a.job_id),'true')='true' then insert into app_private.company_alerts(company_id,user_id,event_key,title,body,link) select cid,m.user_id,'stage:'||a.id||':'||(a.version+1),'Candidatura atualizada',document->>'stage','/app/candidaturas?application='||a.id from public.company_members m where m.company_id=cid and m.status='active' and (m.role='owner' or exists(select 1 from app_private.company_interviews e where e.application_id=a.id and e.responsible_id=m.id)) on conflict do nothing;end if;
 elsif operation='event' then
  perform app_private.require_company_permission('agenda.manage');perform pg_advisory_xact_lock(hashtextextended(cid::text,57));
  if record_id is not null then select * into e from app_private.company_interviews x where x.id=record_id and x.company_id=cid for update;if e.id is null then raise exception 'not found' using errcode='P0002';end if;if expected_version is distinct from e.version then raise exception 'conflict' using errcode='40001';end if;end if;
  if length(trim(coalesce(document->>'title',''))) not between 2 and 180 or length(coalesce(document->>'notes',''))>4000 or document->>'status' not in ('Agendada','Concluída','Cancelada') or document->>'status' is null then raise exception 'invalid event' using errcode='22023';end if;
  if coalesce(document->>'meetingUrl','https://meet.google.com/') !~ '^https://(meet\.google\.com|([a-z0-9-]+\.)?zoom\.us|teams\.microsoft\.com)(/|$)' or length(document->>'meetingUrl')>1000 then raise exception 'invalid meeting link' using errcode='22023';end if;
  if not exists(select 1 from public.company_members where id=(document->>'responsibleId')::uuid and company_id=cid and status='active') then raise exception 'responsible required' using errcode='22023';end if;
  if (document->>'startsAt')::timestamptz is null or (document->>'endsAt')::timestamptz is null or (document->>'endsAt')::timestamptz<=(document->>'startsAt')::timestamptz then raise exception 'invalid interval' using errcode='22023';end if;
  if exists(select 1 from app_private.company_interviews x where x.company_id=cid and x.id<>coalesce(record_id,'00000000-0000-0000-0000-000000000000') and x.responsible_id=(document->>'responsibleId')::uuid and x.status='Agendada' and document->>'status'='Agendada' and tstzrange(x.starts_at,x.ends_at,'[)')&&tstzrange((document->>'startsAt')::timestamptz,(document->>'endsAt')::timestamptz,'[)')) then raise exception 'schedule conflict' using errcode='PT409';end if;
  if e.id is null then insert into app_private.company_interviews(company_id,title,starts_at,ends_at,responsible_id,meeting_url,notes,status) values(cid,document->>'title',(document->>'startsAt')::timestamptz,(document->>'endsAt')::timestamptz,(document->>'responsibleId')::uuid,coalesce(document->>'meetingUrl','https://meet.google.com/'),coalesce(document->>'notes',''),document->>'status') returning * into e;
  else update app_private.company_interviews set title=document->>'title',starts_at=(document->>'startsAt')::timestamptz,ends_at=(document->>'endsAt')::timestamptz,responsible_id=(document->>'responsibleId')::uuid,meeting_url=coalesce(document->>'meetingUrl','https://meet.google.com/'),notes=coalesce(document->>'notes',''),status=document->>'status',version=version+1,updated_at=now() where id=e.id returning * into e;end if;
  if e.application_id is not null then insert into app_private.application_events(application_id,actor,action,details) values(e.application_id,auth.uid(),'Entrevista atualizada',jsonb_build_object('status',e.status,'startsAt',e.starts_at));end if;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'agenda.saved',e.id);
 elsif operation='invitation' then
  perform app_private.require_company_permission('agenda.manage');
  select * into e from app_private.company_interviews where id=record_id and company_id=cid and status='Agendada';if e.id is null then raise exception 'not found' using errcode='P0002';end if;
  perform app_private.consume_operation_budget('interview-invitation',e.id,3,86400);
  return (select jsonb_build_object('event',to_jsonb(e),'email',u.email,'name',c.full_name,'company',co.name,'branding',b.published) from app_private.job_applications a join public.candidate_accounts c on c.user_id=a.candidate_id join auth.users u on u.id=c.user_id join public.companies co on co.id=a.company_id left join public.company_branding b on b.company_id=co.id where a.id=e.application_id);
 elsif operation='options' then
  perform app_private.require_company_permission('jobs.edit');select * into j from app_private.company_jobs where id=record_id and company_id=cid and deleted_at is null for update;if j.id is null then raise exception 'not found' using errcode='P0002';end if;
  if exists(select 1 from jsonb_object_keys(document) x(k) where not k=any(array['acceptApplications','resumeRequired','positions','notifyApplication','notifyStage'])) then raise exception 'invalid settings' using errcode='22023';end if;
  foreach k in array array['acceptApplications','resumeRequired','notifyApplication','notifyStage'] loop if jsonb_typeof(document->k) is distinct from 'boolean' then raise exception 'invalid boolean' using errcode='22023';end if;end loop;
  if coalesce(document->>'positions','')!~'^[1-9][0-9]{0,4}$' then raise exception 'invalid positions' using errcode='22023';end if;
  select version into v from app_private.company_job_options where job_id=j.id;if coalesce(v,0) is distinct from expected_version then raise exception 'conflict' using errcode='40001';end if;
  insert into app_private.company_job_options(job_id,document) values(j.id,document) on conflict(job_id) do update set document=excluded.document,version=company_job_options.version+1;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'job.options',j.id);
 elsif operation='preferences' then
  perform app_private.require_company_permission('settings.manage');
  if jsonb_typeof(document->'reminderDay') is distinct from 'boolean' or jsonb_typeof(document->'reminderTenMinutes') is distinct from 'boolean' or (select count(*) from jsonb_object_keys(document))<>2 then raise exception 'invalid preferences' using errcode='22023';end if;
  insert into app_private.company_recruitment_preferences(company_id,document) values(cid,document) on conflict(company_id) do update set document=excluded.document,version=company_recruitment_preferences.version+1;
 elsif operation='read-alert' then update app_private.company_alerts set read_at=coalesce(read_at,now()) where id=record_id and company_id=cid and user_id=auth.uid();
 elsif operation not in ('snapshot','alerts') then raise exception 'invalid operation' using errcode='22023';end if;
 select p.document into cfg from app_private.company_recruitment_preferences p where p.company_id=cid;
 insert into app_private.company_alerts(company_id,user_id,event_key,title,body,link)
 select cid,auth.uid(),e.id||':'||e.version||':'||phase,'Entrevista '||case phase when 'day' then 'hoje' else 'em 10 minutos' end,e.title,'/app/agenda?event='||e.id
 from app_private.company_interviews e cross join unnest(array['day','soon']) phase where e.company_id=cid and e.status='Agendada' and e.starts_at>now() and (e.responsible_id=(select id from public.company_members where user_id=auth.uid() and company_id=cid) or app_private.company_role(cid)='owner')
 and ((phase='day' and coalesce(cfg->>'reminderDay','true')='true' and (e.starts_at at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date) or (phase='soon' and coalesce(cfg->>'reminderTenMinutes','true')='true' and e.starts_at<=now()+interval '10 minutes')) on conflict do nothing;
 if operation in ('alerts','read-alert') then return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from (select * from app_private.company_alerts where company_id=cid and user_id=auth.uid() order by created_at desc limit 100)x),'unread',(select count(*) from app_private.company_alerts where company_id=cid and user_id=auth.uid() and read_at is null));end if;
 return jsonb_build_object('companyId',cid,'access',public.company_access_v1(),
 'applications',case when app_private.company_can('applications.view') then (select coalesce(jsonb_agg(app_private.application_json(x) order by x.created_at desc),'[]') from app_private.job_applications x where x.company_id=cid) else '[]'::jsonb end,
 'events',case when app_private.company_can('agenda.view') then (select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at nulls first),'[]') from app_private.company_interviews x where x.company_id=cid) else '[]'::jsonb end,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',full_name,'role',role)),'[]') from public.company_members where company_id=cid and status='active'),
 'jobs',case when app_private.company_can('jobs.view') then (select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'title',j.document->>'title','status',j.status,'createdAt',j.created_at,'applications',(select count(*) from app_private.job_applications a where a.job_id=j.id),'options',coalesce(o.document,'{"acceptApplications":true,"resumeRequired":true,"positions":1,"notifyApplication":true,"notifyStage":true}'),'optionsVersion',coalesce(o.version,0))),'[]') from app_private.company_jobs j left join app_private.company_job_options o on o.job_id=j.id where j.company_id=cid and j.deleted_at is null) else '[]'::jsonb end,
 'preferences',coalesce(cfg,'{"reminderDay":true,"reminderTenMinutes":true}'),
 'activity',case when app_private.company_can('dashboards.view') then (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select action,created_at from public.company_audit_events where company_id=cid order by created_at desc limit 15)x) else '[]'::jsonb end);
end;$$;
create or replace function app_private.job_result(j app_private.company_jobs) returns jsonb language sql stable set search_path=pg_catalog as $$
 select j.document||jsonb_build_object('branchIds',coalesce((select jsonb_agg(b.id order by b.id) from app_private.company_branches b where b.company_id=j.company_id and b.document->'jobIds' ? j.id::text),'[]'::jsonb))||jsonb_build_object('id',j.id,'organizationId',j.company_id,'status',j.status,'version',j.version,'createdAt',j.created_at,'updatedAt',j.updated_at,'applicationsCount',(select count(*) from app_private.job_applications a where a.job_id=j.id));
$$;
-- Resume access is tied to an application in the active company, never a public URL.
create function app_private.company_resume_access(object_name text) returns boolean language sql stable security definer set search_path=pg_catalog as $$select app_private.company_can('applications.resume') and exists(select 1 from app_private.candidate_documents d join app_private.job_applications a on a.resume_id=d.id where d.path=object_name and a.company_id=app_private.current_company_id())$$;
alter function app_private.company_resume_access(text) owner to postgres;
revoke all on function app_private.company_resume_access(text) from public,anon,authenticated,service_role;
grant execute on function app_private.company_resume_access(text) to authenticated;
create policy "Company reads application resume" on storage.objects for select to authenticated using(bucket_id='candidate-resumes' and app_private.company_resume_access(name));
do $$declare r record;begin for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname=any(array['application_json','candidate_applications_v1','company_operations_v1']) loop execute format('alter function %s owner to postgres',r.signature);execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);end loop;end;$$;
grant execute on function public.candidate_applications_v1(text,uuid,boolean),public.company_operations_v1(text,uuid,jsonb,bigint) to authenticated;
notify pgrst,'reload schema';

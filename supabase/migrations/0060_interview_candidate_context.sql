-- migration-role: supabase_admin
-- Keep ownership, permissions, concurrency, invitation and audit gates intact.
alter table app_private.company_interviews alter column meeting_url set default '';
create or replace function public.company_operations_v1(operation text default 'snapshot',record_id uuid default null,document jsonb default '{}',expected_version bigint default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
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
  if operation='move' and coalesce((select o.document->>'notifyStage' from app_private.company_job_options o where o.job_id=a.job_id),'true')='true' then insert into app_private.company_alerts(company_id,user_id,event_key,title,body,link) select cid,m.user_id,'stage:'||a.id||':'||(a.version+1),'Candidatura atualizada',document->>'stage','/app/candidaturas?application='||a.id from public.company_members m where m.company_id=cid and m.status='active' and (m.role='owner' or exists(select 1 from app_private.company_interviews assigned where assigned.application_id=a.id and assigned.responsible_id=m.id)) on conflict do nothing;end if;
 elsif operation='event' then
  perform app_private.require_company_permission('agenda.manage');perform pg_advisory_xact_lock(hashtextextended(cid::text,57));
  if record_id is not null then select * into e from app_private.company_interviews x where x.id=record_id and x.company_id=cid for update;if e.id is null then raise exception 'not found' using errcode='P0002';end if;if expected_version is distinct from e.version then raise exception 'conflict' using errcode='40001';end if;end if;
  if document ? 'applicationId' and nullif(document->>'applicationId','') is not null then
   perform app_private.require_company_permission('applications.view');
   if not exists(select 1 from app_private.job_applications x where x.id=(document->>'applicationId')::uuid and x.company_id=cid) then raise exception 'invalid application' using errcode='22023';end if;
  end if;
  if e.application_id is not null and document ? 'applicationId' and e.application_id is distinct from nullif(document->>'applicationId','')::uuid then raise exception 'existing interview cannot change candidate' using errcode='22023';end if;
  if length(trim(coalesce(document->>'title',''))) not between 2 and 180 or length(coalesce(document->>'notes',''))>4000 or document->>'status' not in ('Agendada','Concluída','Cancelada') or document->>'status' is null then raise exception 'invalid event' using errcode='22023';end if;
  if coalesce(document->>'meetingUrl','')<>'' and (document->>'meetingUrl' !~ '^https://(meet\.google\.com|([a-z0-9-]+\.)?zoom\.us|teams\.microsoft\.com)(/|$)' or length(document->>'meetingUrl')>1000) then raise exception 'invalid meeting link' using errcode='22023';end if;
  if document->>'status'<>'Cancelada' and not exists(select 1 from public.company_members where id=(document->>'responsibleId')::uuid and company_id=cid and status='active') then raise exception 'responsible required' using errcode='22023';end if;
  if document->>'status'<>'Cancelada' and ((document->>'startsAt')::timestamptz is null or (document->>'endsAt')::timestamptz is null or (document->>'endsAt')::timestamptz<=(document->>'startsAt')::timestamptz) then raise exception 'invalid interval' using errcode='22023';end if;
  if exists(select 1 from app_private.company_interviews x where x.company_id=cid and x.id<>coalesce(record_id,'00000000-0000-0000-0000-000000000000') and x.responsible_id=(document->>'responsibleId')::uuid and x.status='Agendada' and document->>'status'='Agendada' and tstzrange(x.starts_at,x.ends_at,'[)')&&tstzrange((document->>'startsAt')::timestamptz,(document->>'endsAt')::timestamptz,'[)')) then raise exception 'schedule conflict' using errcode='PT409';end if;
  if e.id is null then insert into app_private.company_interviews(company_id,application_id,title,starts_at,ends_at,responsible_id,meeting_url,notes,status) values(cid,nullif(document->>'applicationId','')::uuid,document->>'title',(document->>'startsAt')::timestamptz,(document->>'endsAt')::timestamptz,(document->>'responsibleId')::uuid,coalesce(document->>'meetingUrl',''),coalesce(document->>'notes',''),document->>'status') returning * into e;
  else update app_private.company_interviews set application_id=case when document ? 'applicationId' then nullif(document->>'applicationId','')::uuid else application_id end,title=document->>'title',starts_at=(document->>'startsAt')::timestamptz,ends_at=(document->>'endsAt')::timestamptz,responsible_id=(document->>'responsibleId')::uuid,meeting_url=coalesce(document->>'meetingUrl',''),notes=coalesce(document->>'notes',''),status=document->>'status',version=version+1,updated_at=now() where id=e.id returning * into e;end if;
  update app_private.company_alerts set read_at=coalesce(read_at,now()) where company_id=cid and event_key like e.id::text||':%';
  if e.application_id is not null then insert into app_private.application_events(application_id,actor,action,details) values(e.application_id,auth.uid(),'Entrevista atualizada',jsonb_build_object('status',e.status,'startsAt',e.starts_at));end if;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'agenda.saved',e.id);
 elsif operation='invitation' then
  perform app_private.require_company_permission('agenda.manage');
  select * into e from app_private.company_interviews where id=record_id and company_id=cid and status='Agendada';if e.id is null then raise exception 'not found' using errcode='P0002';end if;
  perform app_private.consume_operation_budget('interview-invitation',e.id,3,86400);insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'agenda.invitation_requested',e.id);
  return (select jsonb_build_object('event',to_jsonb(e),'email',u.email,'name',c.full_name,'company',co.name,'slug',(select p.slug from public.company_portals p where p.company_id=co.id),'branding',b.published) from app_private.job_applications applied join public.candidate_accounts c on c.user_id=applied.candidate_id join auth.users u on u.id=c.user_id join public.companies co on co.id=applied.company_id left join public.company_branding b on b.company_id=co.id where applied.id=e.application_id);
 elsif operation='options' then
  perform app_private.require_company_permission('jobs.edit');select * into j from app_private.company_jobs where id=record_id and company_id=cid and deleted_at is null for update;if j.id is null then raise exception 'not found' using errcode='P0002';end if;
  if exists(select 1 from jsonb_object_keys(document) x(key_name) where not x.key_name=any(array['acceptApplications','resumeRequired','positions','notifyApplication','notifyStage'])) then raise exception 'invalid settings' using errcode='22023';end if;
  foreach k in array array['acceptApplications','resumeRequired','notifyApplication','notifyStage'] loop if jsonb_typeof(document->k) is distinct from 'boolean' then raise exception 'invalid boolean' using errcode='22023';end if;end loop;
  if coalesce(document->>'positions','')!~'^[1-9][0-9]{0,4}$' then raise exception 'invalid positions' using errcode='22023';end if;
  select version into v from app_private.company_job_options where job_id=j.id;if coalesce(v,0) is distinct from expected_version then raise exception 'conflict' using errcode='40001';end if;
  insert into app_private.company_job_options(job_id,document) values(j.id,document) on conflict(job_id) do update set document=excluded.document,version=company_job_options.version+1;
  insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'job.options',j.id);
 elsif operation='preferences' then
  perform app_private.require_company_permission('settings.manage');perform pg_advisory_xact_lock(hashtextextended(cid::text,58));
  select p.version into v from app_private.company_recruitment_preferences p where p.company_id=cid;if coalesce(v,0) is distinct from expected_version then raise exception 'conflict' using errcode='40001';end if;
  if jsonb_typeof(document->'reminderDay') is distinct from 'boolean' or jsonb_typeof(document->'reminderTenMinutes') is distinct from 'boolean' or (select count(*) from jsonb_object_keys(document))<>2 then raise exception 'invalid preferences' using errcode='22023';end if;
  insert into app_private.company_recruitment_preferences(company_id,document) values(cid,document) on conflict(company_id) do update set document=excluded.document,version=company_recruitment_preferences.version+1;
 elsif operation='read-alert' then update app_private.company_alerts set read_at=coalesce(read_at,now()) where id=record_id and company_id=cid and user_id=auth.uid();
 elsif operation not in ('snapshot','alerts') then raise exception 'invalid operation' using errcode='22023';end if;
 select p.document into cfg from app_private.company_recruitment_preferences p where p.company_id=cid;
 insert into app_private.company_alerts(company_id,user_id,event_key,title,body,link)
 select cid,auth.uid(),reminder.id||':'||reminder.version||':'||phase,'Entrevista '||case phase when 'day' then 'hoje' else 'em 10 minutos' end,reminder.title,'/app/agenda?event='||reminder.id
 from app_private.company_interviews reminder cross join unnest(array['day','soon']) phase where reminder.company_id=cid and reminder.status='Agendada' and reminder.starts_at>now() and (reminder.responsible_id=(select id from public.company_members where user_id=auth.uid() and company_id=cid) or app_private.company_role(cid)='owner')
 and ((phase='day' and coalesce(cfg->>'reminderDay','true')='true' and (reminder.starts_at at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date) or (phase='soon' and coalesce(cfg->>'reminderTenMinutes','true')='true' and reminder.starts_at<=now()+interval '10 minutes')) on conflict do nothing;
 if operation in ('alerts','read-alert') then return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from (select * from app_private.company_alerts where company_id=cid and user_id=auth.uid() order by created_at desc limit 100)x),'unread',(select count(*) from app_private.company_alerts where company_id=cid and user_id=auth.uid() and read_at is null));end if;
 return jsonb_build_object('companyId',cid,'access',public.company_access_v1(),
 'metrics',case when app_private.company_can('dashboards.view') then jsonb_build_object('published',(select count(*) from app_private.company_jobs x where x.company_id=cid and x.deleted_at is null and x.status='Publicada'),'applications',(select count(*) from app_private.job_applications x where x.company_id=cid),'interviews',(select count(*) from app_private.company_interviews x where x.company_id=cid and x.status='Agendada'),'hired',(select count(*) from app_private.job_applications x where x.company_id=cid and x.stage='Contratação'),'stages',(select coalesce(jsonb_object_agg(x.stage,x.total),'{}') from(select stage,count(*) total from app_private.job_applications where company_id=cid group by stage)x)) else null end,
 'applications',case when app_private.company_can('applications.view') then (select coalesce(jsonb_agg(app_private.application_json(x) order by x.created_at desc),'[]') from app_private.job_applications x where x.company_id=cid) else '[]'::jsonb end,
 'events',case when app_private.company_can('agenda.view') then (select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at nulls first),'[]') from app_private.company_interviews x where x.company_id=cid) else '[]'::jsonb end,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',full_name,'role',role)),'[]') from public.company_members where company_id=cid and status='active'),
 'jobs',case when app_private.company_can('jobs.view') then (select coalesce(jsonb_agg(jsonb_build_object('id',job_row.id,'title',job_row.document->>'title','status',job_row.status,'createdAt',job_row.created_at,'applications',(select count(*) from app_private.job_applications app_row where app_row.job_id=job_row.id),'options',coalesce(o.document,'{"acceptApplications":true,"resumeRequired":true,"positions":1,"notifyApplication":true,"notifyStage":true}'),'optionsVersion',coalesce(o.version,0))),'[]') from app_private.company_jobs job_row left join app_private.company_job_options o on o.job_id=job_row.id where job_row.company_id=cid and job_row.deleted_at is null) else '[]'::jsonb end,
 'preferencesVersion',coalesce((select p.version from app_private.company_recruitment_preferences p where p.company_id=cid),0),
 'preferences',coalesce(cfg,'{"reminderDay":true,"reminderTenMinutes":true}'),
 'activity',case when app_private.company_can('dashboards.view') then (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select action,created_at from public.company_audit_events where company_id=cid order by created_at desc limit 15)x) else '[]'::jsonb end);
end;$$;
notify pgrst,'reload schema';

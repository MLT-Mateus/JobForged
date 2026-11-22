-- migration-role: supabase_admin
create or replace function public.candidate_applications_v1(operation text default 'list',job_id uuid default null,accepted boolean default false) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
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
  if a.id is not null then insert into app_private.application_events(application_id,actor,action) values(a.id,auth.uid(),'Desistência informada');update app_private.company_interviews set status='Cancelada',version=version+1,updated_at=now() where application_id=a.id and status in ('A agendar','Agendada');insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(a.company_id,auth.uid(),'application.withdraw',a.id);end if;
 elsif operation<>'list' then raise exception 'invalid operation' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'jobId',x.job_id,'title',vacancy.document->>'title','company',c.name,'slug',(select p.slug from public.company_portals p where p.company_id=c.id and p.is_public),'jobStatus',vacancy.status,'stage',x.stage,'createdAt',x.created_at) order by x.created_at desc),'[]') into answer from app_private.job_applications x join app_private.company_jobs vacancy on vacancy.id=x.job_id join public.companies c on c.id=x.company_id where x.candidate_id=auth.uid();return answer;
end;$$;

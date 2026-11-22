-- migration-role: supabase_admin
-- Immutable publication history, private; no new grant to clients.
create table app_private.job_publication_revisions(
 job_id uuid not null references app_private.company_jobs(id),
 version bigint not null,
 document jsonb not null,
 recorded_at timestamptz not null default now(),
 primary key(job_id,version)
);
alter table app_private.job_publication_revisions owner to postgres;
revoke all on app_private.job_publication_revisions from public,anon,authenticated,service_role;
insert into app_private.job_publication_revisions(job_id,version,document)
select id,published_version,published_document from app_private.company_jobs where published_version is not null;
create function app_private.record_job_publication() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
 if new.published_version is not null and new.published_version is distinct from old.published_version then
  insert into app_private.job_publication_revisions(job_id,version,document) values(new.id,new.published_version,new.published_document) on conflict do nothing;
 end if;return new;
end;$$;
create trigger job_publication_revision after update on app_private.company_jobs for each row execute function app_private.record_job_publication();

-- Read the deadline from the active announcement, never from unpublished edits.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.candidate_applications_v1(text,uuid,boolean)'::regprocedure);
 definition:=replace(definition,'j.document->>''applicationDeadline''','coalesce(j.published_document,j.document)->>''applicationDeadline''');
 execute definition;
 -- Previous clients can read modern records, pause, close and delete them. They
 -- cannot overwrite a modern draft or bypass its publication/example rules.
 definition:=pg_get_functiondef('public.company_jobs_v1(text,uuid,jsonb,text,bigint)'::regprocedure);
 definition:=replace(definition,'if operation=''save'' and not app_private.job_document_valid(document)',
 'if (coalesce(document->>''schemaVersion'',j.document->>''schemaVersion'')=''2'') and (operation=''save'' or requested_status=''Publicada'') then raise exception ''Use the current editor to publish this revision'' using errcode=''22023'';end if;
  if operation=''save'' and not app_private.job_document_valid(document)');
 execute definition;
 -- Dashboard totals use canonical stages without changing the approved layout.
 definition:=pg_get_functiondef('public.company_operations_v1(text,uuid,jsonb,bigint)'::regprocedure);
 definition:=replace(definition,'select stage,count(*) total from app_private.job_applications where company_id=cid group by stage',
 'select app_private.pipeline_label(stage_key,outcome) stage,count(*) total from app_private.job_applications where company_id=cid group by stage_key,outcome');
 execute definition;
end;$$;
alter function app_private.record_job_publication() owner to postgres;
revoke all on function app_private.record_job_publication() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';

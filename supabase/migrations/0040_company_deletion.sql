-- migration-role: supabase_admin
-- Explicit administrative deletion. No existing company is queued by migration.
create table app_private.company_deletion_jobs(
 id uuid primary key default extensions.gen_random_uuid(),company_id uuid not null unique,
 requested_by uuid not null references auth.users(id),requested_at timestamptz not null default now(),
 state text not null default 'queued' check(state in ('queued','files','accounts','completed')),
 remove_accounts boolean not null,reason text not null,backup_name text,error_code text,
 file_count integer not null default 0,deleted_count integer not null default 0,preserved_count integer not null default 0,
 completed_at timestamptz,updated_at timestamptz not null default now()
);
create table app_private.company_deletion_objects(
 job_id uuid references app_private.company_deletion_jobs(id),bucket text not null,path text not null,
 removed_at timestamptz,primary key(job_id,bucket,path)
);
create table app_private.company_deletion_users(
 job_id uuid references app_private.company_deletion_jobs(id),user_id uuid not null,
 state text not null default 'pending' check(state in ('pending','deleted','preserved')),
 primary key(job_id,user_id)
);
create table app_private.company_deletion_identity_locks(user_id uuid primary key,job_id uuid not null references app_private.company_deletion_jobs(id));
revoke all on app_private.company_deletion_identity_locks from public,anon,authenticated,service_role;
revoke all on app_private.company_deletion_jobs,app_private.company_deletion_objects,app_private.company_deletion_users from public,anon,authenticated,service_role;

create function public.company_deletion(operation text,target_company uuid default null,confirmation text default '',change_reason text default '',remove_accounts boolean default false)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare c public.companies;j app_private.company_deletion_jobs;result jsonb;
begin
 perform app_private.require_admin_factor(true);
 if operation='jobs' then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into result from(
   select id,company_id,state,requested_at,completed_at,error_code,
    file_count files,
    case when state='completed' then file_count else(select count(*) from app_private.company_deletion_objects o where o.job_id=q.id and o.removed_at is not null) end removed_files,
    case when state='completed' then deleted_count else(select count(*) from app_private.company_deletion_users u where u.job_id=q.id and u.state='deleted') end deleted_accounts,
    case when state='completed' then preserved_count else(select count(*) from app_private.company_deletion_users u where u.job_id=q.id and u.state='preserved') end preserved_accounts
   from app_private.company_deletion_jobs q order by requested_at desc limit 25)x;
  return jsonb_build_object('items',result);
 end if;
 select * into c from public.companies where id=target_company for update;
 if not found then raise exception 'company unavailable' using errcode='22023';end if;
 if operation='preview' then
  return jsonb_build_object('name',c.name,'members',(select count(*) from public.company_members where company_id=c.id),
   'candidates',(select count(*) from public.candidate_accounts where origin_company_id=c.id),
   'images',(select count(*) from storage.objects where bucket_id='company-branding' and split_part(name,'/',1)=c.id::text),
   'history',(select count(*) from public.company_branding_history where company_id=c.id));
 end if;
 if operation is distinct from 'request' or confirmation is distinct from c.name or length(trim(change_reason)) not between 5 and 500 or remove_accounts is null then
  raise exception 'confirmation and reason required' using errcode='22023';end if;
 select * into j from app_private.company_deletion_jobs where company_id=c.id;
 if found then return jsonb_build_object('id',j.id,'state',j.state);end if;
 update public.companies set operational_status='suspended' where id=c.id;
 update public.company_portals set is_public=false where company_id=c.id;
 update public.company_domains set status='disabled' where company_id=c.id;
 insert into app_private.company_deletion_jobs(company_id,requested_by,reason,remove_accounts)
 values(c.id,auth.uid(),trim(change_reason),remove_accounts) returning * into j;
 -- All candidates originate in this company. Never remove another company's resumes.
 insert into app_private.company_deletion_users(job_id,user_id)
 select j.id,user_id from public.company_members where company_id=c.id
 union select j.id,user_id from public.candidate_accounts where origin_company_id=c.id;
 insert into app_private.company_deletion_objects(job_id,bucket,path)
 select j.id,o.bucket_id,o.name from storage.objects o where
 (o.bucket_id='company-branding' and split_part(o.name,'/',1)=c.id::text)
 or(o.bucket_id='candidate-resumes' and exists(select 1 from public.candidate_accounts a where a.origin_company_id=c.id and a.user_id::text=split_part(o.name,'/',1)))
 or(o.bucket_id='security-quarantine' and exists(select 1 from app_private.orphan_quarantine q where q.company_id=c.id and o.name=q.id::text||'/image.png'));
 insert into public.platform_audit_events(actor_user_id,action,target_id,reason,details)
 values(auth.uid(),'platform.company.deletion.request',c.id,trim(change_reason),jsonb_build_object('job',j.id,'remove_exclusive_accounts',remove_accounts));
 return jsonb_build_object('id',j.id,'state',j.state);
end;$$;
revoke all on function public.company_deletion(text,uuid,text,text,boolean) from public,anon,service_role;
grant execute on function public.company_deletion(text,uuid,text,text,boolean) to authenticated;

-- Freeze dependent writes while the queued deletion is processed. DELETE is
-- reserved to the private finalizer, and all ordinary direct writes stay denied.
create function app_private.guard_deleting_company() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;person uuid;
begin
 if tg_table_name in('company_members','candidate_accounts') then
  person:=(to_jsonb(new)->>'user_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(person::text,8540));
  if exists(select 1 from app_private.company_deletion_identity_locks where user_id=person) then raise exception 'identity deletion pending' using errcode='42501';end if;
 end if;
 cid:=(case when tg_table_name='companies' then to_jsonb(new)->>'id' when tg_table_name='candidate_accounts' then to_jsonb(new)->>'origin_company_id' else to_jsonb(new)->>'company_id' end)::uuid;
 if exists(select 1 from app_private.company_deletion_jobs where company_id=cid and state<>'completed') then
  raise exception 'company deletion pending' using errcode='42501';end if;
 return new;
end;$$;
do $$declare t text;begin
 foreach t in array array['companies','company_members','company_invitations','company_branding','company_branding_history','company_branding_assets','company_portals','company_domains','candidate_accounts'] loop
  execute format('create trigger guard_company_deletion before insert or update on public.%I for each row execute function app_private.guard_deleting_company()',t);
 end loop;
end$$;
create function app_private.deletion_storage_access(bucket text,path text) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select auth.uid()='00000000-0000-4000-8000-000000000085'::uuid
 and auth.jwt()->>'maintenance'='company-deletion'
 and coalesce(auth.jwt()->>'exp','0')~'^[0-9]+$' and(auth.jwt()->>'exp')::bigint<=extract(epoch from now())+180
 and exists(select 1 from app_private.company_deletion_jobs j join app_private.company_deletion_objects o on o.job_id=j.id
 where j.id::text=auth.jwt()->>'job' and j.state='files' and j.backup_name is not null and o.bucket=$1 and o.path=$2);
$$;
create policy "Deletion worker reads queued files" on storage.objects for select to authenticated using(app_private.deletion_storage_access(bucket_id,name));
create policy "Deletion worker removes queued files" on storage.objects for delete to authenticated using(app_private.deletion_storage_access(bucket_id,name));

create function app_private.finish_company_deletion(job uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare j app_private.company_deletion_jobs;cid uuid;
begin
 select * into j from app_private.company_deletion_jobs where id=job for update;
 if not found or j.state<>'files' or j.backup_name is null then raise exception 'deletion not ready';end if;
 cid:=j.company_id;perform 1 from public.companies where id=cid for update;
 if exists(select 1 from app_private.company_deletion_objects where job_id=job and removed_at is null)
 or exists(select 1 from storage.objects o join app_private.company_deletion_objects d on d.bucket=o.bucket_id and d.path=o.name where d.job_id=job)
 or exists(select 1 from storage.objects where bucket_id='company-branding' and split_part(name,'/',1)=cid::text) then raise exception 'files pending';end if;
 delete from public.platform_communication_deliveries where communication_id in(select id from public.platform_communications where company_id=cid);
 delete from public.platform_communications where company_id=cid;
 delete from app_private.candidate_signup_intents where company_id=cid;
 delete from public.candidate_accounts where origin_company_id=cid;
 delete from public.company_domains where company_id=cid;
 delete from public.company_portals where company_id=cid;
 delete from public.company_branding_history where company_id=cid;
 delete from public.company_branding where company_id=cid;
 delete from public.company_branding_assets where company_id=cid;
 delete from app_private.company_upload_reservations where company_id=cid;
 delete from app_private.orphan_quarantine where company_id=cid;
 delete from public.company_invitations where company_id=cid;
 delete from public.company_audit_events where company_id=cid;
 delete from public.platform_audit_events where company_id=cid;
 delete from public.company_members where company_id=cid;
 delete from public.companies where id=cid;
 update app_private.company_deletion_jobs set state='accounts',updated_at=now(),error_code=null where id=job;
end;$$;

-- A shared identity or any remaining business FK is a reason to preserve it.
create function app_private.deletion_identity_exclusive(person uuid) returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare r record;linked boolean;
begin
 for r in select n.nspname,c.relname,a.attname from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
 join pg_attribute a on a.attrelid=c.oid and a.attnum=k.conkey[1]
 where k.contype='f' and k.confrelid='auth.users'::regclass and cardinality(k.conkey)=1 and n.nspname in('public','app_private') and c.relname<>'platform_communication_deliveries' loop
  -- The minimal deletion audit keeps its requesting administrator, never a tenant account.
  execute format('select exists(select 1 from %I.%I where %I=$1)',r.nspname,r.relname,r.attname) into linked using person;
  if linked then return false;end if;
 end loop;
 return true;
end;$$;
create function app_private.claim_deletion_identity(job uuid,person uuid) returns boolean language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(person::text,8540));
 perform 1 from auth.users where id=person;
 if not found or not exists(select 1 from app_private.company_deletion_jobs j join app_private.company_deletion_users u on u.job_id=j.id where j.id=job and j.state='accounts' and j.remove_accounts and u.user_id=person and u.state='pending') then return false;end if;
 if not app_private.deletion_identity_exclusive(person) then return false;end if;
 insert into app_private.company_deletion_identity_locks(user_id,job_id) values(person,job) on conflict do nothing;
 return exists(select 1 from app_private.company_deletion_identity_locks where user_id=person and job_id=job);
end;$$;
revoke all on function app_private.claim_deletion_identity(uuid,uuid) from public,anon,authenticated,service_role;
alter function app_private.claim_deletion_identity(uuid,uuid) owner to postgres;
alter table app_private.company_deletion_identity_locks owner to postgres;
revoke all on function app_private.guard_deleting_company(),app_private.deletion_storage_access(text,text),app_private.finish_company_deletion(uuid),app_private.deletion_identity_exclusive(uuid) from public,anon,authenticated,service_role;
-- RLS calls this guard with authenticated execution, but it grants no business access.
grant execute on function app_private.deletion_storage_access(text,text) to authenticated;
alter table app_private.company_deletion_jobs owner to postgres;
alter table app_private.company_deletion_objects owner to postgres;
alter table app_private.company_deletion_users owner to postgres;
alter function public.company_deletion(text,uuid,text,text,boolean) owner to postgres;
alter function app_private.guard_deleting_company() owner to postgres;
alter function app_private.deletion_storage_access(text,text) owner to postgres;
alter function app_private.finish_company_deletion(uuid) owner to postgres;
alter function app_private.deletion_identity_exclusive(uuid) owner to postgres;

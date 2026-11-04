-- migration-role: supabase_admin
-- Private immutable PDF versions. Never part of public branding or company reads.
create table app_private.candidate_documents(
 id uuid primary key,user_id uuid not null references public.candidate_accounts(user_id) on delete cascade,
 session_id uuid not null,path text not null unique,state text not null default 'pending' check(state in ('pending','current','previous')),
 name text,size integer check(size between 1 and 5242880),sha256 text check(sha256~'^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '15 minutes'
);
create unique index candidate_one_current_resume on app_private.candidate_documents(user_id) where state='current';
alter table app_private.candidate_documents enable row level security;
revoke all on app_private.candidate_documents from public,anon,authenticated,service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('candidate-resumes','candidate-resumes',false,5242880,array['application/pdf']);
create function public.candidate_resume(operation text default 'read',asset_id uuid default null,file_name text default null,file_size integer default null,file_sha256 text default null,expected_version bigint default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare context jsonb;r app_private.candidate_documents;v bigint;
begin
 context:=public.candidate_context();if context is null then raise exception 'candidate only' using errcode='42501';end if;
 if operation='reserve' then
  perform 1 from public.candidate_accounts where user_id=auth.uid() for update;
  perform app_private.consume_operation_budget('candidate-resume',auth.uid(),5,3600);
  if asset_id is null then raise exception 'missing asset' using errcode='22023';end if;
  if (select count(*) from app_private.candidate_documents where user_id=auth.uid() and(state<>'pending' or expires_at>now() or exists(select 1 from storage.objects o where o.bucket_id='candidate-resumes' and o.name=candidate_documents.path)))>=20 then raise exception 'resume version quota reached' using errcode='54000';end if;
  insert into app_private.candidate_documents(id,user_id,session_id,path) values(asset_id,auth.uid(),app_private.current_session_id(),auth.uid()::text||'/'||asset_id::text||'.pdf');
  return jsonb_build_object('id',asset_id);
 elsif operation='commit' then
  select version into v from public.candidate_accounts where user_id=auth.uid() for update;
  if expected_version is null or v<>expected_version then raise exception 'profile conflict' using errcode='PT409';end if;
  select * into r from app_private.candidate_documents where id=asset_id and user_id=auth.uid() for update;
  if not found or r.state<>'pending' or r.session_id<>app_private.current_session_id() or r.expires_at<=now()
   or coalesce(length(trim(file_name)),0) not between 1 and 160 or file_name!~*'\.pdf$' or file_size is null or file_size not between 1 and 5242880 or file_sha256 is null or file_sha256!~'^[0-9a-f]{64}$'
   or not exists(select 1 from storage.objects where bucket_id='candidate-resumes' and name=r.path) then raise exception 'invalid resume' using errcode='22023';end if;
  update app_private.candidate_documents set state='previous' where user_id=auth.uid() and state='current';
  update app_private.candidate_documents set state='current',name=file_name,size=file_size,sha256=file_sha256 where id=asset_id;
  update public.candidate_accounts set version=version+1,updated_at=now() where user_id=auth.uid();
 elsif operation not in ('read','download') or operation is null then raise exception 'invalid operation' using errcode='22023';end if;
 select * into r from app_private.candidate_documents where user_id=auth.uid() and state='current';
 if not found then return null;end if;
 return jsonb_build_object('id',r.id,'name',r.name,'size',r.size,'updatedAt',r.created_at,'version',(select version from public.candidate_accounts where user_id=auth.uid()))
  ||case when operation='download' then jsonb_build_object('path',r.path,'sha256',r.sha256) else '{}'::jsonb end;
end;$$;
create function app_private.candidate_document_access(object_name text,writing boolean) returns boolean language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not app_private.identity_session_valid() or public.candidate_context() is null then return false;end if;
 return exists(select 1 from app_private.candidate_documents r where r.path=object_name and r.user_id=auth.uid() and
  (not writing and r.state='current' or writing and r.state='pending' and r.session_id=app_private.current_session_id() and r.expires_at>now()));
end;$$;
create policy "Candidate reads own current resume" on storage.objects for select to authenticated using(bucket_id='candidate-resumes' and app_private.candidate_document_access(name,false));
create policy "Candidate writes reserved resume" on storage.objects for insert to authenticated with check(bucket_id='candidate-resumes' and app_private.candidate_document_access(name,true));
alter table app_private.candidate_documents owner to postgres;
alter function public.candidate_resume(text,uuid,text,integer,text,bigint) owner to postgres;
alter function app_private.candidate_document_access(text,boolean) owner to postgres;
revoke all on function public.candidate_resume(text,uuid,text,integer,text,bigint),app_private.candidate_document_access(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.candidate_resume(text,uuid,text,integer,text,bigint),app_private.candidate_document_access(text,boolean) to authenticated;
notify pgrst,'reload schema';

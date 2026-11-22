-- migration-role: supabase_admin
create table app_private.job_assistant_requests (
 token_hash text primary key, company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null, expires_at timestamptz not null default now()+interval '2 minutes'
);
alter table app_private.job_assistant_requests owner to postgres;
revoke all on app_private.job_assistant_requests from public,anon,authenticated,service_role;
create function public.job_assistant_issue(token_hash text,payload jsonb) returns boolean
language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;
begin
 perform app_private.security_gate();
 select m.company_id into cid from public.company_members m where m.user_id=auth.uid() and app_private.company_role(m.company_id) in ('owner','admin') limit 1;
 if cid is null or public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if token_hash !~ '^[a-f0-9]{64}$' or token_hash is null or payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>100000 then raise exception 'invalid payload' using errcode='22023';end if;
 perform app_private.consume_operation_budget('job-assistant',cid,30,3600);
 delete from app_private.job_assistant_requests where expires_at<now();
 insert into app_private.job_assistant_requests(token_hash,company_id,user_id,payload) values(token_hash,cid,auth.uid(),payload);
 return true;
end;$$;
create function public.job_assistant_consume(request_hash text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare r app_private.job_assistant_requests;
begin
 if request_hash is null or request_hash !~ '^[a-f0-9]{64}$' then raise exception 'denied' using errcode='42501';end if;
 delete from app_private.job_assistant_requests where token_hash=request_hash and expires_at>now() returning * into r;
 if r.token_hash is null or not exists(select 1 from public.company_members m join public.companies c on c.id=m.company_id where m.company_id=r.company_id and m.user_id=r.user_id and m.status='active' and m.role in ('owner','admin') and c.operational_status='active') then raise exception 'denied' using errcode='42501';end if;
 return r.payload;
end;$$;
alter function public.job_assistant_issue(text,jsonb) owner to postgres;
alter function public.job_assistant_consume(text) owner to postgres;
revoke all on function public.job_assistant_issue(text,jsonb),public.job_assistant_consume(text) from public,anon,authenticated,service_role;
grant execute on function public.job_assistant_issue(text,jsonb) to authenticated;
grant execute on function public.job_assistant_consume(text) to anon;
notify pgrst,'reload schema';

-- migration-role: supabase_admin
-- Candidates are identities, never company members or administrators.
create table public.candidate_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(trim(full_name)) between 3 and 120),
 status text not null default 'active' check(status in ('active','inactive')),
 origin_company_id uuid not null references public.companies(id),
 terms_revision text not null,accepted_at timestamptz not null,
 version bigint not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.candidate_accounts enable row level security;
revoke all on public.candidate_accounts from public,anon,authenticated,service_role;
create index candidate_origin_company on public.candidate_accounts(origin_company_id,status);
create table app_private.candidate_signup_intents(
 nonce_hash text primary key,email text not null,full_name text not null,company_id uuid not null references public.companies(id),
 terms_revision text not null,created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '15 minutes',used_at timestamptz,user_id uuid
);
create index candidate_intent_expiration on app_private.candidate_signup_intents(expires_at);
revoke all on app_private.candidate_signup_intents from public,anon,authenticated,service_role;
create function public.create_candidate_signup_intent(email text,full_name text,requested_slug text,terms_revision text,accepted_terms boolean)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;nonce text;
begin
 if accepted_terms is not true or terms_revision is distinct from(public.registration_requirements()->>'termsRevision')
 or length(trim(coalesce(full_name,''))) not between 3 and 120 or length(coalesce(email,''))>254
 or coalesce(email,'')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid candidate details' using errcode='22023';end if;
 select c.id into cid from public.companies c join public.company_portals p on p.company_id=c.id where p.slug=requested_slug and p.is_public and c.operational_status='active';
 if cid is null then raise exception 'page unavailable' using errcode='42501';end if;
 perform app_private.consume_operation_budget('candidate-signup-email',md5(lower(trim(email)))::uuid,3,3600);
 perform app_private.consume_operation_budget('candidate-signup-company',cid,100,3600);
 nonce:=encode(extensions.gen_random_bytes(32),'hex');
 insert into app_private.candidate_signup_intents(nonce_hash,email,full_name,company_id,terms_revision)
 values(encode(extensions.digest(nonce,'sha256'),'hex'),lower(trim(email)),trim(full_name),cid,terms_revision);
 delete from app_private.candidate_signup_intents where nonce_hash in(select i.nonce_hash from app_private.candidate_signup_intents i where i.expires_at<now()-interval '1 day' limit 1000);
 return nonce;
end;$$;
create function app_private.prepare_candidate_signup() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare i app_private.candidate_signup_intents;receipt text;nonce text:=new.raw_user_meta_data->>'candidate_signup_nonce';
begin
 if nonce is null or nonce!~'^[0-9a-f]{64}$' then raise exception 'candidate intent required' using errcode='42501';end if;
 receipt:=encode(extensions.digest(nonce,'sha256'),'hex');
 select * into i from app_private.candidate_signup_intents where nonce_hash=receipt for update;
 if not found or i.used_at is not null or i.expires_at<=now() or i.email is distinct from lower(new.email)
 or not exists(select 1 from public.companies where id=i.company_id and operational_status='active') then raise exception 'candidate intent unavailable' using errcode='42501';end if;
 new.raw_user_meta_data:=jsonb_build_object('account_type','candidate','candidate_signup_receipt',receipt);
 return new;
end;$$;
create trigger on_auth_user_prepare_candidate before insert on auth.users for each row when((new.raw_user_meta_data->>'account_type')='candidate') execute function app_private.prepare_candidate_signup();
create function app_private.create_candidate_account() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare i app_private.candidate_signup_intents;
begin
 select * into i from app_private.candidate_signup_intents where nonce_hash=new.raw_user_meta_data->>'candidate_signup_receipt' for update;
 if not found or i.used_at is not null or i.email is distinct from lower(new.email) or i.expires_at<=now() then raise exception 'candidate intent unavailable' using errcode='42501';end if;
 insert into public.candidate_accounts(user_id,full_name,origin_company_id,terms_revision,accepted_at) values(new.id,i.full_name,i.company_id,i.terms_revision,i.created_at);
 update app_private.candidate_signup_intents set used_at=clock_timestamp(),user_id=new.id where nonce_hash=i.nonce_hash;
 return new;
end;$$;
create trigger on_auth_user_create_candidate after insert on auth.users for each row when((new.raw_user_meta_data->>'account_type')='candidate') execute function app_private.create_candidate_account();
create or replace function app_private.scrub_signup_capability() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 new.raw_user_meta_data:=new.raw_user_meta_data-'company_signup_nonce'-'candidate_signup_nonce';
 if new.raw_user_meta_data->>'account_type'='candidate' then
  new.raw_user_meta_data:=new.raw_user_meta_data-'role'-'company_role'-'company_id'-'platform_admin';
 end if;
 return new;
end;$$;
create function public.candidate_context() returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare answer jsonb;
begin
 perform app_private.security_gate();
 select jsonb_build_object('fullName',a.full_name,'version',a.version,'slug',p.slug) into answer from public.candidate_accounts a join public.company_portals p on p.company_id=a.origin_company_id where a.user_id=auth.uid() and a.status='active';
 return answer;
end;$$;
alter function app_private.communication_recipient(uuid,text,uuid) rename to communication_recipient_before_candidates;
revoke all on function app_private.communication_recipient_before_candidates(uuid,text,uuid) from public,anon,authenticated,service_role;
create function app_private.communication_recipient(person uuid,audience text,company uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select case when audience='candidates' then exists(select 1 from public.candidate_accounts a join auth.users u on u.id=a.user_id join public.companies c on c.id=a.origin_company_id
 where a.user_id=person and a.status='active' and c.operational_status='active' and(company is null or a.origin_company_id=company)
 and u.email_confirmed_at is not null and u.deleted_at is null and(u.banned_until is null or u.banned_until<now()))
 else app_private.communication_recipient_before_candidates(person,audience,company) end;
$$;
alter table public.platform_communications drop constraint platform_communications_audience_check;
alter table public.platform_communications add constraint platform_communications_audience_check check(audience in ('companies','admins','platform_admins','candidates'));
-- Shared own-alert mutation, independent of administrative campaign permissions.
create function public.mark_my_notification(delivery_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform app_private.security_gate();
 perform app_private.consume_operation_budget('own-alert-read',auth.uid(),120,60);
 update public.platform_communication_deliveries d set read_at=coalesce(read_at,now()) from public.platform_communications c
 where d.id=delivery_id and d.user_id=auth.uid() and c.id=d.communication_id and c.channel in ('inapp','both') and app_private.communication_recipient(auth.uid(),c.audience,c.company_id);
 return '{}'::jsonb;
end;$$;
create function public.candidate_account(operation text default 'read',expected_version bigint default null,full_name text default null,delivery_id uuid default null,page_number integer default 1)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare context jsonb;items jsonb;
begin
 context:=public.candidate_context();if context is null then raise exception 'candidate access denied' using errcode='42501';end if;
 if page_number is null or page_number not between 1 and 10000 then raise exception 'invalid page' using errcode='22023';end if;
 if operation='profile' then
  perform app_private.consume_operation_budget('candidate-profile',auth.uid(),20,60);
  if length(trim(coalesce(full_name,''))) not between 3 and 120 then raise exception 'invalid name' using errcode='22023';end if;
  update public.candidate_accounts a set full_name=trim(candidate_account.full_name),version=version+1,updated_at=now() where user_id=auth.uid() and version=expected_version and status='active';
  if not found then raise exception 'profile conflict' using errcode='PT409';end if;
 elsif operation='read-alert' then
  perform public.mark_my_notification(delivery_id);
 elsif operation<>'read' or operation is null then raise exception 'invalid operation' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into items from(select d.id,c.title,c.message,c.link,c.dispatched_at,d.read_at
 from public.platform_communication_deliveries d join public.platform_communications c on c.id=d.communication_id where d.user_id=auth.uid() and c.channel in ('inapp','both') and app_private.communication_recipient(auth.uid(),c.audience,c.company_id) order by c.dispatched_at desc,d.id limit 20 offset(page_number-1)*20)x;
 return jsonb_build_object('profile',public.candidate_context(),'items',items);
end;$$;
alter table public.candidate_accounts owner to postgres;
alter table app_private.candidate_signup_intents owner to postgres;
do $$declare f record;begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
 (n.nspname='public' and p.proname in ('create_candidate_signup_intent','candidate_context','candidate_account','mark_my_notification')) or(n.nspname='app_private' and p.proname in ('prepare_candidate_signup','create_candidate_account','communication_recipient')) loop
 execute format('alter function %s owner to postgres',f.sig);execute format('revoke all on function %s from public,anon,authenticated,service_role',f.sig);
 end loop;
end$$;
grant execute on function public.create_candidate_signup_intent(text,text,text,text,boolean) to anon,authenticated;
grant execute on function public.candidate_context(),public.candidate_account(text,bigint,text,uuid,integer),public.mark_my_notification(uuid) to authenticated;
notify pgrst,'reload schema';

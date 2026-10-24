-- migration-role: supabase_admin
-- Version identifies the existing rendered terms HTML; it does not change it.
create function public.registration_requirements() returns jsonb language sql immutable set search_path=pg_catalog as $$
 select jsonb_build_object('termsRevision','c0b7b190cbcf9cb413749f44263ff27b5e5b864f23156e8a91b3e850e168641b','termsPath','/termos-servico');
$$;
revoke all on function public.registration_requirements() from public;
grant execute on function public.registration_requirements() to anon,authenticated;
create table app_private.company_signup_intents(
 nonce_hash text primary key check(nonce_hash~'^[0-9a-f]{64}$'),email text not null,
 company_name text not null,responsible_name text not null,cnpj text not null,phone text not null,
 terms_revision text not null,created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '15 minutes',used_at timestamptz,user_id uuid
);
create index company_signup_intents_expiration on app_private.company_signup_intents(expires_at);
revoke all on app_private.company_signup_intents from public,anon,authenticated,service_role;
alter table public.companies add column terms_revision text check(terms_revision is null or terms_revision~'^[0-9a-f]{64}$');

create function public.create_company_signup_intent(email text,company_name text,responsible_name text,cnpj text,phone text,terms_revision text,accepted_terms boolean)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare nonce text;document text:=public.registration_requirements()->>'termsRevision';
begin
 if accepted_terms is not true or terms_revision is distinct from document
 or length(trim(coalesce(company_name,''))) not between 2 and 160
 or length(trim(coalesce(responsible_name,''))) not between 3 and 120
 or length(coalesce(email,''))>320 or coalesce(email,'')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or coalesce(cnpj,'')!~'^[0-9]{14}$' or not app_private.valid_cnpj(cnpj)
 or coalesce(phone,'')!~'^[0-9]{10,11}$' then raise exception 'invalid signup details' using errcode='22023';end if;
 nonce:=encode(extensions.gen_random_bytes(32),'hex');
 insert into app_private.company_signup_intents(nonce_hash,email,company_name,responsible_name,cnpj,phone,terms_revision)
 values(encode(extensions.digest(nonce,'sha256'),'hex'),lower(trim(email)),trim(company_name),trim(responsible_name),cnpj,phone,document);
 delete from app_private.company_signup_intents where nonce_hash in(
  select i.nonce_hash from app_private.company_signup_intents i where i.expires_at<now()-interval '1 day' limit 1000);
 return nonce;
end;$$;
revoke all on function public.create_company_signup_intent(text,text,text,text,text,text,boolean) from public;
grant execute on function public.create_company_signup_intent(text,text,text,text,text,text,boolean) to anon,authenticated;

create function app_private.prepare_company_signup() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare intent app_private.company_signup_intents;nonce text:=new.raw_user_meta_data->>'company_signup_nonce';receipt text;
begin
 if nonce is null or nonce!~'^[0-9a-f]{64}$' then raise exception 'signup intent required' using errcode='42501';end if;
 receipt:=encode(extensions.digest(nonce,'sha256'),'hex');
 select * into intent from app_private.company_signup_intents i where i.nonce_hash=receipt for update;
 if not found or intent.used_at is not null or intent.expires_at<=now() or intent.email is distinct from lower(new.email) then
  raise exception 'signup intent unavailable' using errcode='42501';end if;
 -- Persist only the spent receipt reference, never its raw one-use capability.
 new.raw_user_meta_data:=(new.raw_user_meta_data-'company_signup_nonce'-'company_signup_receipt'-'role'-'company_role'-'platform_admin'-'company_id')||
  jsonb_build_object('company_signup_receipt',receipt,'company_name',intent.company_name,'responsible_name',intent.responsible_name,
   'company_cnpj',intent.cnpj,'phone',intent.phone,'plan_id','freemium','plan_status','free','terms_revision',intent.terms_revision,'terms_accepted_at',intent.created_at);
 return new;
end;$$;
create trigger on_auth_user_prepare_company_signup before insert on auth.users for each row
when ((new.raw_user_meta_data->>'account_type')='company_admin') execute function app_private.prepare_company_signup();

create or replace function public.handle_new_company_admin() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare intent app_private.company_signup_intents;cid uuid;
begin
 if coalesce(new.raw_user_meta_data->>'account_type','')<>'company_admin' then return new;end if;
 select * into intent from app_private.company_signup_intents i where i.nonce_hash=new.raw_user_meta_data->>'company_signup_receipt' for update;
 if not found or intent.used_at is not null or intent.expires_at<=now() or intent.email is distinct from lower(new.email) then
  raise exception 'signup intent unavailable' using errcode='42501';end if;
 insert into public.companies(name,cnpj,phone,plan_id,plan_status,terms_accepted_at,terms_revision)
 values(intent.company_name,intent.cnpj,intent.phone,'freemium','free',intent.created_at,intent.terms_revision) returning id into cid;
 insert into public.company_members(company_id,user_id,email,full_name,role,status)
 values(cid,new.id,intent.email,intent.responsible_name,'owner','active');
 update app_private.company_signup_intents set used_at=clock_timestamp(),user_id=new.id where nonce_hash=intent.nonce_hash;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 values(cid,new.id,'company.signup',cid,jsonb_build_object('terms_revision',intent.terms_revision,'terms_accepted_at',intent.created_at,'source','validated_signup_intent'));
 return new;
end;$$;
revoke all on function public.handle_new_company_admin() from public,anon,authenticated,service_role;
alter table app_private.company_signup_intents owner to postgres;
alter function public.registration_requirements() owner to postgres;
alter function public.create_company_signup_intent(text,text,text,text,text,text,boolean) owner to postgres;
alter function public.handle_new_company_admin() owner to postgres;
revoke all on function app_private.prepare_company_signup() from public,anon,authenticated,service_role;
alter function app_private.prepare_company_signup() owner to postgres;

-- GoTrue may update its in-memory metadata after INSERT. Never retain the raw
-- signup capability in those later writes, including administrator API writes.
create function app_private.scrub_signup_capability() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
 new.raw_user_meta_data:=new.raw_user_meta_data-'company_signup_nonce';
 return new;
end;$$;
create trigger on_auth_user_scrub_signup_capability before update of raw_user_meta_data on auth.users
for each row execute function app_private.scrub_signup_capability();
revoke all on function app_private.scrub_signup_capability() from public,anon,authenticated,service_role;
alter function app_private.scrub_signup_capability() owner to postgres;

-- CI-only provider contract, not an Auth/Storage HTTP emulator.
-- Real PostgreSQL executes migrations, grants, RLS, RPC and tenant tests.
-- Provider HTTP integration must additionally pass against isolated Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin login superuser;
create schema auth;
create schema storage;
create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema auth,storage,extensions to anon,authenticated,service_role;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
create table auth.users(id uuid primary key,email text,role text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz,raw_user_meta_data jsonb default '{}');
alter table auth.users add column encrypted_password text,add column is_sso_user boolean default false,
 add column email_change text,add column email_change_token_new text,add column email_change_token_current text,
 add column email_change_sent_at timestamptz,add column email_change_confirm_status smallint default 0,
 add column confirmation_token text,add column recovery_token text,add column recovery_sent_at timestamptz,add column updated_at timestamptz;
create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),provider text,identity_data jsonb,
 email text generated always as (lower(identity_data->>'email')) stored,updated_at timestamptz);
create table auth.refresh_tokens(id bigserial primary key,user_id varchar);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz,updated_at timestamptz,refreshed_at timestamp,aal text,not_after timestamptz);
create table auth.mfa_amr_claims(id uuid primary key,session_id uuid references auth.sessions(id),authentication_method text,created_at timestamptz,updated_at timestamptz);
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users(id),status text,factor_type text,created_at timestamptz,updated_at timestamptz);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,created_at timestamptz default now(),unique(bucket_id,name));
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;

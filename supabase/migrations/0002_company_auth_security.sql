alter table public.companies
  alter column plan_id set default 'freemium',
  alter column plan_status set default 'free';

alter table public.companies
  add column if not exists terms_accepted_at timestamptz;

create or replace function public.handle_new_company_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_company_id uuid;
  company_name text;
  responsible_name text;
  terms_accepted_at timestamptz;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') <> 'company_admin' then
    return new;
  end if;

  company_name := left(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), 160);
  responsible_name := left(trim(coalesce(new.raw_user_meta_data ->> 'responsible_name', '')), 120);
  terms_accepted_at := nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz;

  if company_name = '' or new.email is null or terms_accepted_at is null then
    raise exception 'Company account requires a company name, email, and terms acceptance';
  end if;

  insert into public.companies (name, cnpj, phone, plan_id, plan_status, terms_accepted_at)
  values (
    company_name,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'company_cnpj', ''), '\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), ''),
    'freemium',
    'free',
    terms_accepted_at
  )
  returning id into created_company_id;

  insert into public.company_members (company_id, user_id, email, full_name, role, status)
  values (
    created_company_id,
    new.id,
    lower(new.email),
    coalesce(nullif(responsible_name, ''), lower(new.email)),
    'owner',
    'active'
  );

  return new;
end;
$$;

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.company_members as member
    where member.company_id = target_company_id
      and member.user_id = auth.uid()
      and member.status = 'active'
  );
$$;

revoke all on function app_private.is_company_member(uuid) from public, anon;
grant execute on function app_private.is_company_member(uuid) to authenticated;

drop policy if exists "Company members can read own companies" on public.companies;
drop policy if exists "Owners and admins can update own company" on public.companies;
drop policy if exists "Company members can read colleagues" on public.company_members;
drop policy if exists "Owners and admins can manage members" on public.company_members;

create policy "Active members can read their company"
on public.companies for select to authenticated
using (app_private.is_company_member(id));

create policy "Active members can read their organization roster"
on public.company_members for select to authenticated
using (app_private.is_company_member(company_id));

revoke all on public.companies, public.company_members from anon, authenticated;
grant select on public.companies, public.company_members to authenticated;

-- The free signup trigger is the only account-creation path. Client roles cannot
-- insert, delete, or promote members until an explicit team-management flow exists.
revoke all on function public.handle_new_company_admin() from public, anon, authenticated;

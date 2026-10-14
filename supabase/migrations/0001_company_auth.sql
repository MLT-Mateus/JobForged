create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  phone text,
  plan_id text not null default 'free',
  plan_status text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'owner',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_touch_updated_at on public.companies;
create trigger companies_touch_updated_at
before update on public.companies
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_company_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_company_id uuid;
begin
  insert into public.companies (name, cnpj, phone, plan_id, plan_status)
  values (
    coalesce(new.raw_user_meta_data ->> 'company_name', 'Empresa Free'),
    new.raw_user_meta_data ->> 'company_cnpj',
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'plan_id', 'free'),
    coalesce(new.raw_user_meta_data ->> 'plan_status', 'free')
  )
  returning id into created_company_id;

  insert into public.company_members (company_id, user_id, email, full_name, role)
  values (
    created_company_id,
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'responsible_name', new.email),
    'owner'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_company_admin on auth.users;
create trigger on_auth_user_created_company_admin
after insert on auth.users
for each row
when ((new.raw_user_meta_data ->> 'account_type') = 'company_admin')
execute function public.handle_new_company_admin();

create policy "Company members can read own companies"
on public.companies for select
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = companies.id and m.user_id = auth.uid()
  )
);

create policy "Owners and admins can update own company"
on public.companies for update
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = companies.id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.company_members m
    where m.company_id = companies.id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  )
);

create policy "Company members can read colleagues"
on public.company_members for select
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = company_members.company_id and m.user_id = auth.uid()
  )
);

create policy "Owners and admins can manage members"
on public.company_members for all
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = company_members.company_id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.company_members m
    where m.company_id = company_members.company_id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  )
);

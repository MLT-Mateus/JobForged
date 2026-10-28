-- An absent membership must be represented as an explicit denial value.
-- SQL NULL would make `role NOT IN (...)` unknown and skip PL/pgSQL IF guards.
create or replace function app_private.company_role(target_company_id uuid)
returns text language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce((
    select role from public.company_members
    where company_id = target_company_id and user_id = auth.uid() and status = 'active'
    limit 1
  ), '');
$$;

revoke all on function app_private.company_role(uuid) from public, anon;
grant execute on function app_private.company_role(uuid) to authenticated;

-- The current app has one active company context per authenticated account.
-- Keep membership unambiguous until explicit company switching is implemented.
create unique index company_members_one_active_company_per_user
  on public.company_members(user_id)
  where status = 'active';

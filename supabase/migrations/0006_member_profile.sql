-- An authenticated member may update only their own display name.
create or replace function public.update_my_member_profile(new_full_name text)
returns public.company_members language plpgsql security definer set search_path = pg_catalog, public as $$
declare result public.company_members;
begin
  if auth.uid() is null or length(trim(coalesce(new_full_name, ''))) < 3
    or length(trim(new_full_name)) > 120 then
    raise exception 'invalid profile' using errcode = '22023';
  end if;
  update public.company_members set full_name = trim(new_full_name)
    where user_id = auth.uid() and status = 'active'
    returning * into result;
  if not found then raise exception 'not authorized' using errcode = '42501'; end if;
  insert into public.company_audit_events(company_id, actor_user_id, action, target_id)
    values(result.company_id, auth.uid(), 'member.profile_updated', result.id);
  return result;
end;
$$;
revoke all on function public.update_my_member_profile(text) from public, anon;
grant execute on function public.update_my_member_profile(text) to authenticated;

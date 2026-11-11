-- migration-role: supabase_admin
create function app_private.sync_confirmed_member_email() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 update public.company_members
 set email=lower(new.email)
 where user_id=new.id;
 return new;
end;
$$;
alter function app_private.sync_confirmed_member_email() owner to postgres;
revoke all on function app_private.sync_confirmed_member_email() from public,anon,authenticated,service_role;
create trigger sync_confirmed_member_email
after update of email on auth.users
for each row when (old.email is distinct from new.email and new.email is not null and new.email_confirmed_at is not null)
execute function app_private.sync_confirmed_member_email();

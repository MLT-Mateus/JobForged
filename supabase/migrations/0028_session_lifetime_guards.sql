-- migration-role: supabase_admin
-- GoTrue enforces these limits on refresh. Business data also checks them on
-- every request, rather than waiting for an already issued JWT to expire.
create or replace function app_private.identity_session_valid() returns boolean language sql stable security definer
set search_path=pg_catalog as $$
 select exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
 where u.id=auth.uid() and s.id=app_private.current_session_id()
 and u.email_confirmed_at is not null and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=now())
 and (s.not_after is null or s.not_after>now())
 and s.created_at>now()-interval '30 days'
 and coalesce(s.refreshed_at at time zone 'UTC',s.created_at)>now()-interval '24 hours'
 and not exists(select 1 from app_private.session_revocations r where r.session_id=s.id));
$$;
alter function app_private.identity_session_valid() owner to postgres;

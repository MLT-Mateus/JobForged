-- Front 2: company administration, auditable membership and isolated platform access.
create table public.company_audit_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id),
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index company_invitations_active_email
  on public.company_invitations(company_id, lower(email))
  where accepted_at is null and revoked_at is null;

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role = 'platform_admin'),
  created_at timestamptz not null default now()
);

alter table public.company_audit_events enable row level security;
alter table public.company_invitations enable row level security;
alter table public.platform_admins enable row level security;
revoke all on public.company_audit_events, public.company_invitations, public.platform_admins from public, anon, authenticated;

create or replace function app_private.audit_new_company_member()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.company_audit_events(company_id, actor_user_id, action, target_id)
    values(new.company_id, new.user_id, case when new.role = 'owner' then 'company.created' else 'member.added' end, new.id);
  return new;
end;
$$;
create trigger audit_new_company_member after insert on public.company_members
  for each row execute function app_private.audit_new_company_member();
revoke all on function app_private.audit_new_company_member() from public, anon, authenticated;

create or replace function app_private.company_role(target_company_id uuid)
returns text language sql stable security definer set search_path = pg_catalog, public as $$
  select role from public.company_members
  where company_id = target_company_id and user_id = auth.uid() and status = 'active'
  limit 1;
$$;
revoke all on function app_private.company_role(uuid) from public, anon;
grant execute on function app_private.company_role(uuid) to authenticated;

create policy "Active members read company audit"
on public.company_audit_events for select to authenticated
using (app_private.company_role(company_id) in ('owner', 'admin'));
grant select on public.company_audit_events to authenticated;

create or replace function public.update_company_profile(target_company_id uuid, new_name text, new_cnpj text, new_phone text)
returns public.companies language plpgsql security definer set search_path = pg_catalog, public as $$
declare result public.companies;
begin
  if app_private.company_role(target_company_id) not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(new_name, ''))) < 2 or length(new_name) > 160
    or (new_cnpj is not null and new_cnpj !~ '^[0-9]{14}$')
    or (new_phone is not null and (new_phone !~ '^[0-9]{10,13}$')) then
    raise exception 'invalid company profile' using errcode = '22023';
  end if;
  update public.companies set name = trim(new_name), cnpj = new_cnpj, phone = new_phone
    where id = target_company_id returning * into result;
  insert into public.company_audit_events(company_id, actor_user_id, action, target_id)
    values(target_company_id, auth.uid(), 'company.updated', target_company_id);
  return result;
end;
$$;

create or replace function public.create_company_invitation(target_company_id uuid, invite_email text, invite_role text)
returns table(invitation_id uuid, invitation_token text) language plpgsql security definer set search_path = pg_catalog, public as $$
declare token text;
begin
  if app_private.company_role(target_company_id) not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if invite_role not in ('admin', 'member') or length(invite_email) > 254
    or trim(invite_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid invitation' using errcode = '22023';
  end if;
  if exists(select 1 from public.company_members m where m.company_id = target_company_id and lower(m.email) = lower(trim(invite_email)) and m.status = 'active') then
    raise exception 'already a member' using errcode = '23505';
  end if;
  update public.company_invitations set revoked_at = now()
    where company_id = target_company_id and lower(email) = lower(trim(invite_email))
      and accepted_at is null and revoked_at is null;
  token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.company_invitations(company_id, email, role, token_hash, invited_by, expires_at)
    values(target_company_id, lower(trim(invite_email)), invite_role, encode(extensions.digest(token, 'sha256'), 'hex'), auth.uid(), now() + interval '24 hours')
    returning id into invitation_id;
  invitation_token := token;
  insert into public.company_audit_events(company_id, actor_user_id, action, target_id)
    values(target_company_id, auth.uid(), 'member.invited', invitation_id);
  return next;
end;
$$;

create or replace function public.revoke_company_invitation(target_company_id uuid, target_invitation_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if app_private.company_role(target_company_id) not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.company_invitations set revoked_at = now()
    where id = target_invitation_id and company_id = target_company_id and accepted_at is null and revoked_at is null;
  if not found then raise exception 'invitation unavailable' using errcode = '22023'; end if;
  insert into public.company_audit_events(company_id, actor_user_id, action, target_id)
    values(target_company_id, auth.uid(), 'member.invitation_revoked', target_invitation_id);
end;
$$;

create or replace function public.accept_company_invitation(invitation_token text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth as $$
declare invitation public.company_invitations; verified_email text;
begin
  if auth.uid() is null or invitation_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid invitation' using errcode = '22023';
  end if;
  select lower(email) into verified_email from auth.users
    where id = auth.uid() and email_confirmed_at is not null;
  if verified_email is null then raise exception 'verified email required' using errcode = '42501'; end if;
  select * into invitation from public.company_invitations
    where token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex') for update;
  if not found or invitation.accepted_at is not null or invitation.revoked_at is not null
    or invitation.expires_at <= now() or invitation.email <> verified_email then
    raise exception 'invitation unavailable' using errcode = '22023';
  end if;
  insert into public.company_members(company_id, user_id, email, full_name, role, status)
    values(invitation.company_id, auth.uid(), verified_email, verified_email, invitation.role, 'active')
    on conflict (company_id, user_id) do update set status = 'active', role = excluded.role, email = excluded.email;
  update public.company_invitations set accepted_at = now() where id = invitation.id;
  insert into public.company_audit_events(company_id, actor_user_id, action, target_id)
    values(invitation.company_id, auth.uid(), 'member.invitation_accepted', invitation.id);
  return invitation.company_id;
end;
$$;

create or replace function public.company_invitation_matches(invitation_token text, invite_email text)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(invitation_token ~ '^[0-9a-f]{64}$' and exists(
    select 1 from public.company_invitations
    where token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
      and email = lower(trim(invite_email)) and accepted_at is null and revoked_at is null and expires_at > now()
  ), false);
$$;
revoke all on function public.company_invitation_matches(text,text) from public;
grant execute on function public.company_invitation_matches(text,text) to anon, authenticated;

create or replace function public.update_company_member(target_company_id uuid, target_member_id uuid, new_role text, new_status text)
returns public.company_members language plpgsql security definer set search_path = pg_catalog, public as $$
declare result public.company_members; actor_role text;
begin
  actor_role := app_private.company_role(target_company_id);
  if actor_role not in ('owner', 'admin') then raise exception 'not authorized' using errcode = '42501'; end if;
  if new_role not in ('owner', 'admin', 'member') or new_status not in ('active', 'inactive') then
    raise exception 'invalid member update' using errcode = '22023';
  end if;
  select * into result from public.company_members where id = target_member_id and company_id = target_company_id for update;
  if not found or (result.role = 'owner' and actor_role <> 'owner')
    or (new_role = 'owner' and actor_role <> 'owner')
    or (result.user_id = auth.uid() and new_status <> 'active') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if result.role = 'owner' and (new_role <> 'owner' or new_status <> 'active')
    and not exists(select 1 from public.company_members where company_id = target_company_id and id <> target_member_id and role = 'owner' and status = 'active') then
    raise exception 'last owner cannot be removed' using errcode = '42501';
  end if;
  update public.company_members set role = new_role, status = new_status where id = target_member_id returning * into result;
  insert into public.company_audit_events(company_id, actor_user_id, action, target_id, details)
    values(target_company_id, auth.uid(), 'member.updated', target_member_id,
      jsonb_build_object('role', new_role, 'status', new_status));
  return result;
end;
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = pg_catalog, public, auth as $$
  select exists(select 1 from public.platform_admins p join auth.users u on u.id = p.user_id
    where p.user_id = auth.uid() and p.email = lower(u.email) and u.email_confirmed_at is not null and p.role = 'platform_admin');
$$;

create or replace function public.platform_overview()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, auth as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select jsonb_build_object('companies', (select count(*) from public.companies),
    'members', (select count(*) from public.company_members),
    'recentCompanies', coalesce((select jsonb_agg(x) from
      (select id, name, plan_id, plan_status, created_at from public.companies order by created_at desc limit 20) x), '[]'::jsonb)) into result;
  return result;
end;
$$;

revoke all on function public.update_company_profile(uuid,text,text,text), public.create_company_invitation(uuid,text,text),
  public.revoke_company_invitation(uuid,uuid), public.accept_company_invitation(text),
  public.update_company_member(uuid,uuid,text,text), public.platform_overview(), public.is_platform_admin() from public, anon;
grant execute on function public.update_company_profile(uuid,text,text,text), public.create_company_invitation(uuid,text,text),
  public.revoke_company_invitation(uuid,uuid), public.accept_company_invitation(text),
  public.update_company_member(uuid,uuid,text,text), public.platform_overview(), public.is_platform_admin() to authenticated;

-- migration-role: supabase_admin
-- The same self-service credential policy applies to authenticated candidates.
grant select on public.candidate_accounts to jbfd_login_email_writer;
create or replace function public.change_my_login_email(new_email text,current_password text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare person auth.users; address text:=lower(trim(new_email));
begin
 if not app_private.identity_session_valid() or exists(select 1 from public.platform_admins where user_id=auth.uid())
 or not (exists(select 1 from public.company_members m join public.companies c on c.id=m.company_id where m.user_id=auth.uid() and m.status='active' and c.operational_status='active') or exists(select 1 from public.candidate_accounts where user_id=auth.uid() and status='active')) then
  raise exception 'Account unavailable' using errcode='42501';
 end if;
 if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or current_password is null or octet_length(current_password) not between 1 and 72 then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 select * into person from auth.users where id=auth.uid() for update;
 if person.is_sso_user or person.encrypted_password is null or person.encrypted_password='' then
  raise exception 'Password account required' using errcode='42501';
 end if;
 if exists(select 1 from auth.mfa_factors where user_id=person.id and status='verified') and coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception 'MFA required' using errcode='42501';
 end if;
 if extensions.crypt(current_password,person.encrypted_password) is distinct from person.encrypted_password then
  raise exception 'Current password does not match' using errcode='PT401';
 end if;
 if address=lower(person.email) then raise exception 'Email unchanged' using errcode='22023';end if;
 -- Serialize address claims, including concurrent changes by different users.
 perform pg_advisory_xact_lock(hashtextextended('login-email:'||address,0));
 if exists(select 1 from auth.users where id<>person.id and lower(email)=address)
 or exists(select 1 from auth.identities where user_id<>person.id and email=address) then
  raise exception 'Email already registered' using errcode='23505';
 end if;
 if not exists(select 1 from auth.identities where user_id=person.id and provider='email') then
  raise exception 'Email identity unavailable' using errcode='42501';
 end if;
 update auth.users set email=address,email_confirmed_at=coalesce(email_confirmed_at,now()),
  email_change='',email_change_token_new='',email_change_token_current='',email_change_sent_at=null,email_change_confirm_status=0,
  confirmation_token='',recovery_token='',recovery_sent_at=null,
  raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('email',address),updated_at=now()
 where id=person.id;
 update auth.identities set identity_data=identity_data||jsonb_build_object('email',address),updated_at=now()
 where user_id=person.id and provider='email';
 -- Existing sync_confirmed_member_email trigger updates member projections
 -- within this transaction under its original, restricted owner.
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 select company_id,person.id,'member.email_changed',id,jsonb_build_object('authorization','current_password') from public.company_members where user_id=person.id;
 insert into app_private.session_revocations(session_id,user_id)
 select id,person.id from auth.sessions where user_id=person.id on conflict(session_id) do nothing;
 delete from auth.refresh_tokens where user_id=person.id::text;
 delete from auth.sessions where user_id=person.id;
 return jsonb_build_object('email',address);
end;$$;
alter function public.change_my_login_email(text,text) owner to jbfd_login_email_writer;

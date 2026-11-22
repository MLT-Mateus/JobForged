-- migration-role: supabase_admin
create function public.my_invitation_context(invitation_token text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare invitation public.company_invitations; company_name text; verified_email text;
begin
 perform app_private.security_gate();
 select lower(u.email) into verified_email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null;
 if verified_email is null or invitation_token !~ '^[0-9a-f]{64}$' then return null;end if;
 select i.* into invitation from public.company_invitations i where i.token_hash=encode(extensions.digest(invitation_token,'sha256'),'hex') and i.email=verified_email;
 if not found then return null;end if;
 select c.name into company_name from public.companies c where c.id=invitation.company_id and c.operational_status='active';
 if company_name is null then return null;end if;
 return jsonb_build_object('company',company_name,'role',invitation.role,'expiresAt',invitation.expires_at,'status',case when invitation.accepted_at is not null then 'accepted' when invitation.revoked_at is not null then 'revoked' when invitation.expires_at<=now() then 'expired' else 'pending' end);
end;$$;
alter function public.my_invitation_context(text) owner to postgres;
revoke all on function public.my_invitation_context(text) from public,anon,authenticated,service_role;
grant execute on function public.my_invitation_context(text) to authenticated;
notify pgrst,'reload schema';

-- migration-role: supabase_admin
-- Report the same freshness requirement enforced by sensitive operations.
-- This is a read contract only; enrollment, MFA gates and privileges are unchanged.
create or replace function public.security_status() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare recent boolean:=false;expires timestamptz;remaining integer:=0;
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 begin
  perform app_private.require_admin_factor(true);
  recent:=true;
 exception when insufficient_privilege then recent:=false;
 end;
 if recent then
  select max(greatest(a.created_at,a.updated_at))+make_interval(secs=>s.step_up_seconds)
  into expires
  from auth.mfa_amr_claims a cross join app_private.security_settings s
  where s.singleton and a.session_id=app_private.current_session_id()
   and a.authentication_method in ('totp','mfa/totp','mfa/phone','phone','webauthn','mfa/webauthn')
  group by s.step_up_seconds;
  remaining:=greatest(0,floor(extract(epoch from expires-now()))::integer);
 end if;
 return jsonb_build_object(
  'mfaEnforced',(select admin_mfa_enforced from app_private.security_settings where singleton),
  'aal',coalesce(auth.jwt()->>'aal','aal1'),
  'verifiedFactors',(select count(*) from auth.mfa_factors where user_id=auth.uid() and status='verified'),
  'recentMfa',recent,'verificationRemainingSeconds',remaining);
end;$$;
alter function public.security_status() owner to postgres;
revoke all on function public.security_status() from public,anon;
grant execute on function public.security_status() to authenticated;
notify pgrst,'reload schema';

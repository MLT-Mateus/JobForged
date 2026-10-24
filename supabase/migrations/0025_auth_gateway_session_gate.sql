-- migration-role: supabase_admin
-- Deny-only check before forwarding protected Auth endpoints. The provider
-- still verifies the original JWT signature, issuer, audience and expiry.
create function app_private.gateway_session_active(person uuid,session uuid,claimed_aal text,sensitive boolean)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
begin
 if person is null or session is null then return false;end if;
 perform set_config('request.jwt.claim.sub',person::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',person,'session_id',session,'aal',claimed_aal,'role','authenticated')::text,true);
 if not app_private.identity_session_valid() then return false;end if;
 if sensitive and public.is_platform_admin() then perform app_private.require_admin_factor();end if;
 return true;
exception when insufficient_privilege then return false;
end;$$;
alter function app_private.gateway_session_active(uuid,uuid,text,boolean) owner to postgres;
revoke all on function app_private.gateway_session_active(uuid,uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function app_private.gateway_session_active(uuid,uuid,text,boolean) to jbfd_security_gateway;

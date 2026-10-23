-- migration-role: supabase_admin
-- Recovery capabilities are one-use, short-lived, and bound to the verified
-- Auth session. GoTrue implicit verification records its mailbox proof as OTP.
create function public.begin_password_recovery(purpose text) returns text
language plpgsql security definer set search_path=pg_catalog as $$
declare nonce text;
begin
 if not app_private.identity_session_valid() or purpose is null or purpose not in ('recovery','invite')
 or not exists(select 1 from auth.mfa_amr_claims a where a.session_id=app_private.current_session_id()
  and a.authentication_method in ('otp','recovery','invite')
  and greatest(a.created_at,a.updated_at)>now()-interval '15 minutes') then
  raise exception 'verified recovery session required' using errcode='42501';end if;
 -- Serialize issuance and consumption for this session.
 perform pg_advisory_xact_lock(hashtextextended(app_private.current_session_id()::text,18));
 if exists(select 1 from app_private.recovery_intents r where r.session_id=app_private.current_session_id() and r.used_at is not null) then raise exception 'recovery already used' using errcode='42501';end if;
 delete from app_private.recovery_intents r where r.user_id=auth.uid() and r.session_id=app_private.current_session_id();
 nonce:=encode(extensions.gen_random_bytes(32),'hex');
 insert into app_private.recovery_intents(nonce_hash,user_id,session_id,purpose,expires_at)
 values(encode(extensions.digest(nonce,'sha256'),'hex'),auth.uid(),app_private.current_session_id(),purpose,now()+interval '15 minutes');
 return nonce;
end;$$;
create function public.consume_password_recovery(nonce text) returns boolean
language plpgsql security definer set search_path=pg_catalog as $$
declare consumed text;
begin
 if not app_private.identity_session_valid() or nonce is null or nonce !~ '^[0-9a-f]{64}$' then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(app_private.current_session_id()::text,18));
 update app_private.recovery_intents r set used_at=now()
 where r.nonce_hash=encode(extensions.digest(nonce,'sha256'),'hex') and r.user_id=auth.uid()
 and r.session_id=app_private.current_session_id() and r.used_at is null and r.expires_at>now()
 returning nonce_hash into consumed;
 return consumed is not null;
end;$$;
revoke all on function public.begin_password_recovery(text),public.consume_password_recovery(text) from public,anon;
grant execute on function public.begin_password_recovery(text),public.consume_password_recovery(text) to authenticated;

-- Fixed projections: a newly-added table column cannot silently enter RPC output.
drop function public.update_company_profile(uuid,text,text,text);
create function public.update_company_profile(target_company_id uuid,new_name text,new_cnpj text,new_phone text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare c public.companies;
begin
 perform app_private.security_gate();
 c:=app_private.security_legacy_update_company_profile(target_company_id,new_name,new_cnpj,new_phone);
 return jsonb_build_object('id',c.id,'name',c.name,'cnpj',c.cnpj,'phone',c.phone,
 'plan_id',c.plan_id,'plan_status',c.plan_status,'operational_status',c.operational_status,'created_at',c.created_at,'updated_at',c.updated_at);
end;$$;
drop function public.update_company_member(uuid,uuid,text,text);
create function public.update_company_member(target_company_id uuid,target_member_id uuid,new_role text,new_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare m public.company_members;
begin
 perform app_private.security_gate();
 m:=app_private.security_legacy_update_company_member(target_company_id,target_member_id,new_role,new_status);
 return jsonb_build_object('id',m.id,'user_id',m.user_id,'company_id',m.company_id,'email',m.email,
 'full_name',m.full_name,'role',m.role,'status',m.status,'created_at',m.created_at);
end;$$;
revoke all on function public.update_company_profile(uuid,text,text,text),public.update_company_member(uuid,uuid,text,text) from public,anon;
grant execute on function public.update_company_profile(uuid,text,text,text),public.update_company_member(uuid,uuid,text,text) to authenticated;

-- Remove unbounded row projection from the existing, still-private read routine.
do $$declare source text;
begin
 select pg_get_functiondef('app_private.security_legacy_platform_read(text,text,text,integer,uuid)'::regprocedure) into source;
 source:=replace(source,'to_jsonb(c)', 'jsonb_build_object(''id'',c.id,''name'',c.name,''cnpj'',c.cnpj,''phone'',c.phone,''plan_id'',c.plan_id,''plan_status'',c.plan_status,''operational_status'',c.operational_status,''created_at'',c.created_at,''updated_at'',c.updated_at,''terms_accepted_at'',c.terms_accepted_at)');
 execute source;
end;$$;

-- Keep application SECURITY DEFINER routines owned by the non-superuser
-- postgres role even when a privileged migration operator sets default ACLs.
do $$declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','app_private') and pg_get_userbyid(p.proowner)='supabase_admin' loop
 execute format('alter function %s owner to postgres',r.signature);end loop;
end;$$;

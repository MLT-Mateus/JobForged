-- migration-role: supabase_admin
-- Transactional budgets cannot be bypassed by direct RPC or process restarts.
create function app_private.consume_operation_budget(category text,scope_id uuid,maximum integer,seconds integer)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare bucket timestamptz;total integer;
begin
 if scope_id is null or maximum<1 or seconds<1 then raise exception 'invalid budget';end if;
 bucket:=to_timestamp(floor(extract(epoch from clock_timestamp())/seconds)*seconds);
 insert into app_private.request_limits(scope,window_start,hits) values(category||':'||scope_id,bucket,1)
 on conflict(scope,window_start) do update set hits=least(app_private.request_limits.hits+1,maximum+1)
 returning hits into total;
 if total>maximum then raise exception 'Limite temporário atingido. Tente novamente mais tarde.' using errcode='PT429';end if;
end;$$;
create or replace function public.create_company_invitation(target_company_id uuid,invite_email text,invite_role text)
returns table(invitation_id uuid,invitation_token text) language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform app_private.security_gate();
 if app_private.company_role(target_company_id) not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 perform app_private.consume_operation_budget('company-invitation',target_company_id,10,3600);
 return query select * from app_private.security_legacy_create_company_invitation(target_company_id,invite_email,invite_role);
end;$$;
create or replace function public.platform_manage(operation text,target_company uuid,target_record uuid,values_json jsonb,change_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform app_private.security_gate(true);
 if operation in ('invitation.create','invitation.resend') then
  perform app_private.consume_operation_budget('company-invitation',target_company,10,3600);
 end if;
 return app_private.security_legacy_platform_manage(operation,target_company,target_record,values_json,change_reason);
end;$$;
create function public.begin_platform_image_upload() returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 perform app_private.security_gate(true);
 perform app_private.consume_operation_budget('platform-image',auth.uid(),10,60);
end;$$;
revoke all on function public.begin_platform_image_upload() from public,anon,service_role;
grant execute on function public.begin_platform_image_upload() to authenticated;
revoke all on function app_private.consume_operation_budget(text,uuid,integer,integer) from public,anon,authenticated,service_role;
alter function app_private.consume_operation_budget(text,uuid,integer,integer) owner to postgres;
alter function public.create_company_invitation(uuid,text,text) owner to postgres;
alter function public.platform_manage(text,uuid,uuid,jsonb,text) owner to postgres;
alter function public.begin_platform_image_upload() owner to postgres;

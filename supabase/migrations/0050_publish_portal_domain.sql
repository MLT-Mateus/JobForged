-- migration-role: supabase_admin
create function public.publish_portal_with_domain(
 expected_version bigint, branding_version bigint, configuration jsonb,
 domain_version bigint, hostname text, kind text, zone text
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; previous public.company_domains; result jsonb;
begin
 perform app_private.security_gate();
 cid:=app_private.branding_company();
 perform 1 from public.companies where id=cid for update;
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then
  raise exception 'not authorized' using errcode='42501';
 end if;
 select * into previous from public.company_domains where company_id=cid for update;
 if previous.version is distinct from domain_version or previous.status is distinct from 'active' or previous.hostname=hostname then
  raise exception 'domain changed' using errcode='PT409';
 end if;
 result:=public.write_company_portal('save',expected_version,null,branding_version,configuration);
 perform public.company_domain_with_preferences('register',hostname,domain_version,kind,zone);
 -- The candidate DNS was tested against this proof. The reconciler independently validates
 -- ownership, routing and TLS before making the replacement available.
 update public.company_domains set verification_token=previous.verification_token where company_id=cid;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 values(cid,auth.uid(),'portal.domain_version',cid,jsonb_build_object('version',result->'brandingVersion','previous',previous.hostname,'hostname',hostname));
 return result;
end;$$;
revoke all on function public.publish_portal_with_domain(bigint,bigint,jsonb,bigint,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.publish_portal_with_domain(bigint,bigint,jsonb,bigint,text,text,text) to authenticated;
notify pgrst,'reload schema';

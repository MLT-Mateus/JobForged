-- migration-role: supabase_admin
-- Release failed processing capacity without deleting the durable rate-limit receipt.
create function public.release_company_image(asset_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid:=app_private.branding_company();
begin
 perform app_private.security_gate();
 if asset_id is null or coalesce(app_private.company_role(cid),'') not in ('owner','admin') then
  raise exception 'not authorized' using errcode='42501';end if;
 perform 1 from public.companies where id=cid for update;
 update app_private.company_upload_reservations r set expires_at=least(r.expires_at,now())
 where r.asset_id=release_company_image.asset_id and r.company_id=cid
 and r.user_id=auth.uid() and r.session_id=app_private.current_session_id();
 -- Objects, registered assets and history are deliberately untouched.
end;$$;
revoke all on function public.release_company_image(uuid) from public,anon;
grant execute on function public.release_company_image(uuid) to authenticated;
alter function public.release_company_image(uuid) owner to postgres;

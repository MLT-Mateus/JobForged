-- migration-role: supabase_admin
-- Additive compatibility phase. Deploy these consumers before revoking table
-- grants in the security phase. Existing functions and grants stay available.
create function public.session_context_v1() returns jsonb language sql stable security definer
set search_path=pg_catalog as $$
 select jsonb_build_object('id',m.id,'company_id',m.company_id,'role',m.role,'full_name',m.full_name,
 'companies',jsonb_build_object('id',c.id,'name',c.name))
 from public.company_members m join public.companies c on c.id=m.company_id join auth.users u on u.id=m.user_id
 where m.user_id=auth.uid() and m.status='active' and app_private.is_company_member(c.id)
 and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) limit 1;
$$;
create function public.company_read_v1() returns jsonb language plpgsql stable security definer
set search_path=pg_catalog as $$
declare cid uuid; actor_role text;
begin
 cid:=(public.session_context_v1()->>'company_id')::uuid;
 actor_role:=app_private.company_role(cid);
 if actor_role='' or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 return jsonb_build_object('role',actor_role,'company',(select jsonb_build_object(
  'id',c.id,'name',c.name,'cnpj',c.cnpj,'phone',c.phone,'plan_id',c.plan_id,'plan_status',c.plan_status,'created_at',c.created_at)
  from public.companies c where c.id=cid),
 'members',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',m.id,'full_name',m.full_name,'role',m.role,
  'email',case when actor_role in ('owner','admin') then m.email end,
  'status',case when actor_role in ('owner','admin') then m.status end,'created_at',m.created_at)) order by m.created_at),'[]')
  from public.company_members m where m.company_id=cid and (actor_role in ('owner','admin') or m.status='active')),
 'audit',case when actor_role in ('owner','admin') then
  (select coalesce(jsonb_agg(x),'[]') from (select id,action,target_id,details,created_at
  from public.company_audit_events where company_id=cid order by created_at desc,id desc limit 30)x) else '[]'::jsonb end);
end;$$;
revoke all on function public.session_context_v1(),public.company_read_v1() from public,anon;
grant execute on function public.session_context_v1(),public.company_read_v1() to authenticated;
alter function public.session_context_v1() owner to postgres;
alter function public.company_read_v1() owner to postgres;
notify pgrst,'reload schema';

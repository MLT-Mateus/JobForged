-- migration-role: supabase_admin
-- Paginated, tenant-scoped activity; no raw audit payload or personal identifiers in logs.
create function public.company_activity_v1(requested_page integer default 1,category text default 'all') returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare cid uuid; total bigint; page integer; rows jsonb;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 if requested_page is null or requested_page not between 1 and 100000 or category is null or category not in ('all','company','member','branding','portal','domain') then raise exception 'invalid pagination' using errcode='22023';end if;
 select count(*) into total from public.company_audit_events e where e.company_id=cid and (category='all' or split_part(e.action,'.',1)=category);
 page:=least(requested_page,greatest(1,ceil(total/10.0)::integer));
 select coalesce(jsonb_agg(r order by r.created_at desc,r.id desc),'[]'::jsonb) into rows from (
  select e.id,e.action,e.created_at,coalesce(nullif(actor.full_name,''),case when e.actor_user_id is null then 'Sistema' else 'Usuário indisponível' end) as actor_name,
   target.full_name as target_name
  from public.company_audit_events e
  left join public.company_members actor on actor.company_id=cid and actor.user_id=e.actor_user_id
  left join public.company_members target on target.company_id=cid and target.id=e.target_id
  where e.company_id=cid and (category='all' or split_part(e.action,'.',1)=category)
  order by e.created_at desc,e.id desc limit 10 offset (page-1)*10
 )r;
 return jsonb_build_object('items',rows,'page',page,'pageSize',10,'total',total);
end;$$;

create function public.update_company_member_identity_v1(target_member_id uuid,new_full_name text,new_cpf text,new_phone text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; actor_role text; member public.company_members;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();actor_role:=app_private.company_role(cid);
 if coalesce(actor_role,'') not in ('owner','admin') or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 select * into member from public.company_members m where m.company_id=cid and m.id=target_member_id for update;
 if member.id is null or (member.role='owner' and actor_role<>'owner') then raise exception 'not authorized' using errcode='42501';end if;
 if length(trim(coalesce(new_full_name,''))) not between 3 and 120 or not app_private.valid_cpf(new_cpf) or (new_phone is not null and new_phone !~ '^[0-9]{10,11}$') then raise exception 'invalid identity' using errcode='22023';end if;
 update public.company_members set full_name=trim(new_full_name),cpf=new_cpf,phone=new_phone where id=member.id returning * into member;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(cid,auth.uid(),'member.identity_updated',member.id);
 return jsonb_build_object('id',member.id,'full_name',member.full_name,'cpf',member.cpf,'phone',member.phone);
end;$$;
revoke all on function public.company_activity_v1(integer,text),public.update_company_member_identity_v1(uuid,text,text,text) from public,anon,service_role;
grant execute on function public.company_activity_v1(integer,text),public.update_company_member_identity_v1(uuid,text,text,text) to authenticated;
alter function public.company_activity_v1(integer,text) owner to postgres;
alter function public.update_company_member_identity_v1(uuid,text,text,text) owner to postgres;
notify pgrst,'reload schema';

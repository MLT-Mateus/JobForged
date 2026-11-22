-- migration-role: supabase_admin
-- Additive identity fields; the previous name-only RPC remains compatible.
create function app_private.valid_cpf(value text) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare total integer; digit integer; n integer; i integer;
begin
 if value is null then return true; end if;
 if value !~ '^[0-9]{11}$' or value=repeat(substr(value,1,1),11) then return false; end if;
 for n in 9..10 loop
  total:=0;
  for i in 1..n loop total:=total+substr(value,i,1)::integer*(n+2-i); end loop;
  digit:=(total*10)%11;
  if digit=10 then digit:=0; end if;
  if digit<>substr(value,n+1,1)::integer then return false; end if;
 end loop;
 return true;
end;$$;
revoke all on function app_private.valid_cpf(text) from public,anon,authenticated,service_role;
alter function app_private.valid_cpf(text) owner to postgres;
alter table public.company_members add column cpf text check(app_private.valid_cpf(cpf));
alter table public.company_members add column phone text check(phone is null or phone ~ '^[0-9]{10,11}$');

create function public.account_read_v1() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
 perform app_private.security_gate();
 select jsonb_build_object('fullName',m.full_name,'cpf',m.cpf,'phone',m.phone,'createdAt',m.created_at) into result
 from public.company_members m where m.user_id=auth.uid() and m.status='active' and app_private.is_company_member(m.company_id);
 if result is null or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 return result;
end;$$;

create function public.update_my_member_identity_v1(new_full_name text,new_cpf text,new_phone text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare member public.company_members;
begin
 perform app_private.security_gate();
 if length(trim(coalesce(new_full_name,''))) not between 3 and 120
 or not app_private.valid_cpf(new_cpf) or (new_phone is not null and new_phone !~ '^[0-9]{10,11}$') then
  raise exception 'invalid profile' using errcode='22023';
 end if;
 update public.company_members m set full_name=trim(new_full_name),cpf=new_cpf,phone=new_phone
 where m.user_id=auth.uid() and m.status='active' and app_private.is_company_member(m.company_id) and not public.is_platform_admin()
 returning m.* into member;
 if not found then raise exception 'not authorized' using errcode='42501'; end if;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id)
 values(member.company_id,auth.uid(),'member.profile_updated',member.id);
 return jsonb_build_object('fullName',member.full_name,'cpf',member.cpf,'phone',member.phone,'createdAt',member.created_at);
end;$$;

-- Extend the existing, explicitly projected roster without changing its authorization.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.company_read_v1()'::regprocedure);
 definition:=replace(definition,'''email'',case when actor_role',
  '''cpf'',case when actor_role in (''owner'',''admin'') then m.cpf end,''phone'',case when actor_role in (''owner'',''admin'') then m.phone end,''email'',case when actor_role');
 execute definition;
end;$$;
revoke all on function public.account_read_v1(),public.update_my_member_identity_v1(text,text,text) from public,anon;
grant execute on function public.account_read_v1(),public.update_my_member_identity_v1(text,text,text) to authenticated;
alter function public.account_read_v1() owner to postgres;
alter function public.update_my_member_identity_v1(text,text,text) owner to postgres;

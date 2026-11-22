-- migration-role: supabase_admin
-- Read-only administrative projections; no new mutation or role elevation.
create function public.platform_read_v2(section text,search_text text default '',status_filter text default '',page_number integer default 1,company_filter uuid default null,actor_query text default '',date_from date default null,date_to date default null,target_query text default '')
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb;effective_page integer;collection text;
begin
 perform app_private.security_gate(true);
 if not public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if page_number is null or page_number not between 1 and 10000 or length(coalesce(actor_query,''))>160 or length(coalesce(target_query,''))>160 or date_from>date_to then raise exception 'invalid filters' using errcode='22023';end if;
 if section='audit' then
  with records as (
   select 'platform:'||id id,actor_user_id,company_id,target_id,action,reason,details,created_at from public.platform_audit_events
   union all select 'company:'||id,actor_user_id,company_id,target_id,action,'' reason,details,created_at from public.company_audit_events where action not like 'platform.%'
  ),filtered as (
   select r.*,c.name company_name,u.email actor_email from records r left join public.companies c on c.id=r.company_id left join auth.users u on u.id=r.actor_user_id
   where (coalesce(search_text,'')='' or concat_ws(' ',r.action,r.reason,c.name) ilike '%'||search_text||'%')
   and (company_filter is null or r.company_id=company_filter) and (coalesce(status_filter,'')='' or r.action=status_filter)
   and (coalesce(actor_query,'')='' or u.email ilike '%'||actor_query||'%')
   and (date_from is null or r.created_at>=date_from::timestamp at time zone 'America/Sao_Paulo')
   and (date_to is null or r.created_at<(date_to+1)::timestamp at time zone 'America/Sao_Paulo')
   and (coalesce(target_query,'')='' or concat_ws(' ',r.target_id,c.name) ilike '%'||target_query||'%')
  ),counts as(select count(*) total,greatest(1,least(page_number,ceil(count(*)/25.0)::integer)) page from filtered),
  portion as(select * from filtered order by created_at desc,id desc limit 25 offset ((select page from counts)-1)*25)
  select jsonb_build_object('total',total,'page',page,'items',coalesce((select jsonb_agg(p order by p.created_at desc,p.id desc) from portion p),'[]'::jsonb)) into result from counts;
  return result;
 end if;
 result:=public.platform_read(section,search_text,status_filter,page_number,company_filter);
 if result?'total' then effective_page:=greatest(1,least(page_number,ceil((result->>'total')::numeric/25)::integer));if effective_page<>page_number then result:=public.platform_read(section,search_text,status_filter,effective_page,company_filter);end if;result:=result||jsonb_build_object('page',effective_page);end if;
 if section in ('users','company') then
  collection:=case when section='users' then 'items' else 'members' end;
  result:=jsonb_set(result,array[collection],coalesce((select jsonb_agg(e.value||jsonb_build_object('cpf',m.cpf,'phone',m.phone,'photo_version',case when exists(select 1 from app_private.member_photos p where p.member_id=m.id) then m.photo_version else 0 end) order by e.ordinality) from jsonb_array_elements(result->collection) with ordinality e(value,ordinality) left join public.company_members m on m.id=(e.value->>'id')::uuid),'[]'::jsonb));
 end if;
 return result;
end;$$;

create function public.platform_member_photo(member_id uuid) returns text language plpgsql stable security definer set search_path=pg_catalog as $$
begin perform app_private.security_gate(true);if not public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 return (select thumbnail from app_private.member_photos where member_photos.member_id=platform_member_photo.member_id);
end;$$;

create function public.company_deletion_page(page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb;
begin perform app_private.security_gate(true);if not public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if page_number is null or page_number not between 1 and 10000 then raise exception 'invalid page' using errcode='22023';end if;
 with counts as(select count(*) total,greatest(1,least(page_number,ceil(count(*)/10.0)::integer)) page from app_private.company_deletion_jobs),
 portion as(select q.id,q.company_id,coalesce(c.name,'Empresa excluída') company_name,u.email requested_by,q.state,q.requested_at,q.completed_at,q.error_code,q.file_count files,
 case when q.state='completed' then q.file_count else(select count(*) from app_private.company_deletion_objects o where o.job_id=q.id and o.removed_at is not null) end removed_files,
 case when q.state='completed' then q.deleted_count else(select count(*) from app_private.company_deletion_users p where p.job_id=q.id and p.state='deleted') end deleted_accounts,
 case when q.state='completed' then q.preserved_count else(select count(*) from app_private.company_deletion_users p where p.job_id=q.id and p.state='preserved') end preserved_accounts
 from app_private.company_deletion_jobs q left join public.companies c on c.id=q.company_id left join auth.users u on u.id=q.requested_by order by q.requested_at desc,q.id limit 10 offset ((select page from counts)-1)*10)
 select jsonb_build_object('total',total,'page',page,'items',coalesce((select jsonb_agg(p order by p.requested_at desc,p.id) from portion p),'[]'::jsonb)) into result from counts;
 return result;
end;$$;
alter function public.platform_read_v2(text,text,text,integer,uuid,text,date,date,text) owner to postgres;
alter function public.platform_member_photo(uuid) owner to postgres;
alter function public.company_deletion_page(integer) owner to postgres;
revoke all on function public.platform_read_v2(text,text,text,integer,uuid,text,date,date,text),public.platform_member_photo(uuid),public.company_deletion_page(integer) from public,anon,authenticated,service_role;
grant execute on function public.platform_read_v2(text,text,text,integer,uuid,text,date,date,text),public.platform_member_photo(uuid),public.company_deletion_page(integer) to authenticated;
notify pgrst,'reload schema';

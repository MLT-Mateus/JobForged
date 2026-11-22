-- migration-role: supabase_admin
create function public.my_notifications_v2(page_number integer default 1,unread_only boolean default false)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; result jsonb;
begin
 perform app_private.security_gate();
 if not app_private.communications_access() then raise exception 'denied' using errcode='42501';end if;
 if page_number is null or page_number<1 or page_number>10000 or unread_only is null then raise exception 'invalid page' using errcode='22023';end if;
 if not public.is_platform_admin() then cid:=app_private.current_company_id();if cid is not null then perform public.company_operations_v1('alerts');end if;end if;
 with inbox as (
 select d.id,c.title,c.message,c.link,c.dispatched_at,d.read_at from public.platform_communication_deliveries d join public.platform_communications c on c.id=d.communication_id
 where d.user_id=auth.uid() and c.channel in ('inapp','both') and app_private.communication_recipient(auth.uid(),c.audience,c.company_id)
 union all select a.id,a.title,a.body,a.link,a.created_at,a.read_at from app_private.company_alerts a where a.company_id=cid and a.user_id=auth.uid()
 ), filtered as (select * from inbox where not unread_only or read_at is null), portion as (select * from filtered order by dispatched_at desc,id desc limit 20 offset (page_number-1)*20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(p order by p.dispatched_at desc,p.id desc) from portion p),'[]'::jsonb),'unread',(select count(*) from inbox where read_at is null),'total',(select count(*) from filtered),'hasNext',(select count(*) from filtered)>page_number*20) into result;
 return result;
end;$$;

create function public.company_activity_v2(requested_page integer default 1,category text default 'all',actor_query text default '',date_from date default null,date_to date default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare cid uuid;result jsonb;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') or public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if requested_page is null or requested_page not between 1 and 100000 or category is null or category not in ('all','company','member','branding','portal','domain','job','application','agenda') or length(coalesce(actor_query,''))>120 or date_from>date_to then raise exception 'invalid filters' using errcode='22023';end if;
 with base as (
 select e.*,coalesce(nullif(actor.full_name,''),case when e.actor_user_id is null then 'Sistema' else 'Usuário indisponível' end) actor_name,target.full_name target_name,
 case when e.action in ('branding.save','branding.publish','branding.restore','portal.save','portal.publish','portal.version','portal.domain_version','domain.register','domain.disconnect') then 'publication:'||e.created_at::text||':'||coalesce(e.actor_user_id::text,'system') else e.id::text end group_id
 from public.company_audit_events e left join public.company_members actor on actor.company_id=cid and actor.user_id=e.actor_user_id left join public.company_members target on target.company_id=cid and target.id=e.target_id
 where e.company_id=cid and (date_from is null or e.created_at>=(date_from::timestamp at time zone 'America/Sao_Paulo')) and (date_to is null or e.created_at<((date_to+1)::timestamp at time zone 'America/Sao_Paulo'))
 ), grouped as (
 select min(id::text) id,case when bool_or(action='portal.version') or count(*)>1 and bool_or(action like 'portal.%') then 'portal.version' else min(action) end action,min(created_at) created_at,actor_name,max(target_name) target_name,
 jsonb_agg(jsonb_build_object('action',action,'details',details) order by id) events,array_agg(distinct split_part(action,'.',1)) categories
 from base group by group_id,actor_name
 ), filtered as (select * from grouped where (category='all' or category=any(categories)) and (coalesce(actor_query,'')='' or actor_name ilike '%'||actor_query||'%')),
 counts as (select count(*) total,greatest(1,least(requested_page,ceil(count(*)/10.0)::integer)) page from filtered),
 portion as (select f.* from filtered f order by created_at desc,id desc limit 10 offset ((select page from counts)-1)*10)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p)-'categories' order by p.created_at desc,p.id desc) from portion p),'[]'::jsonb),'total',total,'page',page,'pageSize',10) into result from counts;
 return result;
end;$$;
alter function public.my_notifications_v2(integer,boolean) owner to postgres;
alter function public.company_activity_v2(integer,text,text,date,date) owner to postgres;
revoke all on function public.my_notifications_v2(integer,boolean),public.company_activity_v2(integer,text,text,date,date) from public,anon,authenticated,service_role;
grant execute on function public.my_notifications_v2(integer,boolean),public.company_activity_v2(integer,text,text,date,date) to authenticated;
notify pgrst,'reload schema';

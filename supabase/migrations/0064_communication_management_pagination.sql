-- migration-role: supabase_admin
create function public.communication_management_page(section text,page_number integer default 1,search_text text default '')
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare rows jsonb;total bigint;page integer;
begin
 perform app_private.security_gate(true);
 if not public.is_platform_admin() then raise exception 'denied' using errcode='42501';end if;
 if section not in ('banners','campaigns') or section is null or page_number is null or page_number<1 or page_number>10000 or length(coalesce(search_text,''))>120 then raise exception 'invalid filters' using errcode='22023';end if;
 if section='banners' then
  select count(*) into total from public.platform_banners b where search_text='' or b.title ilike '%'||search_text||'%';
  page:=greatest(1,least(page_number,ceil(total/10.0)::integer));
  select coalesce(jsonb_agg(x order by x.position,x.updated_at desc),'[]'::jsonb) into rows from (select id,title,description,image_id,mobile_image_id,link,active,position,version,duration_seconds,updated_at from public.platform_banners b where search_text='' or b.title ilike '%'||search_text||'%' order by position,updated_at desc,id limit 10 offset (page-1)*10)x;
 else
  select count(*) into total from public.platform_communications c where search_text='' or c.title ilike '%'||search_text||'%';
  page:=greatest(1,least(page_number,ceil(total/10.0)::integer));
  select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) into rows from (
   select c.id,c.title,c.message,c.link,c.audience,c.channel,c.state,c.version,c.company_id,c.created_at,c.dispatched_at,
    (select count(*) from auth.users u where app_private.communication_recipient(u.id,c.audience,c.company_id)) eligible,
    (select count(*) from public.platform_communication_deliveries where communication_id=c.id) recipients,
    (select count(*) from public.platform_communication_deliveries where communication_id=c.id and email_state='pending') pending,
    (select count(*) from public.platform_communication_deliveries where communication_id=c.id and email_state='sent') sent,
    (select count(*) from public.platform_communication_deliveries where communication_id=c.id and email_state in ('failed','uncertain','sending')) attention
   from public.platform_communications c where search_text='' or c.title ilike '%'||search_text||'%' order by c.created_at desc,c.id limit 10 offset (page-1)*10)x;
 end if;
 return jsonb_build_object('banners',case when section='banners' then rows else '[]'::jsonb end,'campaigns',case when section='campaigns' then rows else '[]'::jsonb end,'total',total,'page',page);
end;$$;
alter function public.communication_management_page(text,integer,text) owner to postgres;
revoke all on function public.communication_management_page(text,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.communication_management_page(text,integer,text) to authenticated;
notify pgrst,'reload schema';

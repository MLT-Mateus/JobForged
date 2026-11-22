create table public.tracking_integrations (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 1 and 100),
 tag_id text not null check(tag_id ~ '^AW-[0-9]{6,20}$'),
 urls text[] not null check(cardinality(urls) between 1 and 100),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.tracking_integrations enable row level security;
revoke all on public.tracking_integrations from anon,authenticated;
create function public.tracking_manage(operation text, record_id uuid default null, values_json jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 if operation='list' then
   select coalesce(jsonb_agg(to_jsonb(t) order by t.name),'[]') into result from public.tracking_integrations t;
   return result;
 elsif operation='delete' then
   delete from public.tracking_integrations where id=record_id;
 elsif operation='save' then
   if record_id is null then
     insert into public.tracking_integrations(name,tag_id,urls,enabled) values(values_json->>'name',values_json->>'tag_id',array(select jsonb_array_elements_text(values_json->'urls')),coalesce((values_json->>'enabled')::boolean,false));
   else
     update public.tracking_integrations set name=values_json->>'name',tag_id=values_json->>'tag_id',urls=array(select jsonb_array_elements_text(values_json->'urls')),enabled=coalesce((values_json->>'enabled')::boolean,false),updated_at=now() where id=record_id;
     if not found then raise exception 'not found'; end if;
   end if;
 else raise exception 'invalid operation'; end if;
 return '{"ok":true}';
end $$;
revoke all on function public.tracking_manage(text,uuid,jsonb) from public,anon;
grant execute on function public.tracking_manage(text,uuid,jsonb) to authenticated;
create function public.tracking_for_page(page_url text) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(distinct tag_id),'[]') from public.tracking_integrations t
 where enabled and exists(select 1 from unnest(t.urls) u where u=page_url or (right(u,2)='/*' and starts_with(page_url,left(u,length(u)-1))));
$$;
revoke all on function public.tracking_for_page(text) from public;
grant execute on function public.tracking_for_page(text) to anon,authenticated;

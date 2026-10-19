-- Internal communications: server-authorized platform editing and private account inbox.
create table public.platform_banner_assets (
 id uuid primary key, path text not null unique, size integer not null check(size between 1 and 5242880), sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.platform_banners (
 id uuid primary key default extensions.gen_random_uuid(), title text not null, description text not null default '', image_id uuid not null references public.platform_banner_assets(id), link text not null default '', active boolean not null default false, position integer not null default 0,
 version integer not null default 1,created_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),check(length(title) between 1 and 100),check(length(description)<=240),check(position between 0 and 99)
);
create table public.platform_communications (
 id uuid primary key default extensions.gen_random_uuid(),title text not null check(length(title) between 1 and 100),message text not null check(length(message) between 1 and 4000),link text not null default '',audience text not null check(audience in ('companies','admins','platform_admins')),company_id uuid references public.companies(id),channel text not null check(channel in ('inapp','email','both')),state text not null default 'draft' check(state in ('draft','dispatched')),version integer not null default 1,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),dispatched_at timestamptz
);
create table public.platform_communication_deliveries (
 id uuid primary key default extensions.gen_random_uuid(),communication_id uuid not null references public.platform_communications(id),user_id uuid not null references auth.users(id),read_at timestamptz,email_state text not null check(email_state in ('none','pending','sending','sent','failed','uncertain','cancelled')),attempt_id uuid,attempted_at timestamptz,unique(communication_id,user_id)
);
create index communication_inbox on public.platform_communication_deliveries(user_id,communication_id);
create index communication_email_queue on public.platform_communication_deliveries(communication_id,email_state);
alter table public.platform_banner_assets enable row level security;
alter table public.platform_banners enable row level security;
alter table public.platform_communications enable row level security;
alter table public.platform_communication_deliveries enable row level security;
revoke all on public.platform_banner_assets,public.platform_banners,public.platform_communications,public.platform_communication_deliveries from public,anon,authenticated;

create function app_private.communications_access() returns boolean language sql stable security definer set search_path=pg_catalog,public,auth as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now())) and (public.is_platform_admin() or exists(select 1 from public.company_members m join public.companies c on c.id=m.company_id where m.user_id=auth.uid() and m.status='active' and c.operational_status='active'));
$$;
create function app_private.communication_recipient(person uuid,audience text,company uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public,auth as $$
 select exists(select 1 from auth.users where id=person and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now())) and
 case when audience='platform_admins' then company is null and exists(select 1 from public.platform_admins p join auth.users u on u.id=p.user_id where p.user_id=person and p.email=lower(u.email))
 else not exists(select 1 from public.platform_admins where user_id=person) and exists(select 1 from public.company_members m join public.companies c on c.id=m.company_id where m.user_id=person and m.status='active' and c.operational_status='active' and (company is null or m.company_id=company) and (audience='companies' or (audience='admins' and m.role in ('owner','admin')))) end;
$$;
create function app_private.communication_link(value text) returns boolean language sql immutable set search_path=pg_catalog as $$ select length(value)<=500 and (value='' or value ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:]<>]*)?$') and value !~ '[[:cntrl:]]'; $$;
revoke all on function app_private.communications_access(),app_private.communication_recipient(uuid,text,uuid),app_private.communication_link(text) from public,anon,authenticated;

create function public.register_platform_banner_asset(asset_id uuid,file_size integer,file_sha256 text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects where bucket_id='company-branding' and name='platform/'||asset_id::text||'.png') then raise exception 'file unavailable'; end if;
 insert into public.platform_banner_assets(id,path,size,sha256,created_by) values(asset_id,'platform/'||asset_id::text||'.png',file_size,file_sha256,auth.uid());
 return jsonb_build_object('id',asset_id);
end; $$;
create function public.read_platform_banner_asset(asset_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if not app_private.communications_access() then raise exception 'not authorized' using errcode='42501'; end if;
 select jsonb_build_object('path',a.path,'size',a.size,'sha256',a.sha256) into result from public.platform_banner_assets a where a.id=asset_id and (public.is_platform_admin() or exists(select 1 from public.platform_banners b where b.image_id=a.id and b.active));
 if result is null then raise exception 'asset unavailable' using errcode='42501'; end if;return result;
end; $$;
create function public.communications_read(section text default 'inbox',page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
declare result jsonb;
begin
 if not app_private.communications_access() then raise exception 'not authorized' using errcode='42501'; end if;
 if page_number<1 or page_number>10000 then raise exception 'invalid page'; end if;
 if section='banners' then
  select coalesce(jsonb_agg(to_jsonb(b) order by b.position,b.updated_at desc),'[]') into result from (select id,title,description,image_id,link,position,version,active,updated_at from public.platform_banners where active order by position,updated_at desc limit 10) b;
  return jsonb_build_object('items',result);
 elsif section='inbox' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.dispatched_at desc),'[]') into result from (select d.id,c.title,c.message,c.link,c.dispatched_at,d.read_at from public.platform_communication_deliveries d join public.platform_communications c on c.id=d.communication_id where d.user_id=auth.uid() and c.channel in ('inapp','both') and app_private.communication_recipient(auth.uid(),c.audience,c.company_id) order by c.dispatched_at desc,d.id limit 20 offset (page_number-1)*20) x;
  return jsonb_build_object('items',result,'unread',(select count(*) from public.platform_communication_deliveries d join public.platform_communications c on c.id=d.communication_id where d.user_id=auth.uid() and d.read_at is null and c.channel in ('inapp','both') and app_private.communication_recipient(auth.uid(),c.audience,c.company_id)));
 end if;
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 if section='manage' then
  return jsonb_build_object('banners',(select coalesce(jsonb_agg(to_jsonb(b) order by b.position,b.updated_at desc),'[]') from (select * from public.platform_banners order by updated_at desc limit 100) b),
  'campaigns',(select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]') from (select c.*,(select count(*) from auth.users u where app_private.communication_recipient(u.id,c.audience,c.company_id)) eligible,(select count(*) from public.platform_communication_deliveries where communication_id=c.id) recipients,(select count(*) from public.platform_communication_deliveries where communication_id=c.id and email_state='pending') pending,(select count(*) from public.platform_communication_deliveries where communication_id=c.id and email_state='sent') sent,(select count(*) from public.platform_communication_deliveries where communication_id=c.id and email_state in ('failed','uncertain','sending')) attention from public.platform_communications c order by c.created_at desc limit 100) c));
 end if;
 raise exception 'invalid section';
end; $$;
create function public.communications_manage(operation text,record_id uuid default null,expected_version integer default 0,values_json jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare banner public.platform_banners; campaign public.platform_communications; changed_id uuid; recipients integer; selected_company uuid;
begin
 if operation='read' then
  if not app_private.communications_access() then raise exception 'not authorized' using errcode='42501'; end if;
  update public.platform_communication_deliveries set read_at=coalesce(read_at,now()) where id=record_id and user_id=auth.uid();return '{}'::jsonb;
 end if;
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 if jsonb_typeof(values_json)<>'object' or octet_length(values_json::text)>12000 then raise exception 'invalid values'; end if;
 if operation='banner.save' then
  if length(trim(coalesce(values_json->>'title','')))=0 then raise exception 'title required'; end if;
  if not app_private.communication_link(coalesce(values_json->>'link','')) then raise exception 'invalid link'; end if;
  if record_id is not null then
   select * into banner from public.platform_banners where id=record_id for update;
   if not found or expected_version is null or banner.version<>expected_version then raise exception 'version conflict' using errcode='40001'; end if;
  end if;
  if (values_json->>'active')::boolean then
   perform pg_advisory_xact_lock(711001);
   if (select count(*) from public.platform_banners where active and id<>coalesce(record_id,'00000000-0000-0000-0000-000000000000'))>=10 then raise exception 'maximum ten active banners'; end if;
  end if;
  if record_id is null then
   insert into public.platform_banners(title,description,image_id,link,active,position,created_by) values(trim(values_json->>'title'),coalesce(values_json->>'description',''),(values_json->>'image_id')::uuid,coalesce(values_json->>'link',''),(values_json->>'active')::boolean,(values_json->>'position')::integer,auth.uid()) returning id into changed_id;
  else
   update public.platform_banners set title=trim(values_json->>'title'),description=coalesce(values_json->>'description',''),image_id=(values_json->>'image_id')::uuid,link=coalesce(values_json->>'link',''),active=(values_json->>'active')::boolean,position=(values_json->>'position')::integer,version=version+1,updated_at=now() where id=record_id returning id into changed_id;
  end if;
 elsif operation='campaign.save' then
  if length(trim(coalesce(values_json->>'title','')))=0 or length(trim(coalesce(values_json->>'message','')))=0 then raise exception 'content required'; end if;
  if not app_private.communication_link(coalesce(values_json->>'link','')) then raise exception 'invalid link'; end if;
  selected_company:=nullif(values_json->>'company_id','')::uuid;
  if selected_company is not null and not exists(select 1 from public.companies where id=selected_company and operational_status='active') then raise exception 'company unavailable'; end if;
  if values_json->>'audience'='platform_admins' and selected_company is not null then raise exception 'invalid audience'; end if;
  if record_id is not null then
   select * into campaign from public.platform_communications where id=record_id for update;
   if not found or expected_version is null or campaign.version<>expected_version then raise exception 'version conflict' using errcode='40001'; end if;
   if campaign.state<>'draft' then raise exception 'immutable communication'; end if;
   update public.platform_communications set title=trim(values_json->>'title'),message=values_json->>'message',link=coalesce(values_json->>'link',''),audience=values_json->>'audience',company_id=selected_company,channel=values_json->>'channel',version=version+1 where id=record_id returning id into changed_id;
  else
   insert into public.platform_communications(title,message,link,audience,company_id,channel,created_by) values(trim(values_json->>'title'),values_json->>'message',coalesce(values_json->>'link',''),values_json->>'audience',selected_company,values_json->>'channel',auth.uid()) returning id into changed_id;
  end if;
 elsif operation='campaign.dispatch' then
  select * into campaign from public.platform_communications where id=record_id for update;
  if not found then raise exception 'unavailable'; end if;
  if campaign.state='dispatched' then return jsonb_build_object('id',campaign.id); end if;
  if expected_version is null or campaign.version<>expected_version then raise exception 'version conflict' using errcode='40001'; end if;
  insert into public.platform_communication_deliveries(communication_id,user_id,email_state) select campaign.id,u.id,case when campaign.channel='inapp' then 'none' else 'pending' end from auth.users u where app_private.communication_recipient(u.id,campaign.audience,campaign.company_id);
  get diagnostics recipients=row_count;
  if recipients=0 or recipients>5000 then raise exception 'audience must contain 1 to 5000 verified accounts'; end if;
  update public.platform_communications set state='dispatched',dispatched_at=now(),version=version+1 where id=record_id;changed_id:=record_id;
 else raise exception 'invalid operation'; end if;
 insert into public.platform_audit_events(actor_user_id,target_id,action,reason,details) values(auth.uid(),changed_id,'platform.'||operation,'Comunicação interna administrada',jsonb_build_object('recipients',recipients,'previous_version',expected_version));
 return jsonb_build_object('id',changed_id);
end; $$;

-- Claim one recipient before the external request. Never retry ambiguous delivery automatically.
create function public.claim_communication_email(campaign_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare item public.platform_communication_deliveries; campaign public.platform_communications; address text; attempt uuid:=extensions.gen_random_uuid();
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 select * into campaign from public.platform_communications where id=campaign_id and state='dispatched';
 if not found then raise exception 'unavailable'; end if;
 loop
  select * into item from public.platform_communication_deliveries where communication_id=campaign_id and email_state='pending' order by id limit 1 for update skip locked;
  if not found then return '{}'::jsonb; end if;
  if not app_private.communication_recipient(item.user_id,campaign.audience,campaign.company_id) then update public.platform_communication_deliveries set email_state='cancelled' where id=item.id;continue;end if;
  update public.platform_communication_deliveries set email_state='sending',attempt_id=attempt,attempted_at=now() where id=item.id;
  select email into address from auth.users where id=item.user_id;
  return jsonb_build_object('id',item.id,'attempt',attempt,'email',address,'title',campaign.title,'message',campaign.message,'link',campaign.link);
 end loop;
end; $$;
create function public.finish_communication_email(delivery_id uuid,attempt uuid,outcome text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 if outcome is null or outcome not in ('sent','failed','uncertain') then raise exception 'invalid outcome'; end if;
 update public.platform_communication_deliveries set email_state=outcome where id=delivery_id and attempt_id=attempt and email_state='sending';
 if found then insert into public.platform_audit_events(actor_user_id,target_id,action,reason,details) values(auth.uid(),delivery_id,'platform.email.result','Resultado de envio registrado',jsonb_build_object('outcome',outcome));end if;
end; $$;
revoke all on function public.register_platform_banner_asset(uuid,integer,text),public.read_platform_banner_asset(uuid),public.communications_read(text,integer),public.communications_manage(text,uuid,integer,jsonb),public.claim_communication_email(uuid),public.finish_communication_email(uuid,uuid,text) from public,anon;
grant execute on function public.register_platform_banner_asset(uuid,integer,text),public.read_platform_banner_asset(uuid),public.communications_read(text,integer),public.communications_manage(text,uuid,integer,jsonb),public.claim_communication_email(uuid),public.finish_communication_email(uuid,uuid,text) to authenticated;

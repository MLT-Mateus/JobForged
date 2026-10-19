-- Company branding, optimistic concurrency, immutable publication history and private assets.
create table public.company_branding (
 company_id uuid primary key references public.companies(id),
 draft jsonb not null default '{}'::jsonb, published jsonb not null default '{}'::jsonb,
 version bigint not null default 0, published_version bigint not null default 0,
 updated_at timestamptz, updated_by uuid references auth.users(id),
 published_at timestamptz, published_by uuid references auth.users(id)
);
create table public.company_branding_history (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 version bigint not null,snapshot jsonb not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),
 unique(company_id,version)
);
create table public.company_branding_assets (
 id uuid primary key,company_id uuid not null references public.companies(id),path text not null unique,
 name text not null,size integer not null check(size between 1 and 5242880),sha256 text not null check(sha256~'^[0-9a-f]{64}$'),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
alter table public.company_branding enable row level security;
alter table public.company_branding_history enable row level security;
alter table public.company_branding_assets enable row level security;
revoke all on public.company_branding,public.company_branding_history,public.company_branding_assets from public,anon,authenticated;
-- Direct writes and reads are forbidden; RPCs return only the authorized view.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('company-branding','company-branding',false,5242880,array['image/png']);
-- Narrow server credential: authenticated role, dedicated subject/claim, this bucket only.
-- Ordinary client sessions cannot write or read raw objects, bypassing image processing.
create policy "Branding server reads private images" on storage.objects for select to authenticated
 using(bucket_id='company-branding' and auth.uid()='00000000-0000-4000-8000-000000000083'::uuid and auth.jwt()->>'jbfd_branding_storage'='v1');
create policy "Branding server inserts immutable images" on storage.objects for insert to authenticated
 with check(bucket_id='company-branding' and auth.uid()='00000000-0000-4000-8000-000000000083'::uuid and auth.jwt()->>'jbfd_branding_storage'='v1' and name~'^[0-9a-f-]{36}/[0-9a-f-]{36}\.png$');

create function app_private.branding_company()
returns uuid language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare cid uuid;
begin
 if auth.uid() is null or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 select m.company_id into cid from public.company_members m join public.companies c on c.id=m.company_id join auth.users u on u.id=m.user_id
 where m.user_id=auth.uid() and m.status='active' and c.operational_status='active' and u.email_confirmed_at is not null limit 1;
 if cid is null then raise exception 'not authorized' using errcode='42501';end if;
 return cid;
end;$$;
revoke all on function app_private.branding_company() from public,anon,authenticated;

create function app_private.branding_shape(value jsonb,template jsonb)
returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare k text;v jsonb;
begin
 if jsonb_typeof(value) is distinct from jsonb_typeof(template) then return false;end if;
 if jsonb_typeof(template)='object' then
  if (select array_agg(key order by key) from jsonb_object_keys(value) key) is distinct from (select array_agg(key order by key) from jsonb_object_keys(template) key) then return false;end if;
  for k,v in select * from jsonb_each(template) loop if not app_private.branding_shape(value->k,v) then return false;end if;end loop;
 elsif jsonb_typeof(template)='array' then
  if jsonb_array_length(value)>50 then return false;end if;
  for v in select * from jsonb_array_elements(value) loop if not app_private.branding_shape(v,template->0) then return false;end if;end loop;
 elsif jsonb_typeof(template)='string' then return length(value#>>'{}')<=4000;
 end if;
 return true;
end;$$;
revoke all on function app_private.branding_shape(jsonb,jsonb) from public,anon,authenticated;
create function app_private.branding_asset_url(url text,cid uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select url='' or exists(select 1 from public.company_branding_assets a join storage.objects o on o.bucket_id='company-branding' and o.name=a.path
 where a.company_id=cid and url='/api/company/branding/assets/'||a.id::text);
$$;
revoke all on function app_private.branding_asset_url(text,uuid) from public,anon,authenticated;
create function app_private.branding_luminance(color text)
returns double precision language plpgsql immutable set search_path=pg_catalog as $$
declare n integer;channel double precision;answer double precision:=0;
begin
 for n in 0..2 loop
  channel:=get_byte(decode(substr(color,2),'hex'),n)/255.0;
  channel:=case when channel<=0.04045 then channel/12.92 else power((channel+0.055)/1.055,2.4) end;
  answer:=answer+channel*(array[0.2126,0.7152,0.0722])[n+1];
 end loop;return answer;
end;$$;
revoke all on function app_private.branding_luminance(text) from public,anon,authenticated;
create function app_private.validate_branding(cid uuid,c jsonb)
returns void language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare p jsonb:='{"primary":"","secondary":"","accent":"","button":"","buttonHover":"","sidebar":"","activeItem":"","link":"","background":"","surface":"","portalBackground":"","text":""}';
 schema jsonb;v jsonb;asset jsonb;k text;candidate text;a double precision;b double precision;bg text;
begin
 schema:=jsonb_build_object('displayName','','shortName','','slogan','','assets','{}'::jsonb,'palette',p,
  'theme',jsonb_build_object('defaultMode','','allowSwitch',true,'light',p,'dark',p),
  'backgrounds','{"loginImage":"","panelImage":"","portalImage":"","coverImage":"","textureImage":"","position":"","fit":"","overlay":"","opacity":0}'::jsonb,
  'typography','{"fontPair":"","density":""}'::jsonb,'loaderEnabled',true,
  'structure','{"allowThemeSwitch":true,"showHeader":true,"showSearch":true,"showBanners":true,"showFooter":true,"showPoweredBy":true}'::jsonb,
  'banners','[{"id":"","organizationId":"","createdAt":"","updatedAt":"","status":"","title":"","description":"","buttonText":"","link":"","image":"","startAt":"","endAt":"","placement":"","order":0}]'::jsonb,
  'portal','{"headline":"","introduction":"","buttonText":"","coverImage":"","about":"","contactEmail":"","contactPhone":"","socialLinkedin":"","socialInstagram":"","footerText":"","showDepartments":true,"showLocations":true,"showFeaturedJobs":true,"emptyStateTitle":"","emptyStateDescription":"","headerLinks":[""],"footerLinks":[""],"customDomain":"","jobforgedDomain":""}'::jsonb);
 if c is null or octet_length(c::text)>131072 or not app_private.branding_shape(c-'assets',schema-'assets')
  or jsonb_typeof(c->'assets') is distinct from 'object' then raise exception 'invalid branding shape' using errcode='22023';end if;
 if length(trim(c->>'displayName')) not between 1 and 160 or length(trim(c->>'shortName')) not between 1 and 24 or length(c->>'slogan')>110
  or c#>>'{typography,fontPair}' not in ('jobforged','contemporaneo','objetivo','editorial') or c#>>'{typography,density}' not in ('Compacta','Padrão','Ampla')
  or c#>>'{theme,defaultMode}' not in ('system','light','dark') or c#>>'{backgrounds,position}' not in ('center','top','bottom')
  or c#>>'{backgrounds,fit}' not in ('cover','contain') or c#>>'{backgrounds,overlay}' !~ '^#[0-9A-Fa-f]{6}$'
  or (c#>>'{backgrounds,opacity}')::numeric not between 0 and 80 or c#>>'{portal,customDomain}'<>'' or c#>>'{portal,jobforgedDomain}'<>''
  or jsonb_array_length(c#>'{portal,headerLinks}')>5 or jsonb_array_length(c#>'{portal,footerLinks}')>6 or jsonb_array_length(c->'banners')>20
  then raise exception 'invalid branding fields' using errcode='22023';end if;
 if length(c#>>'{portal,headline}')>90 or length(c#>>'{portal,contactEmail}')>254 or length(c#>>'{portal,contactPhone}')>64
  or (c#>>'{portal,contactEmail}'<>'' and c#>>'{portal,contactEmail}' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'invalid portal fields' using errcode='22023';end if;
 for candidate in select jsonb_array_elements_text(c#>'{portal,headerLinks}') union all select jsonb_array_elements_text(c#>'{portal,footerLinks}') loop
  if length(candidate)>80 then raise exception 'navigation label too long' using errcode='22023';end if;
 end loop;
 for v in select c->'palette' union all select c#>'{theme,light}' union all select c#>'{theme,dark}' loop
  for candidate in select jsonb_array_elements_text(jsonb_path_query_array(v,'$.*')) loop if candidate !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid color' using errcode='22023';end if;end loop;
 end loop;
 -- Same palette composition and WCAG checks as the shared TS model.
 for v in select (c->'palette')||jsonb_build_object('background',c#>'{theme,light,background}','surface',c#>'{theme,light,surface}','text',c#>'{theme,light,text}') union all select c#>'{theme,dark}' loop
  a:=app_private.branding_luminance(v->>'text');
  foreach bg in array array['surface','background','sidebar','activeItem'] loop
   b:=app_private.branding_luminance(v->>bg);if (greatest(a,b)+0.05)/(least(a,b)+0.05)<4.5 then raise exception 'insufficient text contrast' using errcode='22023';end if;
  end loop;
  a:=app_private.branding_luminance(v->>'link');b:=app_private.branding_luminance(v->>'surface');
  if (greatest(a,b)+0.05)/(least(a,b)+0.05)<4.5 then raise exception 'insufficient link contrast' using errcode='22023';end if;
 end loop;
 if (select array_agg(key order by key) from jsonb_object_keys(c->'assets') key) is distinct from array['avatar','favicon','logoAlternative','logoDark','logoLight','logoMain','shareImage'] then raise exception 'invalid asset keys' using errcode='22023';end if;
 for k,asset in select * from jsonb_each(c->'assets') loop
  if asset<>'null'::jsonb then
   if not app_private.branding_shape(asset,'{"id":"","kind":"","name":"","url":"","format":"","size":0,"updatedAt":""}'::jsonb)
    or not app_private.branding_asset_url(asset->>'url',cid) or asset->>'url'<>('/api/company/branding/assets/'||(asset->>'id'))
    then raise exception 'invalid company asset' using errcode='22023';end if;
  end if;
 end loop;
 foreach k in array array['loginImage','panelImage','portalImage','coverImage','textureImage'] loop
  if not app_private.branding_asset_url(c#>>array['backgrounds',k],cid) then raise exception 'invalid background asset' using errcode='22023';end if;
 end loop;
 if not app_private.branding_asset_url(c#>>'{portal,coverImage}',cid) then raise exception 'invalid portal asset' using errcode='22023';end if;
 foreach k in array array['socialLinkedin','socialInstagram'] loop
  candidate:=c#>>array['portal',k];if candidate<>'' and candidate !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*([/?#][^[:space:]<>"\\]*)?$' then raise exception 'invalid social URL' using errcode='22023';end if;
 end loop;
 for asset in select * from jsonb_array_elements(c->'banners') loop
  if asset->>'organizationId'<>cid::text or asset->>'status' not in ('Ativo','Inativo') or asset->>'placement' not in ('Home','Portal','Home e portal')
   or asset->>'startAt'<>'' or asset->>'endAt'<>'' or not app_private.branding_asset_url(asset->>'image',cid)
   or (asset->>'link'<>'' and asset->>'link' !~ '^(/app(/[a-zA-Z0-9/_-]*)?|https://[a-zA-Z0-9][a-zA-Z0-9.-]*([/?#][^[:space:]<>"\\]*)?)$')
   then raise exception 'invalid banner' using errcode='22023';end if;
 end loop;
end;$$;
revoke all on function app_private.validate_branding(uuid,jsonb) from public,anon,authenticated;

create function public.read_company_branding()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare cid uuid:=app_private.branding_company();editable boolean;result jsonb;
begin
 editable:=app_private.company_role(cid) in ('owner','admin');
 select jsonb_build_object('companyId',cid,'companyName',c.name,'editable',editable,'version',coalesce(b.version,0),
  'draft',case when editable then coalesce(b.draft,'{}'::jsonb) else null end,'published',coalesce(b.published,'{}'::jsonb),
  'publishedVersion',coalesce(b.published_version,0),'updatedAt',b.updated_at,'publishedAt',b.published_at,'publishedBy',u.email,
  'history',case when editable then coalesce((select jsonb_agg(x) from (select h.id,h.version,h.snapshot,h.created_at,coalesce(a.email,h.actor_id::text) actor from public.company_branding_history h left join auth.users a on a.id=h.actor_id where h.company_id=cid order by h.created_at desc,h.id limit 50)x),'[]'::jsonb) else '[]'::jsonb end)
  into result from public.companies c left join public.company_branding b on b.company_id=c.id left join auth.users u on u.id=b.published_by where c.id=cid;
 return result;
end;$$;
create function public.write_company_branding(operation text,expected_version bigint,configuration jsonb default null,history_id uuid default null)
returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare cid uuid:=app_private.branding_company();row public.company_branding;next_value jsonb;
begin
 -- Serialize with suspension and other company operations.
 perform 1 from public.companies where id=cid for update;
 if app_private.company_role(cid) not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 insert into public.company_branding(company_id) values(cid) on conflict do nothing;
 select * into row from public.company_branding where company_id=cid for update;
 if expected_version is null or row.version<>expected_version then raise exception 'branding conflict' using errcode='40001';end if;
 if operation in ('save','publish','reset') then
  perform app_private.validate_branding(cid,configuration);next_value:=configuration;
 elsif operation='discard' then next_value:=row.published;
 elsif operation='restore' then
  select snapshot into next_value from public.company_branding_history where id=history_id and company_id=cid;
  if next_value is null then raise exception 'version unavailable' using errcode='22023';end if;
 else raise exception 'invalid operation' using errcode='22023';end if;
 update public.company_branding set draft=next_value,version=version+1,updated_at=now(),updated_by=auth.uid(),
  published=case when operation='publish' then next_value else published end,
  published_version=case when operation='publish' then version+1 else published_version end,
  published_at=case when operation='publish' then now() else published_at end,
  published_by=case when operation='publish' then auth.uid() else published_by end where company_id=cid returning * into row;
 if operation='publish' then insert into public.company_branding_history(company_id,version,snapshot,actor_id) values(cid,row.version,next_value,auth.uid());end if;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 values(cid,auth.uid(),'branding.'||operation,cid,jsonb_build_object('version',row.version,'restored_from',history_id));
 return row.version;
end;$$;
create function public.register_company_brand_asset(asset_id uuid,file_name text,file_size integer,file_sha256 text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare cid uuid:=app_private.branding_company();result public.company_branding_assets;object_path text;
begin
 perform 1 from public.companies where id=cid for update;
 if app_private.company_role(cid) not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 object_path:=cid::text||'/'||asset_id::text||'.png';
 if asset_id is null or length(file_name) not between 1 and 255 or file_size not between 1 and 5242880 or file_sha256 !~ '^[0-9a-f]{64}$'
  or not exists(select 1 from storage.objects where bucket_id='company-branding' and name=object_path) then raise exception 'invalid asset' using errcode='22023';end if;
 insert into public.company_branding_assets(id,company_id,path,name,size,sha256,created_by) values(asset_id,cid,object_path,file_name,file_size,file_sha256,auth.uid()) returning * into result;
 return to_jsonb(result);
end;$$;
create function public.read_company_brand_asset(asset_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare cid uuid:=app_private.branding_company();result jsonb;
begin select to_jsonb(a) into result from public.company_branding_assets a where id=asset_id and company_id=cid;return result;end;$$;
revoke all on function public.read_company_branding(),public.write_company_branding(text,bigint,jsonb,uuid),public.register_company_brand_asset(uuid,text,integer,text),public.read_company_brand_asset(uuid) from public,anon;
grant execute on function public.read_company_branding(),public.write_company_branding(text,bigint,jsonb,uuid),public.register_company_brand_asset(uuid,text,integer,text),public.read_company_brand_asset(uuid) to authenticated;
notify pgrst,'reload schema';

-- migration-role: supabase_admin
-- Additive presentation controls, stable company addresses and opt-in public projections.
alter function app_private.validate_branding(uuid,jsonb) rename to validate_branding_before_presentation;
revoke all on function app_private.validate_branding_before_presentation(uuid,jsonb) from public,anon,authenticated,service_role;
create function app_private.validate_branding(cid uuid,c jsonb) returns void language plpgsql stable security definer set search_path=pg_catalog as $$
declare p jsonb:=c#>'{portal,presentation}';k text;
begin
 if c is null or octet_length(c::text)>131072 then raise exception 'branding too large' using errcode='22023';end if;
 if (c->'portal')?'presentation' then
  if not app_private.branding_shape(p,'{"showImage":true,"imageAlt":"","showPhotoNotes":true,"showHighlights":true,"showCulture":true,"showInvitation":true,"jobsLayout":""}'::jsonb)
   or length(trim(p->>'imageAlt')) not between 1 and 240 or p->>'jobsLayout' not in ('cards','list') then raise exception 'invalid presentation' using errcode='22023';end if;
 end if;
 perform app_private.validate_branding_before_presentation(cid,c#-'{portal,presentation}');
end;$$;
alter function app_private.validate_branding(uuid,jsonb) owner to postgres;
revoke all on function app_private.validate_branding(uuid,jsonb) from public,anon,authenticated,service_role;
create function app_private.valid_portal_slug(value text) returns boolean language sql immutable set search_path=pg_catalog as $$
 select coalesce(length(value) between 3 and 63 and value~'^[a-z0-9]+(-[a-z0-9]+)*$' and value<>all(array['app','api','backoffice','login','cadastro','design-system','vagas','candidaturas','agenda','administradores','dashboards','configuracoes','financeiro','minha-conta','personalizacao','confirmar-email','convite','recuperar-senha','redefinir-senha','politicas-exclusao','politicas-privacidade','termos-servico','components','data','lib','401','403','404','500','503','brand','assets','careers','documents','fonts','images']),false);
$$;
create table public.company_portals(
 company_id uuid primary key references public.companies(id),slug text not null unique check(app_private.valid_portal_slug(slug)),
 version bigint not null default 0 check(version>=0),is_public boolean not null default false,
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
alter table public.company_portals enable row level security;
revoke all on public.company_portals from public,anon,authenticated,service_role;
create function app_private.allocate_company_portal() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare base text;candidate text;
begin
 base:=trim(both '-' from regexp_replace(translate(lower(new.name),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]+','-','g'));
 base:=trim(both '-' from left(base,48));if length(base)<3 then base:=coalesce(nullif(base,''),'empresa')||'-empresa';end if;
 if not app_private.valid_portal_slug(base) then base:=left(base,48)||'-empresa';end if;
 insert into public.company_portals(company_id,slug) values(new.id,base) on conflict do nothing;
 if not exists(select 1 from public.company_portals where company_id=new.id) then
  candidate:=left(base,25)||'-'||replace(new.id::text,'-','');
  insert into public.company_portals(company_id,slug) values(new.id,candidate);
 end if;
 return new;
end;$$;
create trigger company_portal_address after insert on public.companies for each row execute function app_private.allocate_company_portal();
-- The same allocator is used for existing companies, without publishing any identity.
do $$declare c record;base text;candidate text;begin
 for c in select id,name from public.companies order by created_at,id loop
  base:=trim(both '-' from regexp_replace(translate(lower(c.name),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]+','-','g'));
  base:=trim(both '-' from left(base,48));if length(base)<3 then base:=coalesce(nullif(base,''),'empresa')||'-empresa';end if;
  if not app_private.valid_portal_slug(base) then base:=left(base,48)||'-empresa';end if;
  insert into public.company_portals(company_id,slug) values(c.id,base) on conflict do nothing;
  if not exists(select 1 from public.company_portals where company_id=c.id) then insert into public.company_portals(company_id,slug) values(c.id,left(base,25)||'-'||replace(c.id::text,'-',''));end if;
 end loop;
end$$;
create function public.read_company_portal() returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare cid uuid;answer jsonb;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 select jsonb_build_object('companyId',p.company_id,'slug',p.slug,'version',p.version,'isPublic',p.is_public,'brandingVersion',coalesce(b.version,0),'publishedAt',b.published_at)
 into answer from public.company_portals p left join public.company_branding b on b.company_id=p.company_id where p.company_id=cid;return answer;
end;$$;
create function public.write_company_portal(operation text,expected_version bigint,requested_slug text default null,branding_version bigint default null,configuration jsonb default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid;row public.company_portals;v bigint;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'not authorized' using errcode='42501';end if;
 perform app_private.consume_operation_budget('portal-operation',cid,60,60);
 select * into row from public.company_portals where company_id=cid for update;
 if expected_version is null or expected_version<>row.version then raise exception 'portal conflict' using errcode='40001';end if;
 if operation='address' then
  if not app_private.valid_portal_slug(requested_slug) then raise exception 'invalid slug' using errcode='22023';end if;
 elsif operation='publish' then
  v:=public.write_company_branding('publish',branding_version,configuration);
 elsif operation<>'unpublish' or operation is null then raise exception 'invalid operation' using errcode='22023';end if;
 update public.company_portals set slug=case when operation='address' then requested_slug else slug end,
  is_public=case when operation='publish' then true when operation='unpublish' then false else is_public end,
  version=version+1,updated_at=now(),updated_by=auth.uid() where company_id=cid;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id,details)
 values(cid,auth.uid(),'portal.'||operation,cid,jsonb_build_object('previousSlug',row.slug,'slug',case when operation='address' then requested_slug else row.slug end,'version',row.version+1));
 return public.read_company_portal();
end;$$;
-- Explicit projection: no drafts, author identity, history, plan, login/panel backgrounds or original filenames.
create function app_private.public_portal_document(cid uuid,address text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare c jsonb;answer jsonb;assets jsonb:='{}';a jsonb;k text;portal jsonb:='{}';banners jsonb:='[]';b jsonb;
begin
 select published into c from public.company_branding where company_id=cid;if c is null or c='{}'::jsonb then return null;end if;
 foreach k in array array['logoMain','logoAlternative','logoLight','logoDark','favicon','avatar','shareImage'] loop
  a:=c#>array['assets',k];
  assets:=assets||jsonb_build_object(k,case when k in ('avatar','shareImage') or a is null or a='null'::jsonb then 'null'::jsonb else jsonb_build_object('id',a->>'id','kind',k,'name','Imagem publicada','url',a->>'url','format','PNG','size',0,'updatedAt','') end);
 end loop;
 foreach k in array array['headline','introduction','buttonText','coverImage','about','contactEmail','contactPhone','socialLinkedin','socialInstagram','footerText','showDepartments','showLocations','showFeaturedJobs','emptyStateTitle','emptyStateDescription','headerLinks','footerLinks','layout','content','footer','presentation'] loop
  if (c->'portal')?k then portal:=portal||jsonb_build_object(k,c#>array['portal',k]);end if;
 end loop;
 portal:=portal||'{"customDomain":"","jobforgedDomain":"","coverImage":""}'::jsonb;
 for b in select value from jsonb_array_elements(c->'banners') where coalesce((c#>>'{structure,showBanners}')::boolean,true) and value->>'status'='Ativo' and value->>'placement'<>'Home' order by (value->>'order')::integer loop
  banners:=banners||jsonb_build_array(jsonb_build_object('id',b->>'id','organizationId','public','createdAt','','updatedAt','','status','Ativo','title',b->>'title','description',b->>'description','buttonText',b->>'buttonText','link',b->>'link','image',b->>'image','startAt','','endAt','','placement','Portal','order',(b->>'order')::integer));
 end loop;
 answer:=jsonb_build_object('displayName',c->'displayName','shortName',c->'shortName','slogan','','assets',assets,'palette',c->'palette','theme',c->'theme','typography',c->'typography','structure',c->'structure','loaderEnabled',false,'banners',banners,'portal',portal,
  'backgrounds',jsonb_build_object('loginImage','','panelImage','','textureImage','','portalImage',c#>>'{backgrounds,portalImage}','coverImage',c#>>'{backgrounds,coverImage}','position',c#>>'{backgrounds,position}','fit',c#>>'{backgrounds,fit}','overlay',c#>>'{backgrounds,overlay}','opacity',c#>'{backgrounds,opacity}'));
 if coalesce(c#>>'{portal,presentation,showImage}','true')='false' then answer:=jsonb_set(jsonb_set(answer,'{backgrounds,coverImage}','""'),'{portal,presentation,imageAlt}','""');end if;
 if c#>>'{structure,showFooter}'='false' then
  answer:=answer#-'{portal,footer}';
  foreach k in array array['contactEmail','contactPhone','socialLinkedin','socialInstagram','footerText'] loop answer:=jsonb_set(answer,array['portal',k],'""');end loop;
  answer:=jsonb_set(answer,'{portal,footerLinks}','[]');
 end if;
 if c#>>'{structure,showHeader}'='false' then answer:=jsonb_set(answer,'{portal,headerLinks}','[]');end if;
 if c#>>'{structure,showHeader}'='false' and c#>>'{structure,showFooter}'='false' then
  foreach k in array array['logoMain','logoAlternative','logoLight','logoDark'] loop answer:=jsonb_set(answer,array['assets',k],'null');end loop;
 end if;
 if c#>>'{portal,presentation,showCulture}'='false' then answer:=jsonb_set(answer,'{portal,about}','""');end if;
 if (answer#>'{portal,content}') is not null then
  if c#>>'{portal,presentation,showCulture}'='false' then
   answer:=jsonb_set(answer,'{portal,about}','""');
   foreach k in array array['cultureEyebrow','cultureTitle','value0Title','value0Text','value1Title','value1Text','value2Title','value2Text'] loop answer:=answer#-array['portal','content',k];end loop;
  end if;
  if c#>>'{portal,presentation,showInvitation}'='false' then foreach k in array array['invitationTitle','invitationDescription','invitationButton'] loop answer:=answer#-array['portal','content',k];end loop;end if;
  if c#>>'{portal,presentation,showHighlights}'='false' then foreach k in array array['highlight0Title','highlight0Text','highlight1Title','highlight1Text','highlight2Title','highlight2Text','highlight3Title','highlight3Text'] loop answer:=answer#-array['portal','content',k];end loop;end if;
  if c#>>'{portal,presentation,showPhotoNotes}'='false' or c#>>'{portal,presentation,showImage}'='false' then foreach k in array array['photoTitle','photoSubtitle','photoChip'] loop answer:=answer#-array['portal','content',k];end loop;end if;
 end if;
 return regexp_replace(answer::text,'/api/company/branding/assets/([a-f0-9-]{36})','/api/portals/'||address||'/assets/\1','g')::jsonb;
end;$$;
create function public.read_public_company_portal(requested_slug text) returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('slug',p.slug,'version',b.published_version,'configuration',app_private.public_portal_document(p.company_id,p.slug))
 from public.company_portals p join public.companies c on c.id=p.company_id join public.company_branding b on b.company_id=p.company_id
 where app_private.valid_portal_slug(requested_slug) and p.slug=requested_slug and p.is_public and c.operational_status='active' and b.published<>'{}'::jsonb;
$$;
create function public.read_public_portal_asset(requested_slug text,asset_id uuid) returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('path',a.path,'size',a.size,'sha256',a.sha256) from public.company_branding_assets a
 join public.company_portals p on p.company_id=a.company_id join public.companies c on c.id=p.company_id
 where p.slug=requested_slug and app_private.valid_portal_slug(requested_slug) and p.is_public and c.operational_status='active' and a.id=asset_id
 and position('/api/portals/'||p.slug||'/assets/'||a.id::text in app_private.public_portal_document(p.company_id,p.slug)::text)>0;
$$;
create function app_private.public_portal_object_access(object_name text) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from public.company_branding_assets a join public.company_portals p on p.company_id=a.company_id join public.companies c on c.id=p.company_id
 where a.path=object_name and p.is_public and c.operational_status='active' and position('/api/portals/'||p.slug||'/assets/'||a.id::text in app_private.public_portal_document(p.company_id,p.slug)::text)>0);
$$;
-- Bucket remains private. Anonymous reads are restricted to the explicit current public projection.
grant select on storage.objects to anon;
create policy "Published portal images only" on storage.objects for select to anon using(bucket_id='company-branding' and app_private.public_portal_object_access(name));
alter table public.company_portals owner to postgres;
do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('read_company_portal','write_company_portal','read_public_company_portal','read_public_portal_asset')) or (n.nspname='app_private' and p.proname in ('valid_portal_slug','allocate_company_portal','public_portal_document','public_portal_object_access')) loop
  execute format('alter function %s owner to postgres',f.signature);execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end$$;
grant execute on function public.read_company_portal(),public.write_company_portal(text,bigint,text,bigint,jsonb) to authenticated;
grant execute on function public.read_public_company_portal(text),public.read_public_portal_asset(text,uuid) to anon,authenticated;
grant usage on schema app_private to anon;
grant execute on function app_private.public_portal_object_access(text) to anon;
notify pgrst,'reload schema';

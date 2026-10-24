-- migration-role: supabase_admin
-- Decimal GB, as approved: 1,000,000,000 bytes; immutable images include history.
create table app_private.company_upload_reservations (
 asset_id uuid primary key,
 company_id uuid not null references public.companies(id),
 user_id uuid not null references auth.users(id),
 session_id uuid not null,
 reserved_bytes integer not null default 5242880 check(reserved_bytes=5242880),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '5 minutes'
);
create index company_upload_reservations_company on app_private.company_upload_reservations(company_id,expires_at);
revoke all on app_private.company_upload_reservations from public,anon,authenticated,service_role;

create function public.reserve_company_image(asset_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid:=app_private.branding_company(); images bigint; bytes bigint; pending bigint;
begin
 perform app_private.security_gate();
 if asset_id is null or app_private.company_role(cid) not in ('owner','admin') then
  raise exception 'not authorized' using errcode='42501';end if;
 perform 1 from public.companies where id=cid for update;
 -- Objects, including unregistered/orphan objects, continue to consume quota.
 select count(*),coalesce(sum(greatest(coalesce((o.metadata->>'size')::bigint,5242880),0)),0)
 into images,bytes from storage.objects o
 where o.bucket_id='company-branding' and split_part(o.name,'/',1)=cid::text;
 select count(*) into pending from app_private.company_upload_reservations r
 where r.company_id=cid and r.expires_at>now()
 and not exists(select 1 from storage.objects o where o.bucket_id='company-branding' and o.name=cid::text||'/'||r.asset_id::text||'.png');
 if images+pending>=200 or bytes+(pending+1)*5242880>1000000000 then
  raise exception 'company image quota exceeded' using errcode='54000';end if;
 if pending>=2 then raise exception 'too many concurrent uploads' using errcode='53300';end if;
 if (select count(*) from app_private.company_upload_reservations r where r.company_id=cid and r.created_at>now()-interval '1 minute')>=5 then
  raise exception 'upload rate exceeded' using errcode='53300';end if;
 insert into app_private.company_upload_reservations(asset_id,company_id,user_id,session_id)
 values(asset_id,cid,auth.uid(),app_private.current_session_id());
 return jsonb_build_object('assetId',asset_id,'expiresIn',300,'maxBytes',5242880);
end;$$;
revoke all on function public.reserve_company_image(uuid) from public,anon;
grant execute on function public.reserve_company_image(uuid) to authenticated;

-- Reserve before processing, then validate against actual Storage metadata.
create or replace function public.register_company_brand_asset(asset_id uuid,file_name text,file_size integer,file_sha256 text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid:=app_private.branding_company(); actual_size bigint; result jsonb;
begin
 perform app_private.security_gate();
 perform 1 from public.companies where id=cid for update;
 if app_private.company_role(cid) not in ('owner','admin') or not exists(
  select 1 from app_private.company_upload_reservations r where r.asset_id=register_company_brand_asset.asset_id
  and r.company_id=cid and r.user_id=auth.uid() and r.session_id=app_private.current_session_id() and r.expires_at>now()) then
  raise exception 'upload reservation required' using errcode='42501';end if;
 select (o.metadata->>'size')::bigint into actual_size from storage.objects o
 where o.bucket_id='company-branding' and o.name=cid::text||'/'||asset_id::text||'.png';
 if actual_size is null or actual_size<>file_size or actual_size not between 1 and 5242880 then
  raise exception 'invalid stored size' using errcode='22023';end if;
 result:=app_private.security_legacy_register_company_brand_asset(asset_id,file_name,file_size,file_sha256);
 -- Keep reservation for its rate-limit window. The object replaces reserved usage.
 return jsonb_build_object('id',result->'id','company_id',result->'company_id','path',result->'path',
  'name',result->'name','size',result->'size','sha256',result->'sha256','created_by',result->'created_by','created_at',result->'created_at');
end;$$;
alter table app_private.company_upload_reservations owner to postgres;
alter function public.reserve_company_image(uuid) owner to postgres;
alter function public.register_company_brand_asset(uuid,text,integer,text) owner to postgres;

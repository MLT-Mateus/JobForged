-- migration-role: supabase_admin
-- Only abandoned, unregistered company uploads are eligible. Registered assets,
-- including every historical version, are retained regardless of current use.
create table app_private.orphan_quarantine(
 id uuid primary key default extensions.gen_random_uuid(),company_id uuid not null references public.companies(id),
 object_name text unique not null,observed_at timestamptz not null default now(),
 sha256 text check(sha256 is null or sha256~'^[0-9a-f]{64}$'),bytes integer,
 verified_at timestamptz,source_removed_at timestamptz,purge_approved_at timestamptz,purged_at timestamptz
);
revoke all on app_private.orphan_quarantine from public,anon,authenticated,service_role;
create function app_private.orphan_eligible(path text) returns boolean language plpgsql stable security definer set search_path=pg_catalog as $$
declare cid uuid;asset uuid;
begin
 if path!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$' then return false;end if;
 cid:=split_part(path,'/',1)::uuid;asset:=replace(split_part(path,'/',2),'.png','')::uuid;
 return exists(select 1 from public.companies where id=cid)
 and exists(select 1 from storage.objects where bucket_id='company-branding' and name=path and created_at<now()-interval '24 hours')
 and not exists(select 1 from public.company_branding_assets a where a.id=asset or a.path=$1)
 and not exists(select 1 from public.company_branding where company_id=cid and (position(asset::text in draft::text)>0 or position(asset::text in published::text)>0))
 and not exists(select 1 from public.company_branding_history where company_id=cid and position(asset::text in snapshot::text)>0)
 and not exists(select 1 from app_private.company_upload_reservations where asset_id=asset and expires_at>now());
end;$$;
create function app_private.orphan_capability(queue_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select auth.uid()='00000000-0000-4000-8000-000000000084'::uuid
 and auth.jwt()->>'maintenance'='orphan-cleanup' and auth.jwt()->>'job'=queue_id::text
 and (auth.jwt()->>'exp')::bigint<=extract(epoch from now())+180;
$$;
create function app_private.orphan_storage_access(bucket text,path text,writing boolean) returns boolean language plpgsql stable security definer set search_path=pg_catalog as $$
declare q app_private.orphan_quarantine;
begin
 if coalesce(auth.jwt()->>'job','')!~'^[0-9a-f-]{36}$' then return false;end if;
 select * into q from app_private.orphan_quarantine where id=(auth.jwt()->>'job')::uuid;
 if not found or not app_private.orphan_capability(q.id) then return false;end if;
 if bucket='company-branding' then return not writing and path=q.object_name and app_private.orphan_eligible(path);end if;
 return bucket='security-quarantine' and path=q.id::text||'/image.png' and q.purged_at is null;
end;$$;
create function app_private.orphan_delete_allowed(bucket text,path text) returns boolean language plpgsql volatile security definer set search_path=pg_catalog as $$
declare q app_private.orphan_quarantine;
begin
 if coalesce(auth.jwt()->>'job','')!~'^[0-9a-f-]{36}$' then return false;end if;
 select * into q from app_private.orphan_quarantine where id=(auth.jwt()->>'job')::uuid;
 if not found or not app_private.orphan_capability(q.id) then return false;end if;
 perform 1 from public.companies where id=q.company_id for update;
 if bucket='security-quarantine' then
  return path=q.id::text||'/image.png' and q.source_removed_at is not null and q.purge_approved_at is not null
  and q.verified_at<now()-interval '7 days' and q.purged_at is null;
 end if;
 return bucket='company-branding' and path=q.object_name and q.verified_at is not null
 and q.source_removed_at is null and app_private.orphan_eligible(path);
 -- Only the root worker can record a verified offsite receipt and approve purge.
end;$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('security-quarantine','security-quarantine',false,5242880,array['image/png']);
create policy "Maintenance reads exact orphan or quarantine" on storage.objects for select to authenticated
using(app_private.orphan_storage_access(bucket_id,name,false));
create policy "Maintenance inserts exact private quarantine" on storage.objects for insert to authenticated
with check(app_private.orphan_storage_access(bucket_id,name,true));
create policy "Maintenance removes verified abandoned source" on storage.objects for delete to authenticated
using(app_private.orphan_delete_allowed(bucket_id,name));
alter table app_private.orphan_quarantine owner to postgres;
alter function app_private.orphan_eligible(text) owner to postgres;
alter function app_private.orphan_capability(uuid) owner to postgres;
alter function app_private.orphan_storage_access(text,text,boolean) owner to postgres;
alter function app_private.orphan_delete_allowed(text,text) owner to postgres;
revoke all on function app_private.orphan_eligible(text),app_private.orphan_capability(uuid),app_private.orphan_storage_access(text,text,boolean),app_private.orphan_delete_allowed(text,text) from public,anon,authenticated,service_role;
grant execute on function app_private.orphan_storage_access(text,text,boolean),app_private.orphan_delete_allowed(text,text) to authenticated;

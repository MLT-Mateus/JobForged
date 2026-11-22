-- migration-role: supabase_admin
-- History is fetched in bounded pages, scoped to the active company and role.
create function public.company_branding_history_page(page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare cid uuid; result jsonb;
begin
 perform app_private.security_gate();cid:=app_private.branding_company();
 if coalesce(app_private.company_role(cid),'') not in ('owner','admin') then raise exception 'denied' using errcode='42501';end if;
 if page_number is null or page_number<1 or page_number>100000 then raise exception 'invalid page' using errcode='22023';end if;
 select jsonb_build_object('total',(select count(*) from public.company_branding_history where company_id=cid),'items',coalesce((select jsonb_agg(x order by x.version desc) from (
 select h.id,h.version,h.snapshot,h.created_at,coalesce(nullif(m.full_name,''),u.email,'Integrante da equipe') actor
 from public.company_branding_history h left join auth.users u on u.id=h.actor_id left join public.company_members m on m.user_id=h.actor_id and m.company_id=cid
 where h.company_id=cid order by h.version desc limit 10 offset (page_number-1)*10)x),'[]'::jsonb)) into result;
 return result;
end;$$;
alter function public.company_branding_history_page(integer) owner to postgres;
revoke all on function public.company_branding_history_page(integer) from public,anon,authenticated,service_role;
grant execute on function public.company_branding_history_page(integer) to authenticated;
notify pgrst,'reload schema';

create or replace function public.read_company_branding()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare cid uuid:=app_private.branding_company();editable boolean;result jsonb;
begin
 perform app_private.security_gate();
 editable:=app_private.company_role(cid) in ('owner','admin');
 select jsonb_build_object('companyId',cid,'companyName',c.name,'editable',editable,'version',coalesce(b.version,0),
  'draft',case when editable then coalesce(b.draft,'{}'::jsonb) else null end,'published',coalesce(b.published,'{}'::jsonb),
  'publishedVersion',coalesce(b.published_version,0),'updatedAt',b.updated_at,'publishedAt',b.published_at,'publishedBy',case when editable then u.email end,
  'history',case when editable then coalesce((select jsonb_agg(x) from (select h.id,h.version,h.snapshot,h.created_at,coalesce(a.email,h.actor_id::text) actor from public.company_branding_history h left join auth.users a on a.id=h.actor_id where h.company_id=cid order by h.created_at desc,h.id limit 10)x),'[]'::jsonb) else '[]'::jsonb end)
  into result from public.companies c left join public.company_branding b on b.company_id=c.id left join auth.users u on u.id=b.published_by where c.id=cid;
 return result;
end;$$;
notify pgrst,'reload schema';

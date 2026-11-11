-- migration-role: supabase_admin
alter table public.company_members add column photo_version bigint not null default 0;
create table app_private.member_photos(
 member_id uuid primary key references public.company_members(id) on delete cascade,
 photo text not null check(length(photo)<=87384),thumbnail text not null check(length(thumbnail)<=21848)
);
alter table app_private.member_photos owner to postgres;
revoke all on app_private.member_photos from public,anon,authenticated,service_role;
create function public.member_photo_write_v1(photo text,thumbnail text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare member public.company_members;
begin
 perform app_private.security_gate();
 select * into member from public.company_members m where m.user_id=auth.uid() and m.status='active' and app_private.is_company_member(m.company_id) for update;
 if member.id is null or public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 perform app_private.consume_operation_budget('member-photo',member.id,12,3600);
 if (photo is null)<>(thumbnail is null) then raise exception 'invalid photo' using errcode='22023';end if;
 if photo is null then delete from app_private.member_photos where member_id=member.id;
 else
  if length(photo)>87384 or length(thumbnail)>21848 or photo !~ '^[A-Za-z0-9+/]+={0,2}$' or thumbnail !~ '^[A-Za-z0-9+/]+={0,2}$'
   or substring(decode(photo,'base64') from 1 for 4)<>convert_to('RIFF','UTF8') or substring(decode(photo,'base64') from 9 for 4)<>convert_to('WEBP','UTF8')
   or substring(decode(thumbnail,'base64') from 1 for 4)<>convert_to('RIFF','UTF8') or substring(decode(thumbnail,'base64') from 9 for 4)<>convert_to('WEBP','UTF8') then raise exception 'invalid photo' using errcode='22023';end if;
  insert into app_private.member_photos values(member.id,photo,thumbnail) on conflict(member_id) do update set photo=excluded.photo,thumbnail=excluded.thumbnail;
 end if;
 update public.company_members set photo_version=photo_version+1 where id=member.id returning * into member;
 insert into public.company_audit_events(company_id,actor_user_id,action,target_id) values(member.company_id,auth.uid(),case when photo is null then 'member.photo_removed' else 'member.photo_updated' end,member.id);
 return jsonb_build_object('memberId',member.id,'photoVersion',case when photo is null then 0 else member.photo_version end);
end;$$;
create function public.member_photo_read_v1(member_id uuid,small boolean default true) returns text
language plpgsql stable security definer set search_path=pg_catalog as $$
declare result text;
begin
 perform app_private.security_gate();
 if public.is_platform_admin() then raise exception 'not authorized' using errcode='42501';end if;
 select case when small then p.thumbnail else p.photo end into result from app_private.member_photos p join public.company_members m on m.id=p.member_id
 where m.id=member_photo_read_v1.member_id and app_private.is_company_member(m.company_id) and (m.status='active' or app_private.company_role(m.company_id) in ('owner','admin'));
 return result;
end;$$;
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.company_read_v1()'::regprocedure);
 definition:=replace(definition,'''full_name'',m.full_name','''photo_version'',case when exists(select 1 from app_private.member_photos p where p.member_id=m.id) then m.photo_version else 0 end,''full_name'',m.full_name');execute definition;
 definition:=pg_get_functiondef('public.account_read_v1()'::regprocedure);
 definition:=replace(definition,'''fullName'',m.full_name','''memberId'',m.id,''photoVersion'',case when exists(select 1 from app_private.member_photos p where p.member_id=m.id) then m.photo_version else 0 end,''fullName'',m.full_name');execute definition;
end;$$;
revoke all on function public.member_photo_write_v1(text,text),public.member_photo_read_v1(uuid,boolean) from public,anon,service_role;
grant execute on function public.member_photo_write_v1(text,text),public.member_photo_read_v1(uuid,boolean) to authenticated;
alter function public.member_photo_write_v1(text,text) owner to postgres;
alter function public.member_photo_read_v1(uuid,boolean) owner to postgres;
notify pgrst,'reload schema';

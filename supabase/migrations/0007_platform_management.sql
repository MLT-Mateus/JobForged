-- Platform operations: no direct client writes; identity comes from auth.uid().
alter table public.companies add column operational_status text not null default 'active'
  check (operational_status in ('active','suspended'));

create table public.platform_settings (
  singleton boolean primary key default true check (singleton),
  platform_name text not null default 'JobForged' check (length(platform_name) between 2 and 80),
  support_email text not null default 'suporte@jobforged.com',
  support_url text not null default 'https://api.whatsapp.com/send/?phone=5561991630130',
  updated_at timestamptz not null default now()
);
insert into public.platform_settings(singleton) values(true);
create table public.platform_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  company_id uuid references public.companies(id),
  target_id uuid,
  action text not null,
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index platform_audit_time on public.platform_audit_events(created_at desc,id desc);
create index company_audit_time on public.company_audit_events(created_at desc,id desc);
alter table public.platform_settings enable row level security;
alter table public.platform_audit_events enable row level security;
revoke all on public.platform_settings, public.platform_audit_events from public, anon, authenticated;

-- This helper is used by both roster/company RLS policies, including direct REST access.
create or replace function app_private.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
 select exists(select 1 from public.company_members m join public.companies c on c.id=m.company_id
 where m.company_id=target_company_id and m.user_id=auth.uid() and m.status='active' and c.operational_status='active');
$$;
create or replace function app_private.company_role(target_company_id uuid)
returns text language sql stable security definer set search_path = pg_catalog, public as $$
 select coalesce((select m.role from public.company_members m join public.companies c on c.id=m.company_id
 where m.company_id=target_company_id and m.user_id=auth.uid() and m.status='active' and c.operational_status='active' limit 1),'');
$$;

-- Serialize member changes and protect the final active owner across all write paths.
create function app_private.protect_company_membership()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare state text;
begin
 select operational_status into state from public.companies where id=new.company_id for update;
 if state <> 'active' and not public.is_platform_admin() then
   raise exception 'company suspended' using errcode='42501';
 end if;
 if tg_op='UPDATE' then
   if old.company_id<>new.company_id or old.user_id<>new.user_id then
     raise exception 'membership identity immutable' using errcode='42501';
   end if;
   if old.role='owner' and old.status='active' and (new.role<>'owner' or new.status<>'active')
      and not exists(select 1 from public.company_members where company_id=new.company_id and id<>new.id and role='owner' and status='active') then
     raise exception 'last owner cannot be removed' using errcode='42501';
   end if;
 end if;
 return new;
end;
$$;
revoke all on function app_private.protect_company_membership() from public,anon,authenticated;
create trigger protect_company_membership before insert or update on public.company_members
for each row execute function app_private.protect_company_membership();

create or replace function public.company_invitation_matches(invitation_token text, invite_email text)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
 select coalesce(invitation_token ~ '^[0-9a-f]{64}$' and exists(
  select 1 from public.company_invitations i join public.companies c on c.id=i.company_id
  where i.token_hash=encode(extensions.digest(invitation_token,'sha256'),'hex') and i.email=lower(trim(invite_email))
  and i.accepted_at is null and i.revoked_at is null and i.expires_at>now() and c.operational_status='active'),false);
$$;

create function app_private.valid_cnpj(value text)
returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare digits text; sum_value integer; remainder integer; position integer; weights integer[];
begin
 if value is null or value='' then return true; end if;
 if value !~ '^[0-9]{14}$' or value=repeat(substr(value,1,1),14) then return false; end if;
 digits:=substr(value,1,12);
 for position in 1..2 loop
  weights:=case when position=1 then array[5,4,3,2,9,8,7,6,5,4,3,2] else array[6,5,4,3,2,9,8,7,6,5,4,3,2] end;
  select sum(substr(digits,n,1)::integer*weights[n]) into sum_value from generate_series(1,length(digits)) n;
  remainder:=sum_value%11;
  digits:=digits || (case when remainder<2 then 0 else 11-remainder end)::text;
 end loop;
 return digits=value;
end;
$$;
revoke all on function app_private.valid_cnpj(text) from public,anon,authenticated;

create function public.platform_public_settings()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
 select jsonb_build_object('platform_name',platform_name,'support_email',support_email,'support_url',support_url)
 from public.platform_settings where singleton;
$$;
revoke all on function public.platform_public_settings() from public;
grant execute on function public.platform_public_settings() to anon,authenticated;

create function public.platform_read(section text, search_text text default '', status_filter text default '', page_number integer default 1, company_filter uuid default null)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, auth as $$
declare result jsonb; query_text text; skip_rows integer;
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 if page_number is null or page_number<1 or page_number>10000 or length(coalesce(search_text,''))>160 then
   raise exception 'invalid query' using errcode='22023';
 end if;
 query_text := '%' || replace(replace(replace(coalesce(search_text,''),'\','\\'),'%','\%'),'_','\_') || '%';
 skip_rows := (page_number-1)*25;
 if section='overview' then
   select jsonb_build_object(
    'companies',(select count(*) from public.companies),
    'active_companies',(select count(*) from public.companies where operational_status='active'),
    'suspended_companies',(select count(*) from public.companies where operational_status='suspended'),
    'users',(select count(distinct user_id) from public.company_members),
    'members',(select count(*) from public.company_members),
    'pending_invitations',(select count(*) from public.company_invitations where accepted_at is null and revoked_at is null and expires_at>now()),
    'expired_invitations',(select count(*) from public.company_invitations where accepted_at is null and revoked_at is null and expires_at<=now())
   ) into result;
 elsif section='companies' then
   with records as (select c.id,c.name,c.cnpj,c.phone,c.plan_id,c.plan_status,c.operational_status,c.created_at
    from public.companies c where (c.name ilike query_text or coalesce(c.cnpj,'') ilike query_text)
    and (coalesce(status_filter,'')='' or c.operational_status=status_filter))
   select jsonb_build_object('total',(select count(*) from records),'items',coalesce((select jsonb_agg(x) from
    (select * from records order by created_at desc,id limit 25 offset skip_rows) x),'[]'::jsonb)) into result;
 elsif section='company' then
   select jsonb_build_object('company',to_jsonb(c),
    'members',coalesce((select jsonb_agg(x) from (select id,user_id,email,full_name,role,status,created_at from public.company_members where company_id=c.id order by created_at,id) x),'[]'::jsonb),
    'invitations',coalesce((select jsonb_agg(x) from (select id,email,role,expires_at,accepted_at,revoked_at,created_at from public.company_invitations where company_id=c.id order by created_at desc,id limit 25) x),'[]'::jsonb))
   into result from public.companies c where c.id=company_filter;
   if result is null then raise exception 'company not found' using errcode='22023'; end if;
 elsif section='users' then
   with records as (select m.id,m.user_id,m.company_id,m.email,m.full_name,m.role,m.status,m.created_at,c.name company_name,
    u.email_confirmed_at is not null email_verified from public.company_members m
    join public.companies c on c.id=m.company_id join auth.users u on u.id=m.user_id
    where (m.email ilike query_text or m.full_name ilike query_text or c.name ilike query_text)
    and (coalesce(status_filter,'')='' or m.status=status_filter) and (company_filter is null or m.company_id=company_filter))
   select jsonb_build_object('total',(select count(*) from records),'items',coalesce((select jsonb_agg(x) from
    (select * from records order by created_at desc,id limit 25 offset skip_rows) x),'[]'::jsonb)) into result;
 elsif section='invitations' then
   with records as (select i.id,i.company_id,c.name company_name,i.email,i.role,i.created_at,i.expires_at,
    case when i.accepted_at is not null then 'accepted' when i.revoked_at is not null then 'revoked' when i.expires_at<=now() then 'expired' else 'pending' end status
    from public.company_invitations i join public.companies c on c.id=i.company_id
    where (i.email ilike query_text or c.name ilike query_text) and (company_filter is null or i.company_id=company_filter)),
    filtered as (select * from records where coalesce(status_filter,'')='' or status=status_filter)
   select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(x) from
    (select * from filtered order by created_at desc,id limit 25 offset skip_rows) x),'[]'::jsonb)) into result;
 elsif section='audit' then
   with records as (
    select 'platform:'||id id,actor_user_id,company_id,target_id,action,reason,details,created_at from public.platform_audit_events
    union all
    select 'company:'||id,actor_user_id,company_id,target_id,action,'' reason,details,created_at from public.company_audit_events where action not like 'platform.%'
   ), filtered as (select r.*,c.name company_name,u.email actor_email from records r left join public.companies c on c.id=r.company_id left join auth.users u on u.id=r.actor_user_id
    where (r.action ilike query_text or coalesce(c.name,'') ilike query_text or r.reason ilike query_text)
    and (company_filter is null or r.company_id=company_filter) and (coalesce(status_filter,'')='' or r.action=status_filter))
   select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(x) from
    (select * from filtered order by created_at desc,id limit 25 offset skip_rows) x),'[]'::jsonb)) into result;
 elsif section='settings' then
   select to_jsonb(s) into result from public.platform_settings s where singleton;
 else raise exception 'invalid section' using errcode='22023'; end if;
 return result;
end;
$$;

create function public.platform_manage(operation text, target_company uuid, target_record uuid, values_json jsonb, change_reason text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare company public.companies; member public.company_members; invitation public.company_invitations;
 before_value jsonb; after_value jsonb; token text; created_id uuid; settings public.platform_settings;
begin
 if not public.is_platform_admin() then raise exception 'not authorized' using errcode='42501'; end if;
 if length(trim(coalesce(change_reason,'')))<5 or length(change_reason)>500 or values_json is null or jsonb_typeof(values_json)<>'object' then
   raise exception 'reason and fields required' using errcode='22023'; end if;
 if operation='settings.update' then
   select * into settings from public.platform_settings where singleton for update;
   before_value:=to_jsonb(settings);
   if values_json - array['platform_name','support_email','support_url'] <> '{}'::jsonb
     or length(trim(coalesce(values_json->>'platform_name','')))<2 or length(values_json->>'platform_name')>80
     or length(coalesce(values_json->>'support_email',''))>254 or coalesce(values_json->>'support_email','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(coalesce(values_json->>'support_url',''))>500 or coalesce(values_json->>'support_url','') !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:]<>"\\]*)?$'
     then raise exception 'invalid settings' using errcode='22023'; end if;
   update public.platform_settings set platform_name=trim(values_json->>'platform_name'),support_email=lower(trim(values_json->>'support_email')),
    support_url=values_json->>'support_url',updated_at=now() where singleton returning to_jsonb(platform_settings.*) into after_value;
   target_company:=null; target_record:=null;
 else
   select * into company from public.companies where id=target_company for update;
   if not found then raise exception 'company unavailable' using errcode='22023'; end if;
   if operation='company.update' then
     if values_json - array['name','cnpj','phone'] <> '{}'::jsonb or length(trim(coalesce(values_json->>'name','')))<2
      or length(values_json->>'name')>160 or not app_private.valid_cnpj(values_json->>'cnpj')
      or coalesce(values_json->>'phone','') !~ '^([0-9]{10,13})?$' then raise exception 'invalid profile' using errcode='22023'; end if;
     before_value:=jsonb_build_object('name',company.name,'cnpj',company.cnpj,'phone',company.phone);
     update public.companies set name=trim(values_json->>'name'),cnpj=nullif(values_json->>'cnpj',''),phone=nullif(values_json->>'phone','') where id=company.id;
     after_value:=values_json; target_record:=company.id;
   elsif operation='company.status' then
     if values_json - 'status' <> '{}'::jsonb or coalesce(values_json->>'status','') not in ('active','suspended') then raise exception 'invalid status' using errcode='22023'; end if;
     before_value:=jsonb_build_object('status',company.operational_status);
     update public.companies set operational_status=values_json->>'status' where id=company.id;
     after_value:=values_json; target_record:=company.id;
   elsif operation='member.update' then
     if values_json - array['role','status'] <> '{}'::jsonb or coalesce(values_json->>'role','') not in ('owner','admin','member')
      or coalesce(values_json->>'status','') not in ('active','inactive') then raise exception 'invalid member' using errcode='22023'; end if;
     select * into member from public.company_members where id=target_record and company_id=company.id for update;
     if not found or exists(select 1 from public.platform_admins where user_id=member.user_id) then raise exception 'member unavailable' using errcode='42501'; end if;
     before_value:=jsonb_build_object('role',member.role,'status',member.status);
     update public.company_members set role=values_json->>'role',status=values_json->>'status' where id=member.id;
     after_value:=values_json;
   elsif operation in ('invitation.create','invitation.resend') then
     if company.operational_status<>'active' then raise exception 'company suspended' using errcode='42501'; end if;
     if operation='invitation.resend' then
       select * into invitation from public.company_invitations where id=target_record and company_id=company.id for update;
       if not found or invitation.accepted_at is not null then raise exception 'invitation unavailable' using errcode='22023'; end if;
       values_json:=jsonb_build_object('email',invitation.email,'role',invitation.role);
     end if;
     if values_json - array['email','role'] <> '{}'::jsonb or coalesce(values_json->>'role','') not in ('admin','member')
      or length(coalesce(values_json->>'email',''))>254 or coalesce(values_json->>'email','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid invitation' using errcode='22023'; end if;
     if exists(select 1 from public.company_members where company_id=company.id and lower(email)=lower(trim(values_json->>'email')) and status='active') then raise exception 'already member' using errcode='23505'; end if;
     update public.company_invitations set revoked_at=now() where company_id=company.id and email=lower(trim(values_json->>'email')) and accepted_at is null and revoked_at is null;
     token:=encode(extensions.gen_random_bytes(32),'hex');
     insert into public.company_invitations(company_id,email,role,token_hash,invited_by,expires_at)
     values(company.id,lower(trim(values_json->>'email')),values_json->>'role',encode(extensions.digest(token,'sha256'),'hex'),auth.uid(),now()+interval '24 hours') returning id into created_id;
     target_record:=created_id; after_value:=jsonb_build_object('email',lower(trim(values_json->>'email')),'role',values_json->>'role');
   elsif operation='invitation.revoke' then
     update public.company_invitations set revoked_at=now() where id=target_record and company_id=company.id and accepted_at is null and revoked_at is null;
     if not found then raise exception 'invitation unavailable' using errcode='22023'; end if;
     after_value:=jsonb_build_object('revoked',true);
   else raise exception 'invalid operation' using errcode='22023'; end if;
 end if;
 insert into public.platform_audit_events(actor_user_id,company_id,target_id,action,reason,details)
 values(auth.uid(),target_company,target_record,'platform.'||operation,trim(change_reason),jsonb_build_object('before',before_value,'after',after_value));
 if target_company is not null then
   insert into public.company_audit_events(company_id,actor_user_id,target_id,action,details)
   values(target_company,auth.uid(),target_record,'platform.'||operation,jsonb_build_object('reason',trim(change_reason),'before',before_value,'after',after_value));
 end if;
 -- Token is returned only to the authenticated server call, never to the UI or audit.
 return jsonb_strip_nulls(jsonb_build_object('ok',true,'id',target_record,'token',token,'email',after_value->>'email','company_name',company.name));
end;
$$;
revoke all on function public.platform_read(text,text,text,integer,uuid),public.platform_manage(text,uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.platform_read(text,text,text,integer,uuid),public.platform_manage(text,uuid,uuid,jsonb,text) to authenticated;
notify pgrst, 'reload schema';

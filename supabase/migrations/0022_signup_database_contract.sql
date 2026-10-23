-- migration-role: supabase_admin
-- Match the existing signup form contract even when GoTrue is called directly.
create or replace function public.handle_new_company_admin() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare cid uuid; company_name text; responsible_name text; cnpj text; phone text;
begin
 if coalesce(new.raw_user_meta_data->>'account_type','')<>'company_admin' then return new;end if;
 company_name:=trim(coalesce(new.raw_user_meta_data->>'company_name',''));
 responsible_name:=trim(coalesce(new.raw_user_meta_data->>'responsible_name',''));
 cnpj:=regexp_replace(coalesce(new.raw_user_meta_data->>'company_cnpj',''),'\D','','g');
 phone:=regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'\D','','g');
 if length(company_name) not between 2 and 160 or length(responsible_name) not between 3 and 120
 or not app_private.valid_cnpj(cnpj) or phone !~ '^[0-9]{10,11}$'
 or new.email is null or new.raw_user_meta_data->>'terms_accepted_at' is null then
  raise exception 'invalid company signup' using errcode='22023';end if;
 -- Validate acceptance format, but record server time rather than client time.
 perform (new.raw_user_meta_data->>'terms_accepted_at')::timestamptz;
 insert into public.companies(name,cnpj,phone,plan_id,plan_status,terms_accepted_at)
 values(company_name,cnpj,phone,'freemium','free',now()) returning id into cid;
 insert into public.company_members(company_id,user_id,email,full_name,role,status)
 values(cid,new.id,lower(new.email),responsible_name,'owner','active');
 return new;
end;$$;
revoke all on function public.handle_new_company_admin() from public,anon,authenticated,service_role;
alter function public.handle_new_company_admin() owner to postgres;

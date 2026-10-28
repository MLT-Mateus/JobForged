begin;
insert into auth.users(id,email,email_confirmed_at) values
('17100000-0000-4000-8000-000000000001','compat-owner@example.invalid',now()),
('17100000-0000-4000-8000-000000000002','compat-member@example.invalid',now()),
('17100000-0000-4000-8000-000000000003','compat-other@example.invalid',now()),
('17100000-0000-4000-8000-000000000004','compat-unlinked@example.invalid',now());
insert into public.companies(id,name) values('17100000-0000-4000-8000-000000000011','Compat A'),('17100000-0000-4000-8000-000000000012','Compat B');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values
('17100000-0000-4000-8000-000000000011','17100000-0000-4000-8000-000000000001','compat-owner@example.invalid','Compat Owner','owner','active'),
('17100000-0000-4000-8000-000000000011','17100000-0000-4000-8000-000000000002','compat-member@example.invalid','Compat Member','member','active'),
('17100000-0000-4000-8000-000000000012','17100000-0000-4000-8000-000000000003','compat-other@example.invalid','Compat Other','owner','active');
alter table public.companies add column compat_secret text default 'PRIVATE';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17100000-0000-4000-8000-000000000001"}',true);
do $$declare result jsonb;begin
 if (select count(*) from public.companies)<>1 then raise exception 'legacy RLS changed';end if;
 result:=public.company_read_v1();
 if result->'company' ? 'compat_secret' then raise exception 'RPC exposed future column';end if;
 if result->'company'->>'id'<>'17100000-0000-4000-8000-000000000011' then raise exception 'tenant mismatch';end if;
 if result#>>'{members,0,email}' is null then raise exception 'owner contract incomplete';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"17100000-0000-4000-8000-000000000002"}',true);
do $$declare result jsonb;begin
 result:=public.company_read_v1();
 if exists(select 1 from jsonb_array_elements(result->'members') m where m ? 'email') then raise exception 'member received roster email';end if;
 if result->'audit'<>'[]'::jsonb then raise exception 'member received audit';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"17100000-0000-4000-8000-000000000004"}',true);
do $$begin
 if public.session_context_v1() is not null then raise exception 'unlinked context';end if;
 begin perform public.company_read_v1();raise exception 'unlinked read';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'compatibility_contracts_passed';

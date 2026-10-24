begin;
set local role anon;
do $$declare revision text:=public.registration_requirements()->>'termsRevision';begin
 begin perform public.create_company_signup_intent('signup-fixture@example.invalid','Signup fixture','Fixture Owner','','11999999999',revision,true);raise exception 'missing signup CNPJ accepted';exception when invalid_parameter_value then null;end;
 begin perform public.create_company_signup_intent('signup-fixture@example.invalid','Signup fixture','Fixture Owner','11222333000181','11999999999',revision,false);raise exception 'unaccepted terms accepted';exception when invalid_parameter_value then null;end;
 begin perform public.create_company_signup_intent('signup-fixture@example.invalid','Signup fixture','Fixture Owner','11222333000181','11999999999',repeat('0',64),true);raise exception 'unknown terms accepted';exception when invalid_parameter_value then null;end;
 perform set_config('jbfd.signup_fixture_nonce',public.create_company_signup_intent('signup-fixture@example.invalid','Signup fixture','Fixture Owner','11222333000181','11999999999',revision,true),true);
end$$;
reset role;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values('19100000-0000-4000-8000-000000000001','signup-fixture@example.invalid',now(),
jsonb_build_object('account_type','company_admin','company_signup_nonce',current_setting('jbfd.signup_fixture_nonce'),'company_name','Forged company','role','platform_admin','plan_id','paid'));
do $$declare cid uuid;begin
 select company_id into cid from public.company_members where user_id='19100000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.companies where id=cid and name='Signup fixture' and plan_id='freemium' and terms_revision=public.registration_requirements()->>'termsRevision') then raise exception 'signup contract mismatch';end if;
 if exists(select 1 from public.platform_admins where user_id='19100000-0000-4000-8000-000000000001') then raise exception 'metadata granted platform admin';end if;
 if exists(select 1 from auth.users where id='19100000-0000-4000-8000-000000000001' and raw_user_meta_data ? 'company_signup_nonce') then raise exception 'raw signup capability persisted';end if;
 begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('19100000-0000-4000-8000-000000000002','different-signup@example.invalid',now(),jsonb_build_object('account_type','company_admin','company_signup_nonce',current_setting('jbfd.signup_fixture_nonce')));
  raise exception 'signup intent reused';
 exception when insufficient_privilege then null;end;
 begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('19100000-0000-4000-8000-000000000003','no-intent@example.invalid',now(),'{"account_type":"company_admin","company_name":"Forged company"}');
  raise exception 'signup without intent accepted';
 exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'signup_contracts_passed';

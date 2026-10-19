-- Test only. Prepend a transaction, the migration if not applied, and branding-fixture.mjs output.
select set_config('jbfd.test_admin',(select user_id::text from public.platform_admins limit 1),true);
insert into auth.users(id,email,email_confirmed_at) values
 ('38000000-0000-0000-0000-000000000001','branding-owner@example.invalid',now()),
 ('38000000-0000-0000-0000-000000000002','branding-member@example.invalid',now()),
 ('38000000-0000-0000-0000-000000000003','branding-other@example.invalid',now());
insert into public.companies(id,name) values ('38000000-0000-0000-0000-000000000011','Fixture Branding'),('38000000-0000-0000-0000-000000000012','Other Branding');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values
 ('38000000-0000-0000-0000-000000000011','38000000-0000-0000-0000-000000000001','branding-owner@example.invalid','Fixture Owner','owner','active'),
 ('38000000-0000-0000-0000-000000000011','38000000-0000-0000-0000-000000000002','branding-member@example.invalid','Fixture Member','member','active'),
 ('38000000-0000-0000-0000-000000000012','38000000-0000-0000-0000-000000000003','branding-other@example.invalid','Fixture Other','owner','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','38000000-0000-0000-0000-000000000001',true);
do $$declare config jsonb:=current_setting('jbfd.fixture_config')::jsonb;v bigint;result jsonb;pair text;
begin
 if public.read_company_branding()->>'companyId'<>'38000000-0000-0000-0000-000000000011' then raise exception 'wrong company';end if;
 v:=public.write_company_branding('save',0,config);
 result:=public.read_company_branding();if result->'published'<>'{}'::jsonb or result->'draft'<>config then raise exception 'draft published early';end if;
 perform public.write_company_branding('publish',v,config);
 result:=public.read_company_branding();if result->'published'<>config or jsonb_array_length(result->'history')<>1 then raise exception 'publication missing';end if;
 perform set_config('jbfd.history_id',result#>>'{history,0,id}',true);
 begin perform public.write_company_branding('save',v,config);raise exception 'stale version accepted';exception when serialization_failure then null;end;
 foreach pair in array array['jobforged','contemporaneo','objetivo','editorial'] loop
  v:=(public.read_company_branding()->>'version')::bigint;
  perform public.write_company_branding('save',v,jsonb_set(config,'{typography,fontPair}',to_jsonb(pair)));
 end loop;
 v:=(public.read_company_branding()->>'version')::bigint;
 begin perform public.write_company_branding('save',v,config||'{"publishedBy":"forged"}'::jsonb);raise exception 'forged metadata accepted';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('save',v,jsonb_set(config,'{typography,fontPair}','"injected-font"'));raise exception 'unapproved font accepted';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('publish',v,jsonb_set(config,'{theme,light,text}',config#>'{theme,light,surface}'));raise exception 'low contrast accepted';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('save',v,jsonb_set(config,'{backgrounds,coverImage}','"data:image/svg+xml,evil"'));raise exception 'unsafe image accepted';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('save',v,jsonb_set(config,'{portal,socialLinkedin}','"javascript:alert(1)"'));raise exception 'unsafe URL accepted';exception when invalid_parameter_value then null;end;
 v:=public.write_company_branding('reset',v,config);
 v:=public.write_company_branding('restore',v,null,current_setting('jbfd.history_id')::uuid);
 v:=public.write_company_branding('discard',v);
 result:=public.read_company_branding();if result->'draft'<>result->'published' or jsonb_array_length(result->'history')<>1 then raise exception 'history lost';end if;
 begin update public.company_branding_history set snapshot='{}';raise exception 'history mutable';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name) values('company-branding','38000000-0000-0000-0000-000000000011/38000000-0000-0000-0000-000000000031.png');raise exception 'client bypassed image processor';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','38000000-0000-0000-0000-000000000002',true);
do $$declare result jsonb;begin
 result:=public.read_company_branding();if result->>'editable'<>'false' or result->'draft'<>'null'::jsonb or result->'history'<>'[]'::jsonb then raise exception 'member draft leak';end if;
 begin perform public.write_company_branding('save',(result->>'version')::bigint,current_setting('jbfd.fixture_config')::jsonb);raise exception 'member write';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','38000000-0000-0000-0000-000000000003',true);
do $$begin
 if public.read_company_branding()->'published'<>'{}'::jsonb then raise exception 'cross company read';end if;
 begin perform public.write_company_branding('restore',0,null,current_setting('jbfd.history_id')::uuid);raise exception 'cross company restore';exception when invalid_parameter_value then null;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('jbfd.test_admin'),true);
do $$begin begin perform public.read_company_branding();raise exception 'backoffice got company access';exception when insufficient_privilege then null;end;end$$;
reset role;
update public.companies set operational_status='suspended' where id='38000000-0000-0000-0000-000000000011';
set local role authenticated;
select set_config('request.jwt.claim.sub','38000000-0000-0000-0000-000000000001',true);
do $$begin begin perform public.read_company_branding();raise exception 'suspended company read';exception when insufficient_privilege then null;end;end$$;
-- A dedicated non-account subject can access this bucket but no application data.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000083","role":"authenticated","jbfd_branding_storage":"v1"}',true);
insert into storage.objects(bucket_id,name) values('company-branding','38000000-0000-0000-0000-000000000011/38000000-0000-0000-0000-000000000031.png');
do $$begin
 if (select count(*) from public.companies)<>0 then raise exception 'storage credential accessed companies';end if;
 begin perform public.read_company_branding();raise exception 'storage credential reached app';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.company_audit_events where company_id='38000000-0000-0000-0000-000000000011' and action='branding.publish' and actor_user_id='38000000-0000-0000-0000-000000000001') then raise exception 'audit missing';end if;
end$$;
rollback;
\echo 'Branding assertions passed. Company/account/object fixtures rolled back.'

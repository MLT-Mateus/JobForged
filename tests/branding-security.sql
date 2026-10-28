-- Test only. Prepend a transaction, the migration if not applied, and branding-fixture.mjs output.
-- Fictional administrator is created by security-session-fixtures.sql.
insert into auth.users(id,email,email_confirmed_at) values
 ('38000000-0000-0000-0000-000000000001','branding-owner@example.invalid',now()),
 ('38000000-0000-0000-0000-000000000002','branding-member@example.invalid',now()),
 ('38000000-0000-0000-0000-000000000003','branding-other@example.invalid',now());
insert into public.companies(id,name) values ('38000000-0000-0000-0000-000000000011','Fixture Branding'),('38000000-0000-0000-0000-000000000012','Other Branding');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values
 ('38000000-0000-0000-0000-000000000011','38000000-0000-0000-0000-000000000001','branding-owner@example.invalid','Fixture Owner','owner','active'),
 ('38000000-0000-0000-0000-000000000011','38000000-0000-0000-0000-000000000002','branding-member@example.invalid','Fixture Member','member','active'),
 ('38000000-0000-0000-0000-000000000012','38000000-0000-0000-0000-000000000003','branding-other@example.invalid','Fixture Other','owner','active');
insert into storage.objects(bucket_id,name) values('company-branding','38000000-0000-0000-0000-000000000011/38000000-0000-0000-0000-000000000041.png');
insert into public.company_branding_assets(id,company_id,path,name,size,sha256,created_by) values
 ('38000000-0000-0000-0000-000000000041','38000000-0000-0000-0000-000000000011','38000000-0000-0000-0000-000000000011/38000000-0000-0000-0000-000000000041.png','fixture.png',1,repeat('a',64),'38000000-0000-0000-0000-000000000001');
set local role authenticated;
select pg_temp.assume_user('38000000-0000-0000-0000-000000000001');
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
 begin perform public.write_company_branding('publish',v,jsonb_set(config,'{theme,dark,portalBackground}',config#>'{theme,dark,text}'));raise exception 'low portal contrast accepted';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('save',v,jsonb_set(config,'{backgrounds,coverImage}','"data:image/svg+xml,evil"'));raise exception 'unsafe image accepted';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('save',v,jsonb_set(config,'{portal,socialLinkedin}','"javascript:alert(1)"'));raise exception 'unsafe URL accepted';exception when invalid_parameter_value then null;end;
 v:=public.write_company_branding('reset',v,config);
 v:=public.write_company_branding('restore',v,null,current_setting('jbfd.history_id')::uuid);
 v:=public.write_company_branding('discard',v);
 result:=public.read_company_branding();if result->'draft'<>result->'published' or jsonb_array_length(result->'history')<>1 then raise exception 'history lost';end if;
 begin update public.company_branding_history set snapshot='{}';raise exception 'history mutable';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name) values('company-branding','38000000-0000-0000-0000-000000000011/38000000-0000-0000-0000-000000000031.png');raise exception 'client bypassed image processor';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('38000000-0000-0000-0000-000000000002');
do $$declare result jsonb;begin
 result:=public.read_company_branding();if result->>'editable'<>'false' or result->'draft'<>'null'::jsonb or result->'history'<>'[]'::jsonb then raise exception 'member draft leak';end if;
 if public.read_company_brand_asset('38000000-0000-0000-0000-000000000041') is not null then raise exception 'member read draft-only asset';end if;
 begin perform public.write_company_branding('save',(result->>'version')::bigint,current_setting('jbfd.fixture_config')::jsonb);raise exception 'member write';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('38000000-0000-0000-0000-000000000001');
do $$declare config jsonb:=current_setting('jbfd.fixture_config')::jsonb;v bigint;begin
 if public.read_company_brand_asset('38000000-0000-0000-0000-000000000041') is null then raise exception 'owner cannot preview image';end if;
 config:=jsonb_set(config,'{assets,logoMain}','{"id":"38000000-0000-0000-0000-000000000041","kind":"logoMain","name":"fixture.png","url":"/api/company/branding/assets/38000000-0000-0000-0000-000000000041","format":"PNG","size":1,"updatedAt":""}');
 v:=(public.read_company_branding()->>'version')::bigint;perform public.write_company_branding('publish',v,config);
end$$;
select pg_temp.assume_user('38000000-0000-0000-0000-000000000002');
do $$begin if public.read_company_brand_asset('38000000-0000-0000-0000-000000000041') is null then raise exception 'member cannot read published image';end if;end$$;
select pg_temp.assume_user('38000000-0000-0000-0000-000000000003');
do $$begin
 if public.read_company_branding()->'published'<>'{}'::jsonb then raise exception 'cross company read';end if;
 if public.read_company_brand_asset('38000000-0000-0000-0000-000000000041') is not null then raise exception 'cross company asset read';end if;
 begin perform public.write_company_branding('restore',0,null,current_setting('jbfd.history_id')::uuid);raise exception 'cross company restore';exception when invalid_parameter_value then null;end;
end$$;
select pg_temp.assume_user(current_setting('jbfd.test_admin')::uuid);
do $$begin begin perform public.read_company_branding();raise exception 'backoffice got company access';exception when insufficient_privilege then null;end;end$$;
reset role;
update public.companies set operational_status='suspended' where id='38000000-0000-0000-0000-000000000011';
set local role authenticated;
select pg_temp.assume_user('38000000-0000-0000-0000-000000000001');
do $$begin begin perform public.read_company_branding();raise exception 'suspended company read';exception when insufficient_privilege then null;end;end$$;
-- Retired global credential must no longer access files or application data.
-- Retired technical credential has no real Auth session.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000083","role":"authenticated","jbfd_branding_storage":"v1"}',true);
do $$begin begin insert into storage.objects(bucket_id,name) values('company-branding','38000000-0000-0000-0000-000000000011/38000000-0000-0000-0000-000000000031.png');raise exception 'retired storage credential wrote object';exception when insufficient_privilege then null;end;end$$;
do $$begin
 begin perform * from public.companies;raise exception 'storage credential accessed companies';exception when insufficient_privilege then null;end;
 begin perform public.read_company_branding();raise exception 'storage credential reached app';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.company_audit_events where company_id='38000000-0000-0000-0000-000000000011' and action='branding.publish' and actor_user_id='38000000-0000-0000-0000-000000000001') then raise exception 'audit missing';end if;
end$$;
rollback;
\echo 'Branding assertions passed. Company/account/object fixtures rolled back.'

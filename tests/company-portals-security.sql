-- Synthetic tenants only, under the isolated provider/session harness.
insert into auth.users(id,email,email_confirmed_at) values
 ('31000000-0000-4000-8000-000000000001','portal-owner@example.invalid',now()),
 ('31000000-0000-4000-8000-000000000002','portal-member@example.invalid',now()),
 ('31000000-0000-4000-8000-000000000003','portal-other@example.invalid',now()),
 ('31000000-0000-4000-8000-000000000004','portal-no-membership@example.invalid',now());
insert into public.companies(id,name) values ('31000000-0000-4000-8000-000000000011','Portal Fixture'),('31000000-0000-4000-8000-000000000012','Portal Fixture');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values
 ('31000000-0000-4000-8000-000000000011','31000000-0000-4000-8000-000000000001','portal-owner@example.invalid','Owner','owner','active'),
 ('31000000-0000-4000-8000-000000000011','31000000-0000-4000-8000-000000000002','portal-member@example.invalid','Member','member','active'),
 ('31000000-0000-4000-8000-000000000012','31000000-0000-4000-8000-000000000003','portal-other@example.invalid','Other','owner','active');
insert into storage.objects(bucket_id,name) values ('company-branding','31000000-0000-4000-8000-000000000011/31000000-0000-4000-8000-000000000041.png'),('company-branding','31000000-0000-4000-8000-000000000011/31000000-0000-4000-8000-000000000042.png');
insert into public.company_branding_assets(id,company_id,path,name,size,sha256,created_by) values
 ('31000000-0000-4000-8000-000000000041','31000000-0000-4000-8000-000000000011','31000000-0000-4000-8000-000000000011/31000000-0000-4000-8000-000000000041.png','SECRET_ORIGINAL_FILENAME',100,repeat('a',64),'31000000-0000-4000-8000-000000000001'),
 ('31000000-0000-4000-8000-000000000042','31000000-0000-4000-8000-000000000011','31000000-0000-4000-8000-000000000011/31000000-0000-4000-8000-000000000042.png','PRIVATE_PANEL_ONLY',100,repeat('a',64),'31000000-0000-4000-8000-000000000001');
do $$begin
 if (select count(distinct slug) from public.company_portals where company_id in ('31000000-0000-4000-8000-000000000011','31000000-0000-4000-8000-000000000012'))<>2 then raise exception 'slug collision allocation';end if;
 if exists(select 1 from public.company_portals where company_id in ('31000000-0000-4000-8000-000000000011','31000000-0000-4000-8000-000000000012') and not is_public) then raise exception 'public default missing';end if;
end$$;
set local role authenticated;
select pg_temp.assume_user('31000000-0000-4000-8000-000000000001');
do $$declare c jsonb:=current_setting('jbfd.fixture_config')::jsonb;p jsonb;v bigint;begin
 c:=jsonb_set(c,'{banners,0,organizationId}','"31000000-0000-4000-8000-000000000011"');
 c:=jsonb_set(c,'{backgrounds,panelImage}','"/api/company/branding/assets/31000000-0000-4000-8000-000000000042"');
 c:=jsonb_set(c,'{assets,logoMain}','{"id":"31000000-0000-4000-8000-000000000041","kind":"logoMain","name":"SECRET_ORIGINAL_FILENAME","url":"/api/company/branding/assets/31000000-0000-4000-8000-000000000041","format":"PNG","size":100,"updatedAt":""}');
 c:=jsonb_set(c,'{backgrounds,coverImage}','"/api/company/branding/assets/31000000-0000-4000-8000-000000000042"');
 c:=jsonb_set(c,'{portal,presentation}','{"showImage":false,"imageAlt":"Equipe de exemplo","showPhotoNotes":true,"showHighlights":true,"showCulture":true,"showInvitation":true,"jobsLayout":"list"}');
 perform set_config('jbfd.portal_config',c::text,true);
 p:=public.read_company_portal();if p->>'companyId'<>'31000000-0000-4000-8000-000000000011' then raise exception 'wrong tenant';end if;
 begin perform public.write_company_portal('address',(p->>'version')::bigint,'api');raise exception 'reserved slug';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_portal('address',(p->>'version')::bigint,'Bad/Path');raise exception 'bad slug';exception when invalid_parameter_value then null;end;
 p:=public.write_company_portal('address',(p->>'version')::bigint,'portal-fixture-published');
 begin perform public.write_company_portal('address',0,'another-address');raise exception 'portal concurrency';exception when sqlstate 'PT409' then null;end;
 v:=public.write_company_branding('save_public',0,c);if public.read_public_company_portal('portal-fixture-published') is null then raise exception 'saved page missing';end if;
 begin perform public.write_company_portal('publish',(p->>'version')::bigint,null,v,jsonb_set(c,'{portal,presentation,showImage}','"true"'));raise exception 'presentation boolean bypass';exception when invalid_parameter_value then null;end;
 p:=public.write_company_portal('publish',(p->>'version')::bigint,null,v,c);
 perform public.write_company_branding('save_public',(p->>'brandingVersion')::bigint,jsonb_set(c,'{portal,headline}','"SAVED_PUBLIC_MARKER"'));
 if public.read_public_company_portal('portal-fixture-published')::text ~ 'SECRET_ORIGINAL_FILENAME|PRIVATE_PANEL_ONLY|31000000-0000-4000-8000-000000000042|publishedBy|actor_id|panelImage": "/api|loginImage": "/api' then raise exception 'public projection leak';end if;
 begin update public.company_portals set is_public=true;raise exception 'direct write bypass';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('31000000-0000-4000-8000-000000000002');
do $$declare p jsonb:=public.read_company_portal();begin
 begin perform public.write_company_portal('unpublish',(p->>'version')::bigint);raise exception 'member write bypass';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('31000000-0000-4000-8000-000000000004');
do $$begin begin perform public.read_company_portal();raise exception 'missing membership bypass';exception when insufficient_privilege then null;end;end$$;
select pg_temp.assume_user('31000000-0000-4000-8000-000000000003');
do $$declare p jsonb:=public.read_company_portal();begin
 if p->>'companyId'<>'31000000-0000-4000-8000-000000000012' then raise exception 'cross tenant read';end if;
 begin perform public.write_company_portal('address',(p->>'version')::bigint,'portal-fixture-published');raise exception 'slug uniqueness bypass';exception when unique_violation then null;end;
end$$;
reset role;set local role anon;
do $$declare r jsonb;begin
 r:=public.read_public_company_portal('portal-fixture-published');if r is null then raise exception 'public portal missing';end if;
 if r->'configuration'?'organizationId' or r?'history' then raise exception 'private metadata leaked';end if;
 if public.read_public_portal_asset('portal-fixture-published','31000000-0000-4000-8000-000000000041') is null then raise exception 'published asset blocked';end if;
 if public.read_public_portal_asset('portal-fixture-published','31000000-0000-4000-8000-000000000042') is not null then raise exception 'private asset exposed';end if;
 if (select count(*) from storage.objects where bucket_id='company-branding' and name like '31000000-0000-4000-8000-000000000011/%')<>1 then raise exception 'storage public RLS leak';end if;
 begin perform public.read_company_portal();raise exception 'anon private RPC';exception when insufficient_privilege then null;end;
 begin perform * from public.company_portals;raise exception 'anon table read';exception when insufficient_privilege then null;end;
end$$;
reset role;update public.companies set operational_status='suspended' where id='31000000-0000-4000-8000-000000000011';set local role anon;
do $$begin if public.read_public_company_portal('portal-fixture-published') is not null or (select count(*) from storage.objects where bucket_id='company-branding' and name like '31000000-0000-4000-8000-000000000011/%')<>0 then raise exception 'suspended company public access';end if;end$$;
reset role;update public.companies set operational_status='active' where id='31000000-0000-4000-8000-000000000011';set local role authenticated;select pg_temp.assume_user('31000000-0000-4000-8000-000000000001');
do $$declare p jsonb:=public.read_company_portal();begin
 begin perform public.write_company_portal('unpublish',(p->>'version')::bigint);raise exception 'legacy unpublish accepted';exception when invalid_parameter_value then null;end;
 if public.read_public_company_portal('portal-fixture-published') is null then raise exception 'page no longer public';end if;
end$$;
reset role;
set local role authenticated;select pg_temp.assume_user('31000000-0000-4000-8000-000000000001');
do $$declare c jsonb:=current_setting('jbfd.portal_config')::jsonb;v bigint;p jsonb;begin
 c:=jsonb_set(c,'{portal,chrome}','{"light":{"headerBackground":"#FFFFFF","headerText":"#142321","footerBackground":"#F5FAF9","footerText":"#142321"},"dark":{"headerBackground":"#0E2722","headerText":"#EFF8F6","footerBackground":"#071411","footerText":"#EFF8F6"}}');
 c:=jsonb_set(c,'{portal,navigation}','[{"label":"Cultura","href":"https://example.invalid/cultura"},{"label":"Em breve","href":""}]');
 p:=public.read_company_portal();v:=public.write_company_branding('save_public',(p->>'brandingVersion')::bigint,c);
 begin perform public.write_company_branding('save_public',v,jsonb_set(c,'{portal,chrome,light,headerText}','"#FFFFFF"'));raise exception 'chrome contrast bypass';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('save_public',v,jsonb_set(c,'{portal,navigation,0,href}','"javascript:alert(1)"'));raise exception 'navigation script bypass';exception when invalid_parameter_value then null;end;
 begin perform public.write_company_branding('save_public',v,jsonb_set(c,'{portal,navigation,0,label}',to_jsonb(repeat('x',61))));raise exception 'navigation length bypass';exception when invalid_parameter_value then null;end;
 p:=public.read_company_portal();p:=public.write_company_portal('publish',(p->>'version')::bigint,null,(p->>'brandingVersion')::bigint,c);
 if public.read_public_company_portal('portal-fixture-published')#>>'{configuration,portal,navigation,0,href}'<>'https://example.invalid/cultura' then raise exception 'navigation projection failed';end if;
 c:=jsonb_set(c,'{structure,showHeader}','false');p:=public.write_company_portal('publish',(p->>'version')::bigint,null,(p->>'brandingVersion')::bigint,c);
 if (public.read_public_company_portal('portal-fixture-published')#>'{configuration,portal}')?'navigation' then raise exception 'hidden navigation leaked';end if;
end$$;
reset role;
-- Verified custom domains: no browser/RPC claim may activate routing.
set local role authenticated;select pg_temp.assume_user('31000000-0000-4000-8000-000000000001');
do $$declare d jsonb;begin
 d:=public.company_domain('register','careers.fixture.invalid',0);
 if d->>'status'<>'pending' or length(d->>'proof')<>87 then raise exception 'domain proof missing';end if;
 begin perform public.company_domain('activate',null,(d->>'version')::bigint);raise exception 'direct domain activation';exception when invalid_parameter_value then null;end;
 begin update public.company_domains set status='active';raise exception 'direct domain write';exception when insufficient_privilege then null;end;
 begin perform public.company_domain('register','jobforged.com',(d->>'version')::bigint);raise exception 'reserved domain';exception when check_violation then null;end;
 begin perform public.company_domain('register','javascript:bad',(d->>'version')::bigint);raise exception 'bad domain';exception when check_violation then null;end;
end$$;
select pg_temp.assume_user('31000000-0000-4000-8000-000000000002');
do $$begin begin perform public.company_domain('register','member.fixture.invalid',0);raise exception 'member claimed domain';exception when insufficient_privilege then null;end;end$$;
reset role;set local role anon;
do $$begin if public.resolve_company_domain('careers.fixture.invalid') is not null then raise exception 'pending host resolved';end if;end$$;
reset role;
-- Simulate the privileged reconciler result only. DNS and TLS have separate acceptance tests.
update public.company_domains set status='active',checked_at=now() where hostname='careers.fixture.invalid';
set local role anon;
do $$begin if public.resolve_company_domain('careers.fixture.invalid')<>'portal-fixture-published' then raise exception 'verified host missing';end if;end$$;
reset role;update public.company_domains set checked_at=now()-interval '21 minutes';set local role anon;
do $$begin if public.resolve_company_domain('careers.fixture.invalid') is not null then raise exception 'stale proof allowed';end if;end$$;
reset role;
-- Candidates own private immutable files, never company assets or public documents.
insert into auth.users(id,email,email_confirmed_at) values('31000000-0000-4000-8000-000000000051','resume-fixture@example.invalid',now()),('31000000-0000-4000-8000-000000000052','resume-other@example.invalid',now());
insert into public.candidate_accounts(user_id,full_name,origin_company_id,terms_revision,accepted_at) values('31000000-0000-4000-8000-000000000051','Resume fixture','31000000-0000-4000-8000-000000000011','fixture',now()),('31000000-0000-4000-8000-000000000052','Other fixture','31000000-0000-4000-8000-000000000011','fixture',now());
set local role authenticated;select pg_temp.assume_user('31000000-0000-4000-8000-000000000051');
select public.candidate_resume('reserve','31000000-0000-4000-8000-000000000061');
insert into storage.objects(bucket_id,name) values('candidate-resumes','31000000-0000-4000-8000-000000000051/31000000-0000-4000-8000-000000000061.pdf');
select public.candidate_resume('commit','31000000-0000-4000-8000-000000000061','fixture.pdf',100,repeat('a',64),0);
do $$begin
 if public.candidate_resume()->>'name'<>'fixture.pdf' or public.candidate_resume()?'path' then raise exception 'resume metadata contract';end if;
 begin perform public.candidate_resume('commit','31000000-0000-4000-8000-000000000061','fixture.pdf',100,repeat('a',64),0);raise exception 'resume stale overwrite';exception when sqlstate 'PT409' then null;end;
 if (select count(*) from storage.objects where bucket_id='candidate-resumes')<>1 then raise exception 'own resume missing';end if;
end$$;
select pg_temp.assume_user('31000000-0000-4000-8000-000000000052');
do $$begin if public.candidate_resume() is not null or (select count(*) from storage.objects where bucket_id='candidate-resumes')<>0 then raise exception 'cross candidate disclosure';end if;end$$;
select pg_temp.assume_user('31000000-0000-4000-8000-000000000001');
do $$begin begin perform public.candidate_resume();raise exception 'company read candidate resume';exception when insufficient_privilege then null;end;end$$;
reset role;set local role anon;
do $$begin if (select count(*) from storage.objects where bucket_id='candidate-resumes')<>0 then raise exception 'public resume disclosure';end if;begin perform public.candidate_resume();raise exception 'anonymous resume RPC';exception when insufficient_privilege then null;end;end$$;
reset role;

select 'company_portal_security_passed';
rollback;

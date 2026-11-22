-- Entire test is isolated, uses example.invalid, and rolls back.
insert into auth.users(id,email,email_confirmed_at) values
('71000000-0000-4000-8000-000000000001','recruitment-owner@example.invalid',now()),
('71000000-0000-4000-8000-000000000002','recruitment-reviewer@example.invalid',now()),
('71000000-0000-4000-8000-000000000003','recruitment-candidate@example.invalid',now()),
('71000000-0000-4000-8000-000000000004','other-owner@example.invalid',now());
insert into public.companies(id,name) values('71000000-0000-4000-8000-000000000011','Recruitment Fixture'),('71000000-0000-4000-8000-000000000012','Other Recruitment');
insert into public.company_members(id,company_id,user_id,email,full_name,role,status) values
('71000000-0000-4000-8000-000000000021','71000000-0000-4000-8000-000000000011','71000000-0000-4000-8000-000000000001','recruitment-owner@example.invalid','Owner','owner','active'),
('71000000-0000-4000-8000-000000000022','71000000-0000-4000-8000-000000000011','71000000-0000-4000-8000-000000000002','recruitment-reviewer@example.invalid','Reviewer','admin','active'),
('71000000-0000-4000-8000-000000000024','71000000-0000-4000-8000-000000000012','71000000-0000-4000-8000-000000000004','other-owner@example.invalid','Other','owner','active');
insert into public.company_branding(company_id,published) values('71000000-0000-4000-8000-000000000011','{"fixture":true}') on conflict(company_id) do update set published=excluded.published;
update public.company_portals set is_public=true where company_id='71000000-0000-4000-8000-000000000011';
insert into public.candidate_accounts(user_id,full_name,origin_company_id,terms_revision,accepted_at) values('71000000-0000-4000-8000-000000000003','Candidate Fixture','71000000-0000-4000-8000-000000000011','test',now());
set local role authenticated;
select pg_temp.assume_user('71000000-0000-4000-8000-000000000001');
do $$declare d jsonb:=current_setting('jbfd.empty_job')::jsonb;r jsonb;v bigint;jid uuid;checklist jsonb;begin
 r:=public.company_jobs_v2('save',null,d);jid:=(r->>'id')::uuid;v:=(r->>'version')::bigint;
 if r->>'status'<>'Rascunho' then raise exception 'empty draft not saved';end if;
 checklist:=public.company_jobs_v2('validate',jid,d);
 if checklist->>'canPublish'<>'false' or jsonb_array_length(checklist->'issues')<9 then raise exception 'incomplete checklist';end if;
 d:=d||'{"title":"Support","area":"Atendimento","contractType":"Efetivo - CLT","modality":"Remoto","remoteScope":"Brasil","journey":"Flexível","description":"Atendimento ao cliente","attributions":"Responder chamados","noPrerequisites":true,"lgpd":true,"resumeRequired":false}';
 if public.company_jobs_v2('validate',jid,d)->>'canPublish'<>'true' then raise exception 'optional fields blocked publication';end if;
 if public.company_jobs_v2('validate',jid,d||jsonb_build_object('description',E'\n\t '))->>'canPublish'<>'false' then raise exception 'whitespace accepted';end if;
 if public.company_jobs_v2('validate',jid,d||jsonb_build_object('description',repeat('x',5001)))->>'canPublish'<>'false' then raise exception 'rich text limit mismatch';end if;
 r:=public.company_jobs_v2('save',jid,d,null,v);v:=(r->>'version')::bigint;
 r:=public.company_jobs_v2('publish',jid,null,null,v);v:=(r->>'version')::bigint;
 perform set_config('jbfd.test_job',jid::text,true);
 if public.public_jobs_v1('recruitment-fixture')->0->>'title'<>'Support' then raise exception 'publication missing';end if;
 d:=d||'{"title":"Draft revision","positions":2,"resumeRequired":true}';
 r:=public.company_jobs_v2('save',jid,d,null,v);v:=(r->>'version')::bigint;
 if r->>'hasUnpublishedChanges'<>'true' or public.public_jobs_v1('recruitment-fixture')->0->>'title'<>'Support' or public.public_jobs_v1('recruitment-fixture')->0->>'resumeRequired'<>'false' then raise exception 'draft leaked into publication';end if;
 begin perform public.company_jobs_v2('save',jid,d,null,v-1);raise exception 'stale overwrite';exception when serialization_failure then null;end;
 d:=d||'{"example":true}';r:=public.company_jobs_v2('save',jid,d,null,v);v:=(r->>'version')::bigint;
 begin perform public.company_jobs_v2('publish',jid,null,null,v);raise exception 'example published';exception when sqlstate 'PT423' then null;end;
 begin perform public.company_jobs_v1('status',jid,null,'Publicada',v);raise exception 'legacy bypass';exception when invalid_parameter_value then null;end;
 d:=d||'{"example":false,"resumeRequired":false}';r:=public.company_jobs_v2('save',jid,d,null,v);v:=(r->>'version')::bigint;
 r:=public.company_jobs_v2('publish',jid,null,null,v);
 if public.public_jobs_v1('recruitment-fixture')->0->>'title'<>'Draft revision' then raise exception 'revision not published';end if;
 r:=public.company_jobs_v2('save',null,d||'{"title":"Second job"}');r:=public.company_jobs_v2('publish',(r->>'id')::uuid,null,null,(r->>'version')::bigint);perform set_config('jbfd.second_job',r->>'id',true);
 perform public.company_access_v1('save','71000000-0000-4000-8000-000000000022','{"jobs.view":true,"applications.view":true,"applications.move":true}',0);
end$$;
select pg_temp.assume_user('71000000-0000-4000-8000-000000000003');
do $$declare r jsonb;begin
 r:=public.candidate_applications_v2('apply',current_setting('jbfd.test_job')::uuid,true);
 if r->0->>'stage'<>'Triagem' then raise exception 'not in screening';end if;
 r:=public.candidate_applications_v2('apply',current_setting('jbfd.test_job')::uuid,true);
 if jsonb_array_length(r)<>1 then raise exception 'duplicate application';end if;
 r:=public.candidate_applications_v2('apply',current_setting('jbfd.second_job')::uuid,true);
 if jsonb_array_length(r)<>2 then raise exception 'independent applications missing';end if;
end$$;
select pg_temp.assume_user('71000000-0000-4000-8000-000000000001');
do $$declare r jsonb;a jsonb;h jsonb;aid uuid;v bigint;begin
 r:=public.company_applications_v2();if(r->>'total')::integer<>2 or jsonb_array_length(r->'items')<>2 then raise exception 'incorrect board';end if;
 a:=r->'items'->0;aid:=(a->>'id')::uuid;perform set_config('jbfd.application',aid::text,true);
 if a ? 'email' or a ? 'notes' or a ? 'history' then raise exception 'card leaks detail';end if;
 a:=public.company_applications_v2('move',aid,'{"stageKey":"interview"}',(a->>'version')::bigint);v:=(a->>'version')::bigint;
 if a->'nextInterview'->>'status'<>'A agendar' then raise exception 'interview missing';end if;
 a:=public.company_applications_v2('move',aid,'{"stageKey":"screening"}',v);v:=(a->>'version')::bigint;
 a:=public.company_applications_v2('move',aid,'{"stageKey":"interview"}',v);v:=(a->>'version')::bigint;
 a:=public.company_applications_v2('move',aid,'{"stageKey":"approved"}',v);v:=(a->>'version')::bigint;
 if a->>'stage'<>'Aprovação' or a->>'reviewNeeded'<>'false' then raise exception 'final approval not explicit';end if;
 begin perform public.company_applications_v2('move',aid,'{"stageKey":"hired"}',v-1);raise exception 'concurrent overwrite';exception when serialization_failure then null;end;
 a:=public.company_applications_v2('move',aid,'{"stageKey":"hired"}',v);v:=(a->>'version')::bigint;
 begin perform public.company_applications_v2('move',aid,'{"stageKey":"screening"}',v);raise exception 'return without reason';exception when invalid_parameter_value then null;end;
 a:=public.company_applications_v2('move',aid,'{"stageKey":"screening","reason":"Revisão humana"}',v);v:=(a->>'version')::bigint;
 a:=public.company_applications_v2('move',aid,'{"outcome":"rejected","reason":"Requisito ausente"}',v);
 r:=public.company_applications_v2('list',null,'{"outcome":"rejected"}');if(r->>'total')::integer<>1 then raise exception 'outcome filter';end if;
 r:=public.company_applications_v2();if(r->>'total')::integer<>1 then raise exception 'other job contaminated';end if;
 h:=public.company_applications_v2('history',aid,'{"page":1,"pageSize":2}');if jsonb_array_length(h->'items')<>2 or(h->>'total')::integer<5 then raise exception 'history unbounded';end if;
end$$;
select pg_temp.assume_user('71000000-0000-4000-8000-000000000002');
do $$declare a jsonb;begin
 a:=public.company_applications_v2('detail',current_setting('jbfd.application')::uuid);
 begin perform public.company_applications_v2('move',(a->>'id')::uuid,'{"stageKey":"hired","reason":"No permission"}',(a->>'version')::bigint);raise exception 'decision bypass';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('71000000-0000-4000-8000-000000000004');
do $$begin
 if(public.company_applications_v2()->>'total')::integer<>0 then raise exception 'tenant leak';end if;
 begin perform public.company_applications_v2('detail',current_setting('jbfd.application')::uuid);raise exception 'foreign detail';exception when no_data_found then null;end;
end$$;
reset role;
-- Stress fixture: response and history stay bounded with 5,000 independent people.
insert into auth.users(id,email,email_confirmed_at) select md5('recruitment-volume-'||i)::uuid,'volume-'||i||'@example.invalid',now() from generate_series(1,5000)i;
insert into public.candidate_accounts(user_id,full_name,origin_company_id,terms_revision,accepted_at) select md5('recruitment-volume-'||i)::uuid,'Pessoa de volume '||i,'71000000-0000-4000-8000-000000000011','test',now() from generate_series(1,5000)i;
insert into app_private.job_applications(company_id,job_id,candidate_id) select '71000000-0000-4000-8000-000000000011',current_setting('jbfd.test_job')::uuid,md5('recruitment-volume-'||i)::uuid from generate_series(1,5000)i;
set local role authenticated;
select pg_temp.assume_user('71000000-0000-4000-8000-000000000001');
do $$declare r jsonb;begin
 r:=public.company_applications_v2('board',null,jsonb_build_object('stageKey','screening','pageSize',20));
 if jsonb_array_length(r->'items')<>20 or(r->'counts'->>'screening')::integer<5000 then raise exception 'volume pagination';end if;
end$$;
rollback;
select 'recruitment_security_passed';

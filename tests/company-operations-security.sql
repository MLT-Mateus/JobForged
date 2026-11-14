-- Synthetic tenants and users, no real recipients. Entire test rolls back.
insert into auth.users(id,email,email_confirmed_at) values
('58000000-0000-4000-8000-000000000001','operations-owner@example.invalid',now()),
('58000000-0000-4000-8000-000000000002','operations-admin@example.invalid',now()),
('58000000-0000-4000-8000-000000000003','operations-candidate@example.invalid',now()),
('58000000-0000-4000-8000-000000000004','operations-other@example.invalid',now());
insert into public.companies(id,name) values('58000000-0000-4000-8000-000000000011','Operations One'),('58000000-0000-4000-8000-000000000012','Operations Two');
insert into public.company_members(id,company_id,user_id,email,full_name,role,status) values
('58000000-0000-4000-8000-000000000021','58000000-0000-4000-8000-000000000011','58000000-0000-4000-8000-000000000001','operations-owner@example.invalid','Owner','owner','active'),
('58000000-0000-4000-8000-000000000022','58000000-0000-4000-8000-000000000011','58000000-0000-4000-8000-000000000002','operations-admin@example.invalid','Admin','admin','active'),
('58000000-0000-4000-8000-000000000024','58000000-0000-4000-8000-000000000012','58000000-0000-4000-8000-000000000004','operations-other@example.invalid','Other','owner','active');
insert into public.candidate_accounts(user_id,full_name,origin_company_id,terms_revision,accepted_at) values('58000000-0000-4000-8000-000000000003','Candidate Fixture','58000000-0000-4000-8000-000000000011','test',now());
insert into app_private.company_jobs(id,company_id,document,status) values
('58000000-0000-4000-8000-000000000031','58000000-0000-4000-8000-000000000011','{"title":"First job"}','Publicada'),
('58000000-0000-4000-8000-000000000032','58000000-0000-4000-8000-000000000011','{"title":"Second job"}','Publicada');
insert into app_private.company_job_options(job_id,document) select id,'{"acceptApplications":true,"resumeRequired":false,"positions":1,"notifyApplication":true,"notifyStage":true}' from app_private.company_jobs where company_id='58000000-0000-4000-8000-000000000011';
set local role authenticated;
select pg_temp.assume_user('58000000-0000-4000-8000-000000000003');
do $$declare r jsonb;begin
 begin perform public.candidate_applications_v1('apply','58000000-0000-4000-8000-000000000031',false);raise exception 'consent bypass';exception when invalid_parameter_value then null;end;
 perform public.candidate_applications_v1('apply','58000000-0000-4000-8000-000000000031',true);
 perform public.candidate_applications_v1('apply','58000000-0000-4000-8000-000000000031',true);
 r:=public.candidate_applications_v1('apply','58000000-0000-4000-8000-000000000032',true);
 if jsonb_array_length(r)<>2 then raise exception 'duplicate or lost application';end if;
 begin perform public.company_operations_v1();raise exception 'candidate company bypass';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('58000000-0000-4000-8000-000000000001');
do $$declare r jsonb;a jsonb;e jsonb;begin
 r:=public.company_operations_v1();if jsonb_array_length(r->'applications')<>2 then raise exception 'applications absent';end if;
 select value into a from jsonb_array_elements(r->'applications') where value->>'jobId'='58000000-0000-4000-8000-000000000031';
 r:=public.company_operations_v1('move',(a->>'id')::uuid,'{"stage":"Reprovada","reason":"Experience requirement"}',1);
 if (select count(*) from jsonb_array_elements(r->'applications') where value->>'stage'='Candidatura')<>1 then raise exception 'decision contaminated other job';end if;
 begin perform public.company_operations_v1('note',(a->>'id')::uuid,'{"notes":"stale"}',1);raise exception 'stale overwrite';exception when serialization_failure then null;end;
 r:=public.company_operations_v1('move',(a->>'id')::uuid,'{"stage":"Entrevista"}',2);
 e:=r->'events'->0;if e->>'status'<>'A agendar' then raise exception 'missing interview';end if;
 r:=public.company_operations_v1('event',(e->>'id')::uuid,jsonb_build_object('title','Interview fixture','status','Agendada','responsibleId','58000000-0000-4000-8000-000000000021','startsAt',now()+interval '5 minutes','endsAt',now()+interval '35 minutes','meetingUrl','https://meet.google.com/'),1);
 if jsonb_array_length(public.company_operations_v1('alerts')->'items')<1 then raise exception 'missing reminders';end if;
 begin perform public.company_operations_v1('event',null,jsonb_build_object('title','Conflict fixture','status','Agendada','responsibleId','58000000-0000-4000-8000-000000000021','startsAt',now()+interval '10 minutes','endsAt',now()+interval '20 minutes','meetingUrl','https://meet.google.com/'),null);raise exception 'schedule conflict bypass';exception when sqlstate 'PT409' then null;end;
 perform public.company_access_v1('save','58000000-0000-4000-8000-000000000022','{"jobs.view":true,"applications.view":true}',0);
 begin perform public.company_access_v1('save','58000000-0000-4000-8000-000000000021','{}',0);raise exception 'owner changed';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('58000000-0000-4000-8000-000000000002');
do $$declare r jsonb;begin
 r:=public.company_operations_v1();if jsonb_array_length(r->'events')<>0 then raise exception 'agenda leaked';end if;
 if public.company_access_v1()->'permissions'->>'finance.view'<>'false' then raise exception 'finance leaked';end if;
 begin perform public.company_operations_v1('move',(r->'applications'->0->>'id')::uuid,'{"stage":"Triagem"}',1);raise exception 'move bypass';exception when insufficient_privilege then null;end;
 begin perform public.company_jobs_v1('delete','58000000-0000-4000-8000-000000000031',null,null,1);raise exception 'direct RPC bypass';exception when insufficient_privilege then null;end;
 begin perform public.company_access_v1('save','58000000-0000-4000-8000-000000000022','{"admins.permissions":true}',1);raise exception 'self escalation';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.assume_user('58000000-0000-4000-8000-000000000004');
do $$declare r jsonb;begin r:=public.company_operations_v1();if jsonb_array_length(r->'applications')<>0 or jsonb_array_length(r->'events')<>0 then raise exception 'cross tenant leak';end if;end$$;
reset role;
insert into auth.users(id,email,email_confirmed_at) values('58000000-0000-4000-8000-000000000005','invited-restricted@example.invalid',now());
insert into public.company_invitations(company_id,email,role,token_hash,invited_by,expires_at) values('58000000-0000-4000-8000-000000000011','invited-restricted@example.invalid','admin',repeat('5',64),'58000000-0000-4000-8000-000000000002',now()+interval '1 hour');
insert into public.company_members(id,company_id,user_id,email,full_name,role,status) values('58000000-0000-4000-8000-000000000025','58000000-0000-4000-8000-000000000011','58000000-0000-4000-8000-000000000005','invited-restricted@example.invalid','Invited Fixture','admin','active');
do $$declare g jsonb;begin select grants into g from app_private.company_member_permissions where member_id='58000000-0000-4000-8000-000000000025';if g->>'jobs.view'<>'true' or g->>'jobs.delete'<>'false' or g->>'finance.view'<>'false' then raise exception 'invitation privilege escalation';end if;end$$;
rollback;
select 'company_operations_security_passed';

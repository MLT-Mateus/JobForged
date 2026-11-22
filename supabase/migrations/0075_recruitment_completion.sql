-- migration-role: supabase_admin
-- Keep publication preferences in the same revision, with legacy reads intact.
do $$declare definition text;begin
 definition:=pg_get_functiondef('app_private.job_document_valid(jsonb)'::regprocedure);
 definition:=replace(definition,'''example'',''resumeRequired'']','''example'',''resumeRequired'',''acceptApplications'']');
 execute definition;
 definition:=pg_get_functiondef('app_private.job_issues(jsonb,uuid,jsonb)'::regprocedure);
 definition:=replace(definition,'elsif k=''modality'' then',
 'elsif k=''contractType'' then ok:=d->>k in(''Menor Aprendiz'',''Estágio'',''Temporário'',''Autônomo'',''Efetivo - CLT'',''Prestador de Serviço'',''Free Lancer'',''Trainee'');
  elsif k=''modality'' then');
 definition:=replace(definition,'elsif k=''journey'' then ok:=ok and',
 'elsif k=''journey'' then ok:=d->>k in(''Horário definido'',''Escala'',''Flexível'',''A combinar'',''Matutino'',''Matutino e Vespertino'',''Vespertino'',''Vespertino e Noturno'',''Noturno'',''Noturno e Matutino'') and');
 execute definition;
 definition:=pg_get_functiondef('app_private.job_result_v2(app_private.company_jobs)'::regprocedure);
 definition:=replace(definition,'''resumeRequired'',coalesce',
 '''acceptApplications'',coalesce(j.document->''acceptApplications'',(select o.document->''acceptApplications'' from app_private.company_job_options o where o.job_id=j.id),''true''),''resumeRequired'',coalesce');
 execute definition;
 definition:=pg_get_functiondef('public.company_jobs_v2(text,uuid,jsonb,text,bigint)'::regprocedure);
 definition:=replace(definition,'jsonb_build_object(''positions'',coalesce((document->>''positions'')::integer,1)',
 'jsonb_build_object(''acceptApplications'',coalesce((document->>''acceptApplications'')::boolean,true),''positions'',coalesce((document->>''positions'')::integer,1)');
 definition:=replace(definition,'(select count(*)%12 from app_private.company_jobs where company_id=cid)',
 '(select token from generate_series(0,11) token order by (select count(*) from app_private.company_jobs existing where existing.company_id=cid and existing.deleted_at is null and existing.status<>''Arquivada'' and existing.color_token=token),token limit 1)');
 execute definition;
 -- Old settings clients cannot silently replace publication-controlled values.
 definition:=pg_get_functiondef('public.company_operations_v1(text,uuid,jsonb,bigint)'::regprocedure);
 definition:=replace(definition,'elsif operation=''options'' then',
 'elsif operation=''options'' then
  if exists(select 1 from app_private.company_jobs vacancy join app_private.company_job_options opts on opts.job_id=vacancy.id where vacancy.id=record_id and vacancy.company_id=cid and vacancy.document->>''schemaVersion''=''2'' and (opts.document->''acceptApplications'' is distinct from company_operations_v1.document->''acceptApplications'' or opts.document->''positions'' is distinct from company_operations_v1.document->''positions'' or opts.document->''resumeRequired'' is distinct from company_operations_v1.document->''resumeRequired'')) then raise exception ''Use the job revision for publication preferences'' using errcode=''22023'';end if;');
 execute definition;
end;$$;

-- The team may record a communicated withdrawal. A candidate's own withdrawal
-- is never reopened by a recruiter; old withdrawals use the conservative rule.
alter table app_private.job_applications add column withdrawal_source text check(withdrawal_source in('candidate','company'));
update app_private.job_applications set withdrawal_source='candidate' where outcome='withdrawn';
do $$declare definition text;begin
 definition:=pg_get_functiondef('app_private.sync_pipeline_legacy()'::regprocedure);
 definition:=replace(definition,'return new;',
 'if new.outcome=''withdrawn'' and (tg_op=''INSERT'' or new.outcome is distinct from old.outcome) then new.withdrawal_source:=case when auth.uid()=new.candidate_id then ''candidate'' else ''company'' end;elsif new.outcome<>''withdrawn'' then new.withdrawal_source:=null;end if;
 return new;');
 execute definition;
 definition:=pg_get_functiondef('app_private.application_card(app_private.job_applications)'::regprocedure);
 definition:=replace(definition,'''outcome'',a.outcome','''outcome'',a.outcome,''withdrawalSource'',a.withdrawal_source');execute definition;
 definition:=pg_get_functiondef('public.company_applications_v2(text,uuid,jsonb,bigint)'::regprocedure);
 definition:=replace(definition,'result not in(''active'',''rejected'')','result not in(''active'',''rejected'',''withdrawn'')');
 definition:=replace(definition,'if a.outcome=''withdrawn'' then','if a.outcome=''withdrawn'' and a.withdrawal_source is distinct from ''company'' then');
 definition:=replace(definition,'result=''rejected''','result<>''active''');
 definition:=replace(definition,'a.outcome=''rejected''','a.outcome<>''active''');
 definition:=replace(definition,'a.stage_key=''hired'' and target<>''hired''',
 'a.stage_key=''approved'' and target in(''screening'',''interview'') or a.stage_key=''hired'' and target<>''hired''');
 definition:=replace(definition,'case result when ''rejected'' then ''Reprovada''','case result when ''withdrawn'' then ''Desistência'' when ''rejected'' then ''Reprovada''');
 definition:=replace(definition,'''pipeline'',''universal-v1''','''pipeline'',''universal-v1'',''source'',case when result=''withdrawn'' then ''company'' else null end');
 execute definition;
end;$$;

-- All functions keep their previous postgres ownership and private grants.
notify pgrst,'reload schema';

-- migration-role: supabase_admin
-- The production postgres role is not a superuser. Keep private helpers owned by
-- the same execution role as their SECURITY DEFINER entry points, without
-- granting any new client privilege. 0071/0072 were created by the migration role.
alter function app_private.job_plain(text) owner to postgres;
alter function app_private.job_issues(jsonb,uuid,jsonb) owner to postgres;
alter function app_private.job_result_v2(app_private.company_jobs) owner to postgres;
alter function app_private.sync_pipeline_legacy() owner to postgres;
alter function app_private.pipeline_label(text,text) owner to postgres;
alter function app_private.application_card(app_private.job_applications) owner to postgres;
revoke all on function app_private.job_plain(text),app_private.job_issues(jsonb,uuid,jsonb),app_private.job_result_v2(app_private.company_jobs),app_private.sync_pipeline_legacy(),app_private.pipeline_label(text,text),app_private.application_card(app_private.job_applications) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';

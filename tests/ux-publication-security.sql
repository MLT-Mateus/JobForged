-- Synthetic fixtures only. Every assertion runs inside an isolated rollback.
insert into auth.users(id,email,email_confirmed_at) values
 ('61000000-0000-4000-8000-000000000001','ux-owner@example.invalid',now()),
 ('61000000-0000-4000-8000-000000000002','ux-member@example.invalid',now());
insert into public.companies(id,name) values ('61000000-0000-4000-8000-000000000011','UX Fixture');
insert into public.company_members(company_id,user_id,email,full_name,role,status) values
 ('61000000-0000-4000-8000-000000000011','61000000-0000-4000-8000-000000000001','ux-owner@example.invalid','Owner','owner','active'),
 ('61000000-0000-4000-8000-000000000011','61000000-0000-4000-8000-000000000002','ux-member@example.invalid','Member','member','active');
insert into public.company_domains(company_id,hostname,status,version,checked_at,verified_at) values ('61000000-0000-4000-8000-000000000011','old.example.invalid','active',1,now(),now());
set local role authenticated;
select pg_temp.assume_user('61000000-0000-4000-8000-000000000001');
do $$declare d jsonb;p jsonb;c jsonb:=current_setting('jbfd.fixture_config')::jsonb;v bigint;begin
 c:=jsonb_set(c,'{banners,0,organizationId}','"61000000-0000-4000-8000-000000000011"');
 d:=public.page_domain_v2('prepare','new.example.invalid','subdomain','example.invalid',1,0);
 if d->>'hostname'<>'old.example.invalid' or d->>'status'<>'active' or d->'request'->>'status'<>'draft' then raise exception 'preparation replaced active address';end if;
 begin perform public.page_domain_v2('prepare','another.example.invalid','subdomain','example.invalid',1,0);raise exception 'stale preparation accepted';exception when sqlstate 'PT409' then null;end;
 p:=public.read_company_portal();
 p:=public.publish_company_page_v2((p->>'version')::bigint,coalesce((p->>'brandingVersion')::bigint,0),c,'ux-published','set',1,1);
 if p->>'slug'<>'ux-published' then raise exception 'slug not published';end if;
 d:=public.page_domain_v2();
 if d->>'hostname'<>'old.example.invalid' or d->'request'->>'status'<>'pending' then raise exception 'publication replaced active address before DNS and TLS';end if;
 if public.resolve_company_domain('new.example.invalid') is not null then raise exception 'unverified candidate resolved';end if;
 if jsonb_array_length(public.company_branding_history_page(1)->'items')<>1 then raise exception 'publication created multiple versions';end if;
 v:=(p->>'brandingVersion')::bigint;
 begin perform public.publish_company_page_v2(0,v,c,'ux-stale','disconnect',1,null);raise exception 'stale publication accepted';exception when sqlstate 'PT409' then null;end;
 if public.page_domain_v2()->>'status'<>'active' then raise exception 'failed publication disconnected active domain';end if;
 p:=public.publish_company_page_v2((p->>'version')::bigint,v,c,null,'disconnect',1,null);
 if public.page_domain_v2()->>'status'<>'disabled' then raise exception 'disconnect not published';end if;
 if public.page_domain_v2()?'request' then raise exception 'disconnected request survived';end if;
end$$;
select pg_temp.assume_user('61000000-0000-4000-8000-000000000002');
do $$begin
 begin perform public.page_domain_v2('prepare','bad.example.invalid','subdomain','example.invalid',2,0);raise exception 'member prepared domain';exception when insufficient_privilege then null;end;
 begin perform public.company_branding_history_page();raise exception 'member read editor history';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into app_private.company_alerts(company_id,user_id,event_key,title,body,link)
select '61000000-0000-4000-8000-000000000011','61000000-0000-4000-8000-000000000001','ux:'||n,'Alert '||n,'Fixture','/app/home' from generate_series(1,21)n;
set local role authenticated;
select pg_temp.assume_user('61000000-0000-4000-8000-000000000001');
do $$declare first_page jsonb:=public.my_notifications_v2(1);last_page jsonb:=public.my_notifications_v2(2);begin
 if jsonb_array_length(first_page->'items')<>20 or first_page->>'hasNext'<>'true' then raise exception 'first page is not bounded';end if;
 if jsonb_array_length(last_page->'items')<>1 or last_page->>'hasNext'<>'false' then raise exception 'last page has false continuation';end if;
 if exists(select 1 from jsonb_array_elements(first_page->'items')a join jsonb_array_elements(last_page->'items')b on a->>'id'=b->>'id') then raise exception 'duplicate paged alert';end if;
 if (public.company_activity_v2()->>'total')::integer<1 then raise exception 'missing publication history';end if;
end$$;
select pg_temp.assume_user('61000000-0000-4000-8000-000000000002');
do $$begin if jsonb_array_length(public.my_notifications_v2()->'items')<>0 then raise exception 'recipient isolation failed';end if;end$$;
reset role;
set local role authenticated;
select pg_temp.assume_user('19000000-0000-4000-8000-000000000001');
do $$begin perform public.communication_management_page('banners');perform public.communication_management_page('campaigns');perform public.platform_read_v2('users');perform public.platform_read_v2('company','','',1,'61000000-0000-4000-8000-000000000011');perform public.platform_read_v2('audit','','',1,null,'','2026-01-01','2026-12-31','Fixture');perform public.platform_member_photo('61000000-0000-4000-8000-000000000011');perform public.company_deletion_page(1);end$$;
reset role;
insert into public.platform_communications(id,title,message,link,audience,channel,created_by)
values('61000000-0000-4000-8000-000000000099','Legacy invalid destination','Fixture only','https://test.jobforged.com/backoffice/comunicacoes','companies','inapp','19000000-0000-4000-8000-000000000001');
set local role authenticated;
select pg_temp.assume_user('19000000-0000-4000-8000-000000000001');
do $$begin
 begin perform public.communications_manage('campaign.dispatch','61000000-0000-4000-8000-000000000099',1,'{}');raise exception 'invalid destination was dispatched';exception when invalid_parameter_value then null;end;
end$$;
reset role;
do $$begin
 if exists(select 1 from public.platform_communication_deliveries where communication_id='61000000-0000-4000-8000-000000000099') then raise exception 'invalid communication has recipients';end if;
 if not app_private.communication_audience_link('https://test.jobforged.com/app/home','companies') then raise exception 'valid company destination rejected';end if;
 if not app_private.communication_audience_link('https://test.jobforged.com/backoffice','platform_admins') then raise exception 'admin destination rejected';end if;
end$$;
insert into public.company_invitations(company_id,email,role,token_hash,invited_by,expires_at)
values('61000000-0000-4000-8000-000000000011','ux-owner@example.invalid','admin',encode(extensions.digest(repeat('b',64),'sha256'),'hex'),'61000000-0000-4000-8000-000000000001',now()+interval '1 hour');
set local role authenticated;
select pg_temp.assume_user('61000000-0000-4000-8000-000000000001');
do $$begin if public.my_invitation_context(repeat('b',64))->>'company'<>'UX Fixture' then raise exception 'missing recipient context';end if;end$$;
select pg_temp.assume_user('61000000-0000-4000-8000-000000000002');
do $$begin if public.my_invitation_context(repeat('b',64)) is not null then raise exception 'invitation context leaked';end if;end$$;
reset role;
rollback;
select 'ux_publication_security_passed';

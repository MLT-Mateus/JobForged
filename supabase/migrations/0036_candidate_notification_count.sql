-- Own unread count across all pages; preserve identity, recipient rules and existing grants.
create or replace function public.candidate_account(operation text default 'read',expected_version bigint default null,full_name text default null,delivery_id uuid default null,page_number integer default 1)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare context jsonb;items jsonb;
begin
 context:=public.candidate_context();if context is null then raise exception 'candidate access denied' using errcode='42501';end if;
 if page_number is null or page_number not between 1 and 10000 then raise exception 'invalid page' using errcode='22023';end if;
 if operation='profile' then
  perform app_private.consume_operation_budget('candidate-profile',auth.uid(),20,60);
  if length(trim(coalesce(full_name,''))) not between 3 and 120 then raise exception 'invalid name' using errcode='22023';end if;
  update public.candidate_accounts a set full_name=trim(candidate_account.full_name),version=version+1,updated_at=now() where user_id=auth.uid() and version=expected_version and status='active';
  if not found then raise exception 'profile conflict' using errcode='PT409';end if;
 elsif operation='read-alert' then
  perform public.mark_my_notification(delivery_id);
 elsif operation<>'read' or operation is null then raise exception 'invalid operation' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into items from(select d.id,c.title,c.message,c.link,c.dispatched_at,d.read_at
 from public.platform_communication_deliveries d join public.platform_communications c on c.id=d.communication_id where d.user_id=auth.uid() and c.channel in ('inapp','both') and app_private.communication_recipient(auth.uid(),c.audience,c.company_id) order by c.dispatched_at desc,d.id limit 20 offset(page_number-1)*20)x;
 return jsonb_build_object('profile',public.candidate_context(),'items',items,'unread',(select count(*) from public.platform_communication_deliveries d join public.platform_communications c on c.id=d.communication_id where d.user_id=auth.uid() and d.read_at is null and c.channel in ('inapp','both') and app_private.communication_recipient(auth.uid(),c.audience,c.company_id)));
end;$$;
notify pgrst,'reload schema';

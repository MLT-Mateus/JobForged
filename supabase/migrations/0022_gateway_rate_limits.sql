-- migration-role: supabase_admin
-- Dedicated gateway database role has no table access and no business RPC rights.
do $$begin
 if not exists(select 1 from pg_roles where rolname='jbfd_security_gateway') then
  create role jbfd_security_gateway login nosuperuser nocreatedb nocreaterole noinherit;
 end if;
end;$$;
grant connect on database postgres to jbfd_security_gateway;
grant usage on schema app_private to jbfd_security_gateway;
alter role jbfd_security_gateway set statement_timeout='1500ms';
create index request_limits_expiration on app_private.request_limits(window_start);
create function app_private.gateway_rate_limit(category text,scope_hash text) returns boolean
language plpgsql security definer set search_path=pg_catalog as $$
declare maximum integer; seconds integer; bucket timestamptz; total integer;
begin
 if scope_hash is null or scope_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid scope' using errcode='22023';end if;
 case category
  when 'auth-ip' then maximum:=100;seconds:=60;
  when 'login-account' then maximum:=20;seconds:=300;
  when 'signup-ip' then maximum:=10;seconds:=3600;
  when 'recovery-account' then maximum:=5;seconds:=3600;
  when 'verify-ip' then maximum:=30;seconds:=60;
  when 'upload-ip' then maximum:=60;seconds:=60;
  when 'api-ip' then maximum:=600;seconds:=60;
  else raise exception 'invalid category' using errcode='22023';
 end case;
 bucket:=to_timestamp(floor(extract(epoch from clock_timestamp())/seconds)*seconds);
 insert into app_private.request_limits(scope,window_start,hits) values(category||':'||scope_hash,bucket,1)
 on conflict(scope,window_start) do update set hits=least(app_private.request_limits.hits+1,maximum+1)
 returning hits into total;
 -- Bounded opportunistic cleanup, independent of container uptime.
 if random()<0.01 then
  delete from app_private.request_limits where ctid in(
   select ctid from app_private.request_limits where window_start<now()-interval '2 days' limit 1000);
 end if;
 return total<=maximum;
end;$$;
alter function app_private.gateway_rate_limit(text,text) owner to postgres;
revoke all on function app_private.gateway_rate_limit(text,text) from public,anon,authenticated,service_role;
grant execute on function app_private.gateway_rate_limit(text,text) to jbfd_security_gateway;
-- Provision the role password privately during Test setup, never in a migration.

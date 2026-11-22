-- migration-role: supabase_admin
-- Fail safely rather than taking over an existing company address.
do $$begin if exists(select 1 from public.company_portals where slug in ('status','candidato')) then raise exception 'System address already assigned; resolve ownership before applying';end if;end$$;
create or replace function app_private.valid_portal_slug(value text) returns boolean language sql immutable set search_path=pg_catalog as $$
 select coalesce(length(value) between 3 and 63 and value~'^[a-z0-9]+(-[a-z0-9]+)*$' and value<>all(array['status','candidato','app','api','backoffice','login','cadastro','design-system','vagas','candidaturas','agenda','administradores','dashboards','configuracoes','financeiro','minha-conta','personalizacao','confirmar-email','convite','recuperar-senha','redefinir-senha','politicas-exclusao','politicas-privacidade','termos-servico','components','data','lib','401','403','404','500','503','brand','assets','careers','documents','fonts','images']),false);
$$;

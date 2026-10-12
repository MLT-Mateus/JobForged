# Supabase Auth inicial da JBFD

Esta etapa habilita acesso empresarial Free sem pagamento.

## Variáveis por ambiente

Configure na VPS, sem commitar valores reais:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use um projeto Supabase separado para Test e outro para Live.

## Cadastro Free

O cadastro envia os dados da empresa em `user_metadata`:

- `account_type=company_admin`
- responsável
- empresa
- CNPJ
- telefone
- plano escolhido
- `plan_status=free`

Se a confirmação de e-mail estiver ativa no Supabase, o usuário precisará confirmar o link antes do primeiro login. Para celeridade no Test inicial, desative temporariamente a confirmação de e-mail em Auth > Providers > Email.

## Banco e RLS

A migration `supabase/migrations/0001_company_auth.sql` cria:

- `public.companies`
- `public.company_members`
- trigger para criar empresa e titular quando um usuário `company_admin` nasce
- RLS para isolar cada empresa por `auth.uid()`

Não use `service_role` no frontend ou no `.env` da aplicação pública.

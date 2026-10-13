# Supabase Auth inicial da JBFD

Esta etapa habilita acesso empresarial Free sem pagamento.

## Isolamento por ambiente

Test e Live usam stacks self-hosted independentes, cada uma com banco, Auth, Storage, JWT secret, anon key, service-role key e volumes próprios. O stack Test atende `test.jobforged.com` e sua rede privada. O stack Live atende `jobforged.com` e `jbfd-live-internal`. O domínio do Studio também é separado.

As aplicações falam com o Supabase por rotas de servidor e pela rede Docker privada. Configure apenas estas variáveis no `.env` de cada aplicação, sem commitar valores reais:

- Test: `SUPABASE_INTERNAL_URL=http://supabase-envoy:8000`
- Live: `SUPABASE_INTERNAL_URL=http://supabase-live-envoy:8000`
- Ambas: `SUPABASE_ANON_KEY` com a chave pública gerada para o respectivo ambiente

Não compartilhe chaves, segredos JWT, senha Postgres, contas de Auth ou volumes entre Test e Live.

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

## Banco, RLS e promoção

A migration `supabase/migrations/0001_company_auth.sql` cria:

- `public.companies`
- `public.company_members`
- trigger para criar empresa e titular quando um usuário `company_admin` nasce
- RLS para isolar cada empresa por `auth.uid()`

Não use `service_role` no frontend ou no `.env` da aplicação pública. O schema é promovido por migrations versionadas: primeiro Test, depois Live. Não copie banco para publicar uma alteração de schema.

O refresh de dados de Live para Test é manual e unidirecional. Faça backup de Test antes, restaure apenas no banco Test e sanitize dados pessoais e sessões antes de liberar o ambiente para testes. Não execute sincronização contínua entre os bancos.

Live deve manter confirmação de e-mail ativa. Configure SMTP antes de habilitar o cadastro público; a confirmação automática de e-mail fica restrita a Test.

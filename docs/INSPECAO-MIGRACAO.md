# Inspeção da JBFD — base 0.00

Versão técnica: `0.0.0`. Revisão inicial: 2026-10-06. Estado operacional atualizado: 2026-10-13.

## Melhorias incluídas na base

- Imports, variáveis e diretivas ESLint sem uso removidos.
- Dependências dos efeitos de vagas corrigidas com callbacks estáveis.
- Imagens de marca centralizadas em `BrandAsset`, com dimensões explícitas e SVG sem processamento desnecessário.
- Checagem TypeScript, zero avisos ESLint, build e testes de HTML renderizado no CI.
- Actions fixadas por SHA, permissões mínimas e cancelamento de checks antigos.
- Node 22 documentado; versão e lockfile alinhados em `0.0.0`.
- Docker Node validado nos dois ambientes isolados pelo workflow.
- Branches `develop` (Test) e `main` (Live), sem reescrever histórico.
- Fluxo de publicação Test/Live preparado com gates de configuração e aprovação.

## Estado em produção

A imagem do commit `76815bb00767cf1621fd52eb61ae6d393bee7c81` está implantada em Test. Em 2026-10-13, `/api/health` respondeu HTTP 200 em Test e Live. Test tem configuração de autenticação Supabase; Live continua com a versão anterior do aplicativo e `/api/auth/config` responde 404. Existem stacks Supabase independentes para Test e Live, ambas saudáveis. Migrations de autenticação estão registradas/aplicadas nos dois bancos; nenhum dado de usuário foi copiado entre os ambientes.

## Itens restantes de operação

- [x] Configurar deploy automático de Test e validar publicação após corrigir a permissão de travessia do diretório do gateway.
- [x] Provisionar Supabase isolado em Test e Live, com migrations versionadas e backups verificados.
- [ ] Preparar Environment `jbfd-live` com aprovador obrigatório, credenciais de deploy separadas e proteção ativada.
- [ ] Configurar SMTP de Live antes de habilitar cadastro público e promover autenticação do aplicativo.
- [ ] Criar DNS `supabase-live.jobforged.com` apontando para a VPS, caso ainda não exista.
- [ ] Implementar pagamento/Asaas e integração operacional da aplicação com n8n.

A restauração de dados Live → Test deve ser uma operação manual, com backup de Test e sanitização de dados pessoais. Ainda não foi executada nesta preparação.

A CI verde confirma apenas os testes definidos. Não certifica os recursos ainda não implementados nem substitui revisão de segurança.

## Auditoria de dependências em 2026-10-06

A auditoria npm inicial encontrou 32 alertas (1 crítico, 24 altos, 6 moderados e 1 baixo). Foram atualizados Next, React/RSC, Vite, ESLint Next, ferramentas Cloudflare e dependências transitivas compatíveis.

O estado reportado na base foi de oito alertas altos e nenhum crítico, moderado ou baixo. A causa está em uma vulnerabilidade raiz de `braces` e na cadeia `micromatch`/`fast-glob`, presente nas ferramentas ESLint e Vinext. Não foi suprimida nem declarada resolvida.

Referência: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Dependabot está configurado para propor atualizações sem merge automático. Reavaliar a cadeia antes de adicionar padrões de busca controlados por usuários.

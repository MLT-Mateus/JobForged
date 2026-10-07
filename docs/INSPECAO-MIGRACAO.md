# Inspeção da JBFD — base 0.00

Versão técnica: `0.0.0`. Revisão inicial: 2026-10-06. Estado de migração atualizado: 2026-10-07.

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

A imagem do commit `40a560ad1d04be44125d8fd02744acc020010e8e` está implantada em `https://test.jobforged.com` e `https://jobforged.com`. O usuário validou os health checks dos dois ambientes. O código contém as páginas e componentes existentes, mas não contém ainda autenticação real, Supabase, Asaas ou integração operacional da aplicação com n8n.

## Itens restantes de operação

- [ ] Configurar os GitHub Environments `jbfd-test` e `jbfd-live`.
- [ ] Cadastrar secrets/variables para as chaves SSH próprias por ambiente.
- [ ] Criar usuário SSH sem sudo, gateway forçado e login GHCR somente leitura na VPS.
- [ ] Validar workflow automático em Test com um commit de mudança controlado.
- [ ] Ativar proteção de aprovação para Live e testar promoção manual.
- [ ] Implementar e testar o servidor MCP com OAuth 2.1 antes de publicar escrita.
- [ ] Planejar Supabase e integrações futuras com isolamento de dados e credenciais.

A CI verde confirma apenas os testes definidos. Não certifica os recursos ainda não implementados nem substitui revisão de segurança.

## Auditoria de dependências em 2026-10-06

A auditoria npm inicial encontrou 32 alertas (1 crítico, 24 altos, 6 moderados e 1 baixo). Foram atualizados Next, React/RSC, Vite, ESLint Next, ferramentas Cloudflare e dependências transitivas compatíveis.

O estado reportado na base foi de oito alertas altos e nenhum crítico, moderado ou baixo. A causa está em uma vulnerabilidade raiz de `braces` e na cadeia `micromatch`/`fast-glob`, presente nas ferramentas ESLint e Vinext. Não foi suprimida nem declarada resolvida.

Referência: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Dependabot está configurado para propor atualizações sem merge automático. Reavaliar a cadeia antes de adicionar padrões de busca controlados por usuários.

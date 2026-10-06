# JobForged (JBFD) — versão 0.00

Base inicial para a migração do sistema completo para uma VPS. A versão técnica
no npm é `0.0.0`; o nome usado no projeto é **0.00**.

## O que existe hoje

Landing page, Design System e biblioteca compartilhada, páginas de autenticação,
Home, telas administrativas e módulo demonstrativo de vagas e candidaturas.
Os serviços dessas telas usam dados simulados e, em alguns fluxos, armazenamento
no navegador. Não equivalem a autenticação real nem a um banco de produção.
Supabase, n8n e Asaas ainda não estão integrados.

## Executar e validar

Use Node.js 22 (arquivo `.nvmrc`) e o lockfile do repositório:

```bash
npm ci
npm run dev
```

Antes de publicar:

```bash
npm run check
```

Esse comando exige zero erros e zero avisos de ESLint, verifica TypeScript,
constrói o artefato e executa os testes de HTML renderizado. O CI executa essas
mesmas verificações nos pushes e Pull Requests para `main` e `develop`.

## Publicação atual e migração

Até a migração terminar, o Sites continua sendo a origem oficial: implementar,
validar e publicar no Sites; só depois sincronizar exatamente o código publicado
com o GitHub, conforme `AGENTS.md`. A Vercel não faz parte desse fluxo.

O objetivo da próxima etapa é empacotar **todo este sistema** em Docker e criar
produção e homologação na VPS. As branches não criam ambientes por si só.
Cada ambiente precisará de configuração, domínio, credenciais e dados isolados.
O build atual usa o runtime Cloudflare do Sites; o funcionamento em Node/Docker
precisa ser validado antes de mudar o domínio oficial.

Após a migração e sua validação, atualizar `AGENTS.md` para tornar o GitHub a origem
oficial. Desenvolvimento com IA/MCP deve gerar alterações revisáveis no Git,
passar pelo CI e promover a mesma versão testada para produção.

## Estrutura

- `app/`: páginas e telas do sistema.
- `app/components/ui/`: componentes e tokens compartilhados.
- `app/design-system/`: referência visual oficial.
- `public/brand/`: arquivos de marca.
- `worker/`, `build/`, `.openai/`: publicação atual no Sites.
- `db/`: preparação para D1; não há banco de produção configurado.
- `tests/`: verificações de HTML renderizado.
- `docs/INSPECAO-MIGRACAO.md`: inspeção e critérios da migração.

## Histórico e recuperação

Preservar os commits antigos. Falhas históricas de um deploy não alteram o estado
da versão atual. A versão 0.00 estabelece uma nova base sem perder a capacidade
de recuperar alterações. Reverter mudanças com novos commits; nunca reescrever
`main` com force push.

Credenciais e arquivos `.env` ficam fora do Git. Antes de cada promoção, revisar
as mudanças, executar as verificações e registrar o commit utilizado.

# JBFD na VPS: estado da migração 0.00

## Estado atual

A base 0.00 está implantada nos dois ambientes da VPS, com o domínio oficial apontando para Live:

- Test: <https://test.jobforged.com>
- Live: <https://jobforged.com>
- VPS: `187.77.229.27`
- Commit implantado nos dois ambientes: `40a560ad1d04be44125d8fd02744acc020010e8e`

Os endpoints `/api/health` foram validados pelo usuário. Cada ambiente usa um container, rede Compose, configuração `.env` e porta local diferentes. Ambos passam pelo Traefik compartilhado; n8n, Evolution API, Postgres e Redis existentes não foram incorporados à rede interna JBFD.

## O que está no sistema

O Docker executa todas as páginas e assets existentes na base: landing page, Design System, telas administrativas e de candidato que já estão no código, e fluxos demonstrativos. Ainda não há autenticação real, banco de produção, Supabase, Asaas ou integração funcional da aplicação com n8n. O endpoint `/api/health` confirma a saúde do app, não desses serviços futuros.

O build Node independente e Docker não dependem de Sites ou Vercel. O domínio `jobforged.com` já está na VPS. O código e o histórico ficam no GitHub `MLT-Mateus/JobForged`.

## Separação Live/Test

- `develop` alimenta Test; `main` representa Live.
- Configurações ficam somente em `/opt/jbfd/test/.env` e `/opt/jbfd/live/.env`.
- O Compose e as redes internas são separados; somente o Traefik é compartilhado.
- A mesma imagem versionada por SHA deve ser validada em Test e promovida a Live.
- Supabase, integrações e dados precisarão de projetos/credenciais independentes ao serem adicionados.

## Próxima etapa operacional

A publicação automatizada foi preparada no repositório, mas ainda depende de configurar Environments, secrets, variables, GHCR e usuário SSH restrito na VPS. O passo a passo está em [`OPERACAO-GITHUB-VPS.md`](OPERACAO-GITHUB-VPS.md). Até concluir esse checklist, deploy automático permanece desativado.

A implantação do MCP também é uma etapa futura. A arquitetura e limites de acesso propostos estão descritos no mesmo guia; não há endpoint MCP publicado ainda.

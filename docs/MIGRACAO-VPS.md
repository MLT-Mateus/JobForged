# JobForged na VPS: operação dos ambientes

## Estado atual

O aplicativo tem ambientes independentes na mesma VPS:

- Test: <https://test.jobforged.com>
- Live: <https://jobforged.com>
- VPS: `187.77.229.27`
- Test usa `develop`; Live usa uma versão integrada e promovida manualmente de `main`.

Cada aplicativo usa seu próprio container, rede Compose, `.env` e porta local. Os dois passam pelo Traefik compartilhado. A pilha de automações — n8n, Evolution API, PostgreSQL e Redis — permanece isolada.

## O que está no sistema

Supabase self-hosted está provisionado em dois projetos Compose independentes: `/opt/jbfd/supabase` (Test) e `/opt/jbfd/supabase-live` (Live), cada um com banco, segredos, volumes e rede próprios. Os dois ambientes estavam saudáveis na última verificação (2026-10-13). Nenhum dos bancos reutiliza o PostgreSQL da automação ou o banco de identidade do MCP. A stack Live está pronta no backend, mas a aplicação Live ainda não aponta para ela e os cadastros públicos permanecem desabilitados até configurar SMTP e promover o código.

O build Node independente e Docker não dependem de Sites ou Vercel. O domínio `jobforged.com` já está na VPS. O código e o histórico ficam no GitHub `MLT-Mateus/JobForged`.

## Separação Live/Test

- `develop` alimenta Test; `main` representa Live.
- Configurações ficam somente em `/opt/jbfd/test/.env` e `/opt/jbfd/live/.env`.
- O Compose e as redes internas são separados; somente o Traefik é compartilhado.
- A mesma imagem versionada por SHA deve ser validada em Test e promovida a Live.
- Cada ambiente Supabase mantém Auth, banco, Storage, chaves e volumes próprios.
- Migrations versionadas são aplicadas primeiro em Test e depois em Live; dados não acompanham o deploy da imagem.
- Um refresh de Live para Test é uma restauração manual, com backup de Test e sanitização de dados pessoais.

Toda promoção deve seguir [`GUIA-PROMOCAO-TEST-LIVE.md`](GUIA-PROMOCAO-TEST-LIVE.md): o app Live usa o mesmo SHA validado em Test e cada migration do SHA é aplicada e conferida separadamente em cada banco. Hoje a aplicação de migrations ainda é manual; o workflow de deploy não deve ser tratado como se sincronizasse schema automaticamente.

## Próxima etapa operacional

A publicação usa imagens imutáveis. O workflow de Live promove manualmente um SHA aprovado; atualizar uma imagem não copia nem restaura dados de banco. O passo a passo está em [`OPERACAO-GITHUB-VPS.md`](OPERACAO-GITHUB-VPS.md).

O MCP está publicado separadamente em `https://mcp.jobforged.com/mcp`; ele não faz parte das stacks da aplicação nem dos projetos Supabase. O painel Studio de Live está configurado para `supabase-live.jobforged.com`; confira/crie o DNS A para `187.77.229.27` antes de acessar. `supabase.jobforged.com` continua associado a Test.

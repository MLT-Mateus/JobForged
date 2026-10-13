# JobForged na VPS: operação dos ambientes

## Estado atual

O aplicativo tem ambientes independentes na mesma VPS:

- Test: <https://test.jobforged.com>
- Live: <https://jobforged.com>
- VPS: `187.77.229.27`
- Test usa `develop`; Live usa uma versão integrada e promovida manualmente de `main`.

Cada aplicativo usa seu próprio container, rede Compose, `.env` e porta local. Os dois passam pelo Traefik compartilhado. A pilha de automações — n8n, Evolution API, PostgreSQL e Redis — permanece isolada.

## O que está no sistema

O Supabase self-hosted de Test está conectado à rede privada de Test. O Supabase Live deve usar outro projeto Compose, outro banco, novos segredos e a rede privada Live. Nenhum dos bancos do Supabase reutiliza o PostgreSQL da automação ou o banco de identidade do MCP.

O build Node independente e Docker não dependem de Sites ou Vercel. O domínio `jobforged.com` já está na VPS. O código e o histórico ficam no GitHub `MLT-Mateus/JobForged`.

## Separação Live/Test

- `develop` alimenta Test; `main` representa Live.
- Configurações ficam somente em `/opt/jbfd/test/.env` e `/opt/jbfd/live/.env`.
- O Compose e as redes internas são separados; somente o Traefik é compartilhado.
- A mesma imagem versionada por SHA deve ser validada em Test e promovida a Live.
- Cada ambiente Supabase mantém Auth, banco, Storage, chaves e volumes próprios.
- Migrations versionadas são aplicadas primeiro em Test e depois em Live; dados não acompanham o deploy da imagem.
- Um refresh de Live para Test é uma restauração manual, com backup de Test e sanitização de dados pessoais.

## Próxima etapa operacional

A publicação usa imagens imutáveis. O workflow de Live promove manualmente um SHA aprovado; atualizar uma imagem não copia nem restaura dados de banco. O passo a passo está em [`OPERACAO-GITHUB-VPS.md`](OPERACAO-GITHUB-VPS.md).

A implantação do MCP também é uma etapa futura. A arquitetura e limites de acesso propostos estão descritos no mesmo guia; não há endpoint MCP publicado ainda.

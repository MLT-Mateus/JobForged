# Operação GitHub → VPS

Este guia prepara publicação contínua com limites claros: `develop` pode publicar em Test após CI aprovado; Live só recebe um SHA de `main` por execução manual e aprovação do ambiente protegido do GitHub.

## Estado da configuração

O deploy automático de Test está habilitado e validado em 2026-10-13. A publicação Live continua protegida e indisponível até existir o Environment `jbfd-live` com aprovador obrigatório, credenciais próprias e a variável `JBFD_LIVE_DEPLOY_ENABLED=true` habilitada deliberadamente. Os serviços atuais continuam no ar.

- Test: `https://test.jobforged.com` — `/opt/jbfd/test/.env` — porta local 3101.
- Live: `https://jobforged.com` — `/opt/jbfd/live/.env` — porta local 3100.
- Imagens: `ghcr.io/mlt-mateus/jobforged:<SHA completo>`.
- Rede do Traefik: `jobforged_jobforged_network`.

## 1. Preparar a conta GitHub

No repositório `MLT-Mateus/JobForged`, `jbfd-test` já está configurado. Criar o Environment `jbfd-live` antes de preparar a promoção.

Para cada ambiente, adicionar Variables próprias:

- `VPS_DEPLOY_HOST`: IP ou host SSH da VPS.
- `VPS_DEPLOY_USER`: usuário de deploy restrito.

Para cada ambiente, adicionar Secrets independentes:

- `VPS_DEPLOY_KEY`: chave privada própria do ambiente.
- `VPS_KNOWN_HOSTS`: linha verificada da chave pública SSH do host. Obter a impressão digital por um canal confiável; não confiar cegamente em `ssh-keyscan`.

No Environment `jbfd-live`, configurar o usuário Mateus como required reviewer e impedir que a pessoa que iniciou o deploy aprove a própria execução, se essa opção estiver disponível. Criar ainda a repository variable `JBFD_LIVE_DEPLOY_ENABLED=true` somente depois de confirmar essa proteção.

Test usa a variável de repositório `JBFD_AUTO_DEPLOY_TEST=true`; a publicação foi validada após a instalação da chave restrita e o ajuste de permissão do gateway.

## 2. Preparar a imagem no GHCR

O workflow de Test cria uma imagem privada no GitHub Container Registry. A publicação usa `packages: write`; o job de deploy separado recebe somente `packages: read`. O `GITHUB_TOKEN` de curta duração segue pelo canal SSH criptografado como entrada padrão, é usado em um `DOCKER_CONFIG` temporário sob `/run` e removido ao terminar. Nenhum token do registry fica salvo na VPS. O pacote precisa permitir acesso ao repositório `MLT-Mateus/JobForged`.

Verifique no GHCR que o pacote `jobforged` permite que o repositório use seu `GITHUB_TOKEN`. O deploy não grava credenciais Docker persistentes na VPS.

## 3. Criar o usuário de deploy restrito na VPS

A chave SSH de deploy não pode ser a chave root. Para Test, crie o usuário `jbfd-deploy` sem senha e sem associação ao grupo `docker`. O socket Docker equivale a controle elevado da VPS. O usuário pode executar somente o gateway forçado e uma regra `sudoers` validada com `visudo` que permite o script root-owned `/opt/jbfd/bin/jbfd-deploy-test-root.sh`, sem argumentos. O `.env` permanece `root:root` com modo `600`.

Instale `scripts/deploy-vps.sh`, `scripts/jbfd-deploy-gateway-test.sh`, `scripts/jbfd-deploy-test-root.sh`, `scripts/jbfd-supabase-smtp-test-root.sh` e `deploy/compose.yml` nos caminhos usados pelo gateway, sempre de propriedade de root e sem escrita pelo usuário de deploy. Preserve `/opt/jbfd`, as pastas `test` e `live`, os `.env` e containers existentes. A regra `sudoers`, validada com `visudo`, permite executar sem argumentos somente `/opt/jbfd/bin/jbfd-deploy-test-root.sh` e `/opt/jbfd/bin/jbfd-supabase-smtp-test-root.sh`.

Gere uma chave Ed25519 para Test. Em `/home/jbfd-deploy/.ssh/authorized_keys`, instale a linha abaixo com a chave pública Test. O gateway valida o comando original `deploy test <SHA completo>`:

```text
restrict,command="/opt/jbfd/bin/jbfd-deploy-gateway-test.sh" ssh-ed25519 CHAVE_PUBLICA_TEST
```

Copie a chave privada Test para o Secret `VPS_DEPLOY_KEY` do Environment `jbfd-test`; ela não será exibida no chat. A chave Test não tem caminho para publicar Live. A configuração de Live permanece separada e inalterada.

O gateway Test aceita `deploy test <SHA>` para o app e `configure smtp test` para o SMTP do Supabase Auth; ambos recebem os dados somente pela entrada padrão e não dão shell, encaminhamento de portas ou comando Docker arbitrário. O deploy do app mantém a função de validar o SHA, atualizar somente `JBFD_IMAGE` e `BREVO_API_KEY`, verificar a imagem, o Compose e o healthcheck. O comando SMTP escreve somente o `.env` root-only do Supabase Test, valida o Compose e recria somente `auth`, com restauração da configuração anterior se falhar. Cada workflow verifica seu próprio protocolo antes de alterar o ambiente.

## 4. Fazer a primeira publicação

1. Abrir PR para `develop` e esperar o workflow `Qualidade da JBFD` concluir com sucesso.
2. Com a chave/segredo e variável `JBFD_AUTO_DEPLOY_TEST=true` configurados, o workflow publica a imagem e atualiza Test.
3. Validar visualmente Test e o endpoint `https://test.jobforged.com/api/health`.
4. Abrir PR de promoção para `main`. Para o workflow confirmar que o SHA de Test está integrado em `main`, usar a estratégia de merge que preserva o commit original (merge commit). Não usar squash ou rebase para essa promoção.
5. No GitHub Actions, iniciar `Promover versão para Live` com o SHA completo validado em Test. O ambiente `jbfd-live` precisa liberar a execução.
6. Conferir `https://jobforged.com/api/health` e navegar pelo site.

O workflow de Live valida que o SHA informado está na história de `main` e que a imagem desse mesmo SHA existe no GHCR antes de solicitar o deploy à VPS.

## 5. MCP, código e publicação

O MCP está publicado em `https://mcp.jobforged.com/mcp` e conectado ao Codex por OAuth. Atualmente oferece somente `jbfd_status` e `jbfd_diagnostics`, ferramentas de consulta que leem snapshots filtrados. Não têm acesso ao GitHub, shell, socket Docker, arquivos `.env` nem publicação.

O Codex altera o código no checkout local do repositório e registra as mudanças no GitHub. Depois que os segredos/configurações deste guia forem instalados, o workflow publica em Test após CI aprovado. Você valida Test; Live é iniciado separadamente pelo workflow manual e passa pela aprovação protegida do GitHub. Assim existem apenas dois ambientes publicados, sem um terceiro servidor de desenvolvimento.

O código MCP está versionado em `services/mcp`, `scripts/mcp` e `deploy/mcp`. A cópia atualmente executada na VPS veio do pacote de preparação. Atualizar o MCP é uma operação separada do deploy do site e deve ser feita apenas quando houver uma alteração específica no serviço MCP.

## Segurança básica

- Não enviar `.env`, tokens, chaves privadas ou tokens de acesso ao chat.
- Não colocar segredos em arquivos do repositório, workflows ou logs.
- Não abrir portas Docker 3100/3101 para a internet; elas devem continuar em localhost.
- Nunca permitir que a chave do Test publique Live.
- Manter proteção de aprovação ativa no Environment `jbfd-live`.
- Fazer rollback da imagem não desfaz mudanças no banco. Faça backup verificado antes das migrations e aplique migrations versionadas com cuidado. Scripts de backup/migration estão em `scripts/` e a operação por ambiente está descrita em `docs/MIGRACAO-VPS.md`.
- Test e Live têm projetos Supabase isolados. Nunca copie dados Live para Test sem backup, consentimento operacional e sanitização dos dados pessoais.

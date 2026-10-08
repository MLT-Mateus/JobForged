# Operação GitHub → VPS

Este guia prepara publicação contínua com limites claros: `develop` pode publicar em Test após CI aprovado; Live só recebe um SHA de `main` por execução manual e aprovação do ambiente protegido do GitHub.

## Estado da configuração

O código contém os workflows e o gateway restrito, mas ainda falta configuração de conta. Enquanto os itens deste guia não estiverem completos, nenhum deploy automático deve ser habilitado. Os serviços atuais continuam no ar.

- Test: `https://test.jobforged.com` — `/opt/jbfd/test/.env` — porta local 3101.
- Live: `https://jobforged.com` — `/opt/jbfd/live/.env` — porta local 3100.
- Imagens: `ghcr.io/mlt-mateus/jobforged:<SHA completo>`.
- Rede do Traefik: `jobforged_jobforged_network`.

## 1. Preparar a conta GitHub

No repositório `MLT-Mateus/JobForged`, criar dois Environments: `jbfd-test` e `jbfd-live`.

Para ambos, adicionar Variables:

- `VPS_DEPLOY_HOST`: IP ou host SSH da VPS.
- `VPS_DEPLOY_USER`: usuário de deploy restrito.

Para ambos, adicionar Secrets:

- `VPS_DEPLOY_KEY`: chave privada própria do ambiente.
- `VPS_KNOWN_HOSTS`: linha verificada da chave pública SSH do host. Obter a impressão digital por um canal confiável; não confiar cegamente em `ssh-keyscan`.

No Environment `jbfd-live`, configurar o usuário Mateus como required reviewer e impedir que a pessoa que iniciou o deploy aprove a própria execução, se essa opção estiver disponível. Criar ainda a repository variable `JBFD_LIVE_DEPLOY_ENABLED=true` somente depois de confirmar essa proteção.

Para Test automático, criar repository variable `JBFD_AUTO_DEPLOY_TEST=true` depois de concluir a instalação da chave restrita. Se ausente ou `false`, o workflow não publica.

## 2. Preparar a imagem no GHCR

O workflow de Test cria uma imagem privada no GitHub Container Registry. Na VPS, o usuário de deploy precisa fazer login no GHCR com um token pessoal somente de leitura de pacotes (`read:packages`). O token fica no armazenamento Docker desse usuário na VPS, nunca no GitHub, no repositório ou em `.env`.

Faça o login interativo como usuário de deploy, para que o arquivo de credenciais fique sob a conta certa:

```bash
docker login ghcr.io --username SEU_USUARIO_GITHUB
```

Cole o token somente no prompt do Docker. Não passe o token como argumento de comando. Mantenha `~/.docker/config.json` acessível apenas ao usuário de deploy. Verifique no GHCR que o pacote `jobforged` foi criado após a primeira publicação de Test.

## 3. Criar o usuário de deploy restrito na VPS

A chave SSH de deploy não pode ser a chave root. Crie um usuário próprio, adicione-o ao grupo `docker` (o acesso ao socket Docker equivale a controle elevado da VPS), e não conceda sudo. A conta só poderá executar o gateway forçado em `authorized_keys`.

Instale os arquivos versionados do repositório em `/opt/jbfd/bin/` e deixe-os sem escrita para o usuário de deploy. Somente `/opt/jbfd/releases/` precisa ser gravável por ele; o lock fica dentro desse diretório. Preserve `/opt/jbfd`, as pastas `test` e `live`, os `.env` e containers existentes. Os `.env` devem permanecer no modo `600` e legíveis pelo usuário que executa Compose.

Gere duas chaves Ed25519 distintas: uma só para Test e outra só para Live. Em `~/.ssh/authorized_keys` do usuário de deploy, use linhas equivalentes a estas, substituindo as chaves públicas:

```text
restrict,command="/opt/jbfd/bin/jbfd-deploy-gateway.sh test" ssh-ed25519 CHAVE_PUBLICA_TEST
restrict,command="/opt/jbfd/bin/jbfd-deploy-gateway.sh live" ssh-ed25519 CHAVE_PUBLICA_LIVE
```

Copie cada chave privada apenas para o Secret `VPS_DEPLOY_KEY` do Environment correspondente. A chave de Test não consegue publicar Live, mesmo que seja usada fora do workflow.

O gateway aceita somente `deploy test <SHA>` ou `deploy live <SHA>`, conforme a chave. Não dá shell, encaminhamento de portas nem comando Docker arbitrário. O helper valida o SHA, obtém o commit público, atualiza apenas `JBFD_IMAGE`, baixa a imagem, confere se o rótulo da imagem corresponde ao mesmo SHA, valida o Compose, aguarda healthcheck e restaura a imagem anterior se o deploy falhar. Os `.env` precisam continuar com modo `600` e ser legíveis pelo usuário que executa Compose.

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
- Fazer rollback da imagem não desfaz mudanças futuras no banco; quando o Supabase entrar, será necessário planejar backup e migrações reversíveis.

# JBFD: preparação do MCP

## Situação em 08/10/2026

O servidor MCP está instalado em `https://mcp.jobforged.com/mcp`, autenticado por OAuth e conectado ao Codex. As consultas confirmaram Live e Test saudáveis no commit `40a560ad1d04be44125d8fd02744acc020010e8e`.

Esta documentação acompanha o código do serviço para manutenção versionada. A instalação em produção foi feita a partir do pacote transferido para `/opt/jbfd/mcp-preparation`; a atualização do serviço a partir do checkout GitHub ainda precisa de um procedimento controlado.

## O que está pronto

| Peça | Função |
| --- | --- |
| services/mcp | MCP Streamable HTTP, com SDK oficial e dependências fixadas em lockfile |
| deploy/mcp/compose.yml | Container próprio, usuário sem privilégios, arquivos somente leitura e porta local |
| scripts/mcp/collect.py | Consulta containers JBFD e portas locais 3100/3101; exporta snapshot a cada minuto |
| deploy/mcp/identity.compose.yml | Opção de OAuth na VPS: Keycloak e Postgres próprios |
| deploy/mcp/realm.json | Scope jbfd:read, sujeito/audiência, recurso MCP e cliente Codex com PKCE |
| deploy/mcp/codex.config.example.toml | Bloco para adicionar ao Codex sem substituir configurações existentes |
| scripts/mcp/install.sh | Etapas separadas de preparação, instalação, verificação e parada |

O banco da identidade armazena contas/sessões OAuth. Não é o banco do produto JBFD nem substitui o futuro Supabase.

### Ferramentas atualmente publicadas

- jbfd_status: estado/saúde dos containers, versão e commit de Live e Test.
- jbfd_diagnostics: contagens de erros/avisos nas últimas 200 linhas dos últimos 15 minutos. São classificações heurísticas; não são totais completos nem texto bruto de logs.

As respostas informam quando os dados foram coletados. Após 180 segundos, o snapshot aparece como antigo: stale=true.

O container MCP lê somente snapshots. Não recebe socket Docker, releases ou arquivos .env do produto. Um coletor systemd separado realiza chamadas fixas de consulta e filtra os campos antes de gravá-los. A saída exclui mensagens de logs, variáveis de ambiente e texto dos healthchecks Docker.

Tokens são verificados por assinatura, emissor, audiência, validade, scope, usuário e cliente autorizado. Tokens inválidos recebem 401; usuários/clientes/scopes sem acesso recebem 403. O discovery é público para iniciar OAuth. Host/Origin são validados e os corpos HTTP têm tamanho limitado.

As duas ferramentas são somente de consulta. O MCP não altera arquivos nem publica versões. O Codex trabalha no checkout do repositório; GitHub Actions publica Test após CI e Live continua sendo uma promoção manual protegida. Não conceder acesso ao socket Docker, shell ou arquivos `.env` ao container MCP.

## Validações realizadas

- 10 testes Node passaram, incluindo cliente oficial inicializando por HTTP e chamando ferramentas.
- 4 testes Python passaram: descarte de campos extras/segredos fictícios, falha do Docker e limites.
- ESLint, sintaxe Bash e git diff --check passaram.
- Os dois Compose foram validados com Docker Compose v5.0.2 oficial e checksum conferido, usando configurações fictícias.

### Pendências de validação

Não existe Docker daemon ou perfil SSH da VPS nesta sessão. Não foram executados build das imagens, inicialização do Keycloak, emissão real de certificado ou login OAuth de ponta a ponta.

O endpoint de auditoria npm retornou erro 502. Isso não estabelece se há vulnerabilidades. O instalador exige auditoria sem avisos altos/críticos antes de iniciar o MCP; esse gate precisa passar na VPS.

Resource Indicators é experimental no Keycloak. O template habilita esse recurso para vincular e validar o parâmetro OAuth resource. Keycloak está fixado em 26.8.0; o login real precisa ser testado antes de considerar a integração operacional. Não há garantia antecipada de compatibilidade com todos os clientes.

As imagens de base Node 24 e Postgres 17 seguem tags da versão principal. Registre os digests resolvidos na instalação para reproduzir o build. Não houve auditoria das imagens Docker nesta sessão.

## Instalação, passo a passo

### 1. Transferir e preparar

Baixe o pacote para seu computador. No terminal do computador, usando seu acesso SSH existente:

```bash
scp jbfd-mcp-preparacao.tar.gz root@187.77.229.27:/root/
```

Você também pode enviar pela ferramenta de arquivos da VPS. Insira credenciais apenas no seu terminal.

Na VPS:

```bash
install -d -m 700 /opt/jbfd/mcp-preparation
tar --no-same-owner -xzf /root/jbfd-mcp-preparacao.tar.gz \
  -C /opt/jbfd/mcp-preparation --strip-components=1
cd /opt/jbfd/mcp-preparation
bash scripts/mcp/install.sh prepare
```

O prepare cria configurações com permissão 600 e gera senhas aleatórias diretamente na VPS. Preserva configurações existentes. Não inicia containers nem timers.

### 2. DNS

| Registro A | IP |
| --- | --- |
| mcp.jobforged.com | 187.77.229.27 |
| auth.jobforged.com | 187.77.229.27 |

Confira também se há AAAA antigos apontando a outro servidor. O Traefik existente fará TLS. O instalador confere IPv4 antes de iniciar os serviços novos.

### 3. Identidade

Na pasta do pacote na VPS:

```bash
bash scripts/mcp/install.sh identity-up
curl --fail --show-error --max-time 30 \
  https://auth.jobforged.com/realms/jbfd/.well-known/openid-configuration
```

O projeto jbfd-identity tem volume de banco e rede próprios. Não reutiliza o Postgres das automações.

Para abrir o painel administrativo, faça um túnel no terminal do seu computador:

```bash
ssh -N -L 8082:127.0.0.1:8082 root@187.77.229.27
```

Abra http://localhost:8082/admin/ nesse computador. O HTTP é local dentro do túnel SSH. Rotas administrativas não são publicadas pelo Traefik; login OAuth dos realms e recursos estáticos são.

O usuário de bootstrap é jbfd-admin. Consulte a senha apenas no seu próprio terminal, no arquivo /opt/jbfd/mcp/.env.oauth. Não envie arquivo, screenshot ou senha ao chat. Crie sua conta administrativa definitiva e substitua a conta temporária seguindo o fluxo do Keycloak.

No realm jbfd, crie sua conta Mateus e defina credenciais diretamente no painel. Copie o UUID mostrado para MCP_ALLOWED_SUBJECTS em /opt/jbfd/mcp/.env. O UUID identifica o usuário; não é uma senha.

O cliente jbfd-codex e o recurso jbfd-mcp-resource são importados na primeira inicialização. O scope inclui mappers de sujeito/audiência. Codex usa authorization code e PKCE S256, sem password grant ou implicit flow.

A importação não atualiza automaticamente realms existentes. Se já houver realm jbfd, revise pelo painel; não apague o banco.

### 4. Coletor e MCP

```bash
bash scripts/mcp/install.sh collector-install
systemctl status jbfd-mcp-collector.timer --no-pager
bash scripts/mcp/install.sh check
```

O check constrói a imagem, consulta auditoria npm e verifica discovery HTTPS, PKCE, identificação do emissor, scope, JWKS e snapshot recente. Não inicia o MCP.

Se passar:

```bash
bash scripts/mcp/install.sh mcp-up
curl --fail --show-error https://mcp.jobforged.com/healthz
curl --show-error -o /dev/null -w '%{http_code}\n' \
  -X POST https://mcp.jobforged.com/mcp
```

A primeira resposta deve conter status=ok. A segunda deve ser 401: acesso sem token precisa ser recusado.

### 5. Codex

No computador do Codex, acrescente o bloco de deploy/mcp/codex.config.example.toml à configuração existente. Ele registra jbfd-codex, callback local na porta 5555 e somente duas ferramentas de consulta.

O preflight exige discovery anunciando identificação do emissor para esse callback estável. Se o cliente mostrar callback diferente, registre exatamente o que ele mostrar e ajuste o bloco.

```bash
codex mcp login jbfd
codex mcp list
```

Faça login na conta do realm jbfd, autorize consulta e peça:

> Consulte o estado de Live e Test da JBFD. Informe também o horário do snapshot.

Verifique também que uma conta não autorizada é recusada e que pedidos de shell, edição de .env ou deploy não encontram ferramentas.

### 6. ChatGPT e outras IAs

Depois de validar Codex, na opção MCP personalizado use https://mcp.jobforged.com/mcp e OAuth.

Crie um cliente jbfd-chatgpt separado no Keycloak: authorization code, PKCE S256 e scope jbfd:read. Sem password grant/implicit flow. Use exatamente o redirect mostrado no gerenciamento da conexão MCP. Se exigir segredo de cliente, gere-o no provedor e preencha apenas na interface segura.

Não use redirects com curingas nem registro anônimo de clientes. Esta preparação usa clientes previamente registrados; CIMD/DCR não foram habilitados. Se sua interface não aceitar cliente pré-registrado, outro método precisa ser validado e configurado antes da conexão.

Outras IAs precisam suportar MCP remoto Streamable HTTP e esse OAuth. Cada cliente novo precisa de registro e inclusão em MCP_ALLOWED_CLIENTS.

## Operação e recuperação

Para parar apenas o MCP e seu coletor:

```bash
bash scripts/mcp/install.sh mcp-stop
systemctl disable --now jbfd-mcp-collector.timer
```

Essas ações não param os containers Live/Test ou as automações. Não remova o volume de identidade em atualizações: contém contas/sessões. Faça backup do banco de identidade antes de atualizar Keycloak/Postgres.

O próximo passo operacional é terminar a configuração do GitHub Environment, GHCR e chave SSH restrita para o workflow Test. Live usa workflow manual e aprovação no GitHub. As ferramentas MCP permanecem somente de consulta; para desenvolvimento, o Codex edita o repositório e o CI/publicação executam o fluxo Test → aprovação → Live.

## Referências oficiais

- OpenAI Docs: https://learn.chatgpt.com/docs/extend/mcp?surface=cli
- Autenticação OpenAI: https://developers.openai.com/plugins/build/auth
- Autorização MCP: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- Keycloak/MCP: https://www.keycloak.org/securing-apps/mcp-authz-server
- Containers Keycloak: https://www.keycloak.org/server/containers
- Hostname administrativo: https://www.keycloak.org/server/hostname
- Mappers de sujeito: https://www.keycloak.org/admin-api/protocol-mappers

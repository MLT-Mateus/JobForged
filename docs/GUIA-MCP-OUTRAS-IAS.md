# Guia simples: conectar o MCP da JobForged a outra IA

Atualizado em 13/10/2026. Este guia descreve a integração MCP de consulta da JBFD e o que preparar se você trocar o ChatGPT por outro assistente.

## Resumo para copiar

| Campo | Valor |
| --- | --- |
| Tipo | MCP remoto, transporte Streamable HTTP |
| Endereço MCP | `https://mcp.jobforged.com/mcp` |
| Autenticação | OAuth 2.1/OIDC pelo Keycloak da JBFD |
| Emissor OAuth | `https://auth.jobforged.com/realms/jbfd` |
| Escopo | `jbfd:read` |
| Recurso/audience | `https://mcp.jobforged.com/mcp` |
| Fluxo esperado | Authorization Code com PKCE S256 |

O endpoint MCP e o discovery OAuth responderam corretamente na última verificação desta documentação. O servidor não permite cadastro automático de clientes OAuth. Uma IA diferente pode exigir que seu cliente e callback sejam cadastrados antes da conexão.

## O que a IA poderá fazer

O MCP tem somente duas ferramentas de leitura:

- `jbfd_status`: consulta saúde, versão, commit e estado dos serviços Live e Test.
- `jbfd_diagnostics`: consulta contagens aproximadas de erros/avisos recentes; não retorna linhas ou texto bruto dos logs.

Os dados vêm de snapshots coletados aproximadamente uma vez por minuto. Cada resposta inclui `collectedAt`, `ageSeconds` e `stale`. Se `stale` for `true` — ou a idade passar de 180 segundos — a IA deve avisar que o estado pode estar desatualizado.

O MCP **não** permite editar o código, consultar ou alterar tabelas Supabase, ler `.env`, ver segredos, abrir shell, acessar Docker ou executar deploy. A IA nova trabalhará no código do repositório por outro meio, se você configurar esse acesso separadamente; conectar o MCP não transfere permissões do Codex, GitHub ou VPS.

## Requisitos para a outra IA

Antes de começar, confirme se o produto oferece:

1. Conexão a servidor MCP remoto por Streamable HTTP, com URL HTTPS.
2. OAuth/OIDC com Authorization Code e PKCE S256.
3. Cadastro de uma integração OAuth pré-registrada, ou suporte a client ID fornecido pelo administrador.
4. Um callback/redirect URI estável que possa ser informado ao administrador da JBFD.

Uma opção que aceita somente MCP local por `stdio`, exige login por token colado manualmente, exige Dynamic Client Registration (DCR) ou não permite configurar callback não é compatível com a configuração atual sem uma alteração administrativa/servidor.

## Passo a passo da migração

### 1. Guardar a conexão atual

Não remova a conexão do ChatGPT ainda. Uma migração de IA não transfere tokens nem sessões OAuth existentes. Primeiro conecte e valide o cliente novo; depois você pode deixar de usar a conexão anterior.

Guarde apenas os dados não secretos desta página: URL MCP, emissor, escopo e fluxo OAuth. **Não exporte ou compartilhe cookies, tokens de acesso/refresh, chave privada, senha ou arquivo `.env`.**

### 2. Abrir a configuração MCP da nova IA

Na nova IA, procure algo como **Conectores**, **Integrações**, **MCP personalizado** ou **Adicionar servidor MCP**. Informe:

- URL: `https://mcp.jobforged.com/mcp`
- Transporte: Streamable HTTP (se houver seletor)
- Autenticação: OAuth/OIDC
- Emissor: `https://auth.jobforged.com/realms/jbfd`
- Escopo: `jbfd:read`
- Recurso: `https://mcp.jobforged.com/mcp` (se solicitado)

Inicie a conexão e anote o callback/redirect URI que a IA mostrar. Não use curingas nem invente o endereço. Se ela exibir um client ID próprio e indicar que usa registro dinâmico, anote isso também: a configuração atual da JBFD não aceita DCR automaticamente.

### 3. Pedir o cadastro administrativo

Se a nova IA não conectar diretamente, o administrador do provedor OAuth da JBFD precisa:

1. Criar no realm `jbfd` um cliente OIDC exclusivo para essa IA. Use um nome claro, como `jbfd-nome-da-ia`.
2. Habilitar Authorization Code, exigir PKCE S256, manter implicit flow, password/direct grant e service account desabilitados e registrar somente o callback exato informado pela IA.
3. Garantir o escopo `jbfd:read` e a audience/recurso `https://mcp.jobforged.com/mcp` no token.
4. Autorizar o client ID na allowlist `MCP_ALLOWED_CLIENTS` e o usuário autorizado na `MCP_ALLOWED_SUBJECTS` do MCP. Se o cliente enviar cabeçalho `Origin`, incluir somente a origem exata em `MCP_ALLOWED_ORIGINS`.
5. Recarregar a configuração de forma controlada e validar o acesso.

O cadastro do cliente e a allowlist são requisitos de segurança: conhecer a URL pública não dá acesso. A configuração atual não permite registro aberto. O usuário precisa ser uma conta já autorizada no realm JBFD.

Faça a administração do Keycloak somente pela sessão/túnel administrativo autorizado e por uma pessoa com acesso à VPS. A senha do painel e os segredos OAuth devem ser inseridos diretamente no painel seguro ou terminal administrativo; não os envie ao chat nem à IA.

Se o provedor pedir `client_secret`, ele deve ser criado e guardado no cofre/interface segura da nova IA. Não reutilize segredo de outro cliente. Para clientes públicos com PKCE, não invente um secret.

### 4. Entrar e validar

1. Conclua o login OAuth no navegador usando a conta autorizada da JBFD e aceite o consentimento.
2. Na nova IA, peça para listar as ferramentas MCP e confirme que aparecem `jbfd_status` e `jbfd_diagnostics`.
3. Faça uma consulta simples: “Consulte o estado de Live e Test da JBFD e informe o horário do snapshot.”
4. Confirme que a resposta traz o horário e os campos de idade/atualidade. Teste uma consulta de diagnóstico sem pedir dados de log.
5. Confirme que pedidos de edição, acesso a segredos ou deploy não estão disponíveis pelo MCP.

### 5. Encerrar a conexão anterior (opcional)

Depois de validar a nova IA, remova a conexão antiga na própria configuração do ChatGPT se não for mais necessária. Se o dispositivo antigo não for mais confiável ou suspeitar de exposição, peça ao administrador para revogar sessões e revisar a allowlist do cliente. Não é necessário trocar a senha do usuário somente por conectar outra IA.

## Configuração conhecida do Codex

Para voltar a configurar o Codex, o repositório inclui um exemplo sem segredos em `deploy/mcp/codex.config.example.toml`. Ele usa o cliente `jbfd-codex`, callback local `http://127.0.0.1:5555/callback` e as ferramentas somente de leitura. Clientes de outras IAs terão seu próprio callback e precisam de cadastro separado; não copie cegamente esse callback.

## Erros comuns

| Sinal | O que costuma significar | Próximo passo |
| --- | --- | --- |
| `401` / login volta a pedir autorização | Token ausente, expirado ou inválido | Refazer login OAuth na nova IA e conferir hora do computador |
| `403` | Usuário, client ID, escopo ou audience não autorizado | Administrador revisa `MCP_ALLOWED_SUBJECTS`, `MCP_ALLOWED_CLIENTS`, `jbfd:read` e resource |
| `404` | URL incorreta ou cliente tentando outro transporte/caminho | Usar exatamente `/mcp` e transporte Streamable HTTP |
| Snapshot antigo/indisponível | Problema do coletor ou snapshot, não do login | Conferir `stale` e solicitar verificação operacional da VPS |
| “Dynamic Client Registration required” | O cliente quer se registrar sem cadastro prévio | Solicitar ao fornecedor uma opção de client ID pré-registrado; a JBFD não aceita DCR aberta |

Não envie capturas de tela com tokens, URL contendo parâmetros de autorização, códigos de login, QR de sessão ou dados pessoais. Para suporte, compartilhe apenas a mensagem de erro sem credenciais e o nome do provedor/cliente.

## Mensagem inicial para a IA nova

Depois da conexão, você pode enviar:

> Você está conectado ao MCP somente de leitura da JobForged. Use `jbfd_status` para consultar Live/Test e `jbfd_diagnostics` para contagens aproximadas de erros/avisos. Os dados são snapshots: verifique `collectedAt`, `ageSeconds` e `stale` antes de afirmar que o estado é atual. O MCP não tem acesso para editar código, dados, segredos ou publicar versões.

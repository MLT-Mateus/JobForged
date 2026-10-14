# Brevo transacional — fase Test

## O que esta fase habilita

- O cadastro empresarial freemium envia o modelo `company-welcome` após o Supabase criar uma sessão autenticada.
- O HTML vem do catálogo do Design System, usa a fonte JobForged e aceita tema `dark` do cookie `jobforged-theme`; sem preferência, usa tema claro.
- O remetente está fixado em `JobForged <suporte@jobforged.com>`.
- Falha ou ausência da Brevo não invalida o cadastro. O servidor registra apenas resultado/código HTTP, nunca destinatário, corpo da mensagem ou chave.
- A chave da API só é lida pelo servidor em `BREVO_API_KEY`. A chave MCP não é necessária para envio.

As notificações de candidatura ainda dependem dos fluxos de vagas/candidaturas. Confirmação e recuperação de senha são fluxos do Supabase Auth e usam SMTP Brevo, separado da API transacional. A chave `BREVO_API_KEY` não é credencial SMTP. O fluxo de recuperação está descrito em [AUTH-RECUPERACAO.md](AUTH-RECUPERACAO.md).

## GitHub e aplicação em Test

O secret `BREVO_API_KEY` deve existir no Environment `jbfd-test`. O workflow de Test valida que o gateway possui o protocolo seguro `brevo-test-protocol-v1` antes de publicar e envia a chave exclusivamente pela entrada padrão SSH. O gateway grava/substitui somente `BREVO_API_KEY` em `/opt/jbfd/test/.env` com permissão `600`; o Compose fornece o valor ao container da aplicação. A chave não é argumento de processo, artefato, log ou arquivo do repositório.

O gateway Test instalado na VPS precisa ser atualizado uma vez com os arquivos desta branch:

- `scripts/jbfd-deploy-gateway-test.sh`
- `scripts/jbfd-deploy-test-root.sh`
- `scripts/jbfd-supabase-smtp-test-root.sh`

Essa instalação requer uma sessão administrativa na VPS, pois o usuário SSH de deploy não pode alterar o gateway/root helper. O `sudoers` restrito deve permitir tanto `/opt/jbfd/bin/jbfd-deploy-test-root.sh` quanto `/opt/jbfd/bin/jbfd-supabase-smtp-test-root.sh`, sem argumentos. Até o gateway atualizado responder a `probe brevo test`, o deploy interrompe antes de substituir a imagem Test. A etapa SMTP do deploy de `develop` exige que o mesmo gateway responda a `probe smtp test`. Não use a API de atualização de Docker Compose para instalar os scripts: ela recria o projeto e não substitui com segurança os arquivos root-owned.

Para o Supabase Auth, configure os secrets `BREVO_SMTP_USER` (Login SMTP mostrado pela Brevo) e `BREVO_SMTP_KEY` no Environment `jbfd-test`. A validação aceita as chaves SMTP padrão e curtas da Brevo (mínimo de 15 caracteres imprimíveis); não use uma API key nesse campo. No próximo deploy ou reprocessamento de `develop`, quando o gateway seguro estiver instalado, o workflow grava as variáveis SMTP apenas em `/opt/jbfd/supabase/.env` com modo `600`, valida o Compose sem imprimir os valores e recria somente o serviço `auth` de Test. Se os secrets não estiverem completos ou o gateway ainda não suportar SMTP, a etapa informa que foi adiada. Se os valores não mudaram, o Auth não é reiniciado. A chave SMTP nunca é enviada ao container do app nem gravada em logs/artefatos.

Após aprovação de Test, cadastre `BREVO_API_KEY`, `BREVO_SMTP_USER` e `BREVO_SMTP_KEY` no Environment `jbfd-live`. Os secrets são separados por ambiente, embora possam receber os mesmos valores da conta Brevo. O workflow protegido de promoção exige os três, verifica o protocolo Live e os transmite por stdin SSH ao helper root-owned. O helper grava `BREVO_API_KEY` em `/opt/jbfd/live/.env` e as credenciais SMTP em `/opt/jbfd/supabase-live/.env`, ambos root-only com modo `600`; valida o Compose e atualiza somente o app e o Auth Live que precisarem de reinício. Ele nunca copia `.env`, chaves Supabase, usuários ou dados entre ambientes. A configuração só acontece no workflow Live após aprovação do Environment `jbfd-live` e validação do SHA ativo em Test.

Para instalar o protocolo seguro Live uma vez na VPS, siga [DEPLOY-LIVE-SETUP.md](DEPLOY-LIVE-SETUP.md). Se o gateway não responder a `probe brevo live` com `jbfd-brevo-live-protocol-v1`, o workflow aborta antes de alterar a configuração ou publicar a imagem.

## Teste controlado

Depois de atualizar o gateway, integrar a branch em `develop` e o deploy Test terminar, faça um cadastro freemium novo usando um dos endereços autorizados para teste. Confirme a chegada e o conteúdo do e-mail e verifique apenas o estado HTTP/health do aplicativo. O cadastro não deve falhar se a Brevo estiver indisponível.

Para confirmar autenticação por e-mail no Supabase, configure SMTP de Test separadamente e teste o template `auth-confirmation`. Isso ainda não habilita recuperação nem reenvio.

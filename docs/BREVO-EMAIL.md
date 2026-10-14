# Brevo transacional — fase Test

## O que esta fase habilita

- O cadastro empresarial freemium envia o modelo `company-welcome` após o Supabase criar uma sessão autenticada.
- O HTML vem do catálogo do Design System, usa a fonte JobForged e aceita tema `dark` do cookie `jobforged-theme`; sem preferência, usa tema claro.
- O remetente está fixado em `JobForged <suporte@jobforged.com>`.
- Falha ou ausência da Brevo não invalida o cadastro. O servidor registra apenas resultado/código HTTP, nunca destinatário, corpo da mensagem ou chave.
- A chave da API só é lida pelo servidor em `BREVO_API_KEY`. A chave MCP não é necessária para envio.

As notificações de candidatura ainda dependem dos fluxos de vagas/candidaturas. Confirmação de conta, recuperação de senha e reenvio de e-mail do Supabase também continuam fora desta fase: essas mensagens usam SMTP do Supabase, que exige configuração separada e credencial SMTP da Brevo. A chave da API não deve ser tratada como credencial SMTP.

## GitHub e aplicação em Test

O secret `BREVO_API_KEY` deve existir no Environment `jbfd-test`. O workflow de Test valida que o gateway possui o protocolo seguro `brevo-test-protocol-v1` antes de publicar e envia a chave exclusivamente pela entrada padrão SSH. O gateway grava/substitui somente `BREVO_API_KEY` em `/opt/jbfd/test/.env` com permissão `600`; o Compose fornece o valor ao container da aplicação. A chave não é argumento de processo, artefato, log ou arquivo do repositório.

O gateway Test instalado na VPS precisa ser atualizado uma vez com os arquivos desta branch:

- `scripts/jbfd-deploy-gateway-test.sh`
- `scripts/jbfd-deploy-test-root.sh`

Essa instalação requer uma sessão administrativa na VPS, pois o usuário SSH de deploy não pode alterar o gateway/root helper. Até a versão nova responder ao comando de verificação `probe brevo test`, o workflow interrompe antes de substituir a imagem Test. Não use a API de atualização de Docker Compose para esse passo: ela recria o projeto e não substitui com segurança os arquivos root-owned do gateway.

O secret não é copiado para Live. Após aprovação de Test e antes de promover uma versão que envie e-mails, crie `BREVO_API_KEY` também no Environment `jbfd-live` e aplique o mesmo mecanismo de configuração, sem copiar `.env` ou dados entre ambientes.

## Teste controlado

Depois de atualizar o gateway, integrar a branch em `develop` e o deploy Test terminar, faça um cadastro freemium novo usando um dos endereços autorizados para teste. Confirme a chegada e o conteúdo do e-mail e verifique apenas o estado HTTP/health do aplicativo. O cadastro não deve falhar se a Brevo estiver indisponível.

Para confirmar autenticação por e-mail no Supabase, configure SMTP de Test separadamente e teste o template `auth-confirmation`. Isso ainda não habilita recuperação nem reenvio.

# Recuperação de senha JobForged

## Fluxo implementado

1. A tela `/recuperar-senha` envia o endereço à rota same-origin `/api/auth/recover`.
2. O servidor usa somente a chave pública da Supabase e chama `auth/v1/recover`, com redirect fixo para o domínio do ambiente. A resposta é neutra para não revelar se a conta existe; o Supabase aplica seus limites de envio.
3. O Supabase Auth envia o modelo `password-recovery` por SMTP. O modelo é servido pelo próprio app em `/api/auth/email-templates/password-recovery`, usa tema claro e as fontes Montserrat (títulos) e Open Sans (texto), com fallback seguro.
4. O link contém o hash de uso único. A página não consome o hash ao carregar: a pessoa precisa clicar em **Validar link e continuar**, evitando que a pré-visualização automática do e-mail consuma a recuperação.
5. O servidor valida o hash no Supabase, grava access/refresh tokens em cookies HttpOnly e emite um cookie de recuperação temporário, também HttpOnly.
6. A nova senha é validada no servidor e atualizada no Supabase Auth. Após o sucesso, a sessão de recuperação e os refresh tokens anteriores são revogados; a pessoa entra novamente com a nova senha.

Nenhuma `SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY` é adicionada ao app. A recuperação usa o fluxo público do Auth e credenciais do usuário, preservando as políticas de segurança aprovadas.

## Configuração SMTP Brevo em Test

A API key já usada pelo app não autentica o relay SMTP. A Brevo exige o login SMTP da conta e uma **SMTP key** separada. A documentação oficial confirma essa separação: [SMTP relay da Brevo](https://developers.brevo.com/docs/smtp-integration).

O secret `BREVO_SMTP_KEY` já deve estar no Environment `jbfd-test`. Adicione também `BREVO_SMTP_USER` com o **Login SMTP** exibido em Brevo → SMTP & API → SMTP. Não use o e-mail da conta Brevo por suposição: use o identificador apresentado como Login SMTP. Os dois valores ficam no GitHub Environment, nunca no chat.

Depois que o gateway root-owned de Test estiver atualizado, o workflow existente de deploy em `develop` encaminha os secrets por SSH protegido, grava apenas a configuração SMTP no `.env` root-only `/opt/jbfd/supabase/.env`, valida o Compose sem exibir a configuração e recria somente o serviço `auth`. Se os dois secrets ainda não existirem ou o gateway não suportar o protocolo SMTP, a etapa é adiada sem alterar o Supabase. Se a configuração já estiver igual, o Auth não é reiniciado.

Os valores aplicados no `.env` são:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<login SMTP da Brevo>
SMTP_PASS=<SMTP key da Brevo>
SMTP_ADMIN_EMAIL=suporte@jobforged.com
SMTP_SENDER_NAME=JobForged
```

O `docker-compose.override.yml` deste repositório aponta `GOTRUE_MAILER_TEMPLATES_RECOVERY` para o modelo do domínio Test e define o assunto aprovado. O helper grava essa configuração em `/opt/jbfd/supabase/docker-compose.jbfd-email-template.override.yml`, sem substituir o override de rotas da stack; valida o Compose com `config --quiet` e recria apenas o serviço `auth` do stack Test. A lista `GOTRUE_URI_ALLOW_LIST` já deve aceitar o domínio Test; o `GOTRUE_SITE_URL` confirmado é `https://test.jobforged.com`. Não imprima `.env` nem a saída completa de `docker compose config`.

O remetente deve continuar `suporte@jobforged.com`, já verificado na Brevo. Test e Live podem usar a mesma conta SMTP, desde que os valores sejam cadastrados separadamente em cada GitHub Environment e provisionados independentemente em cada Supabase. Nunca copie `.env` entre ambientes. Live não é configurado por este workflow e só deve ser habilitado após aprovação de Test.

## Live

O override versionado do Live aponta para `https://jobforged.com/api/auth/email-templates/password-recovery`. Após a validação em Test e a aprovação de Live, o workflow protegido transmite `BREVO_SMTP_USER` e `BREVO_SMTP_KEY` ao gateway seguro. Ele grava SMTP somente em `/opt/jbfd/supabase-live/.env`, valida o Compose sem imprimir valores e recria somente o serviço `auth` Live se a configuração mudar. As credenciais devem estar cadastradas separadamente no Environment `jbfd-live`; nunca copie o `.env` de Test.

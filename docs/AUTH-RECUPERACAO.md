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

No `.env` root-only do stack Test `/opt/jbfd/supabase/.env`, defina estas variáveis sem colocá-las no repositório:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<login SMTP exibido pela Brevo>
SMTP_PASS=<SMTP key exclusiva de Test>
SMTP_ADMIN_EMAIL=suporte@jobforged.com
SMTP_SENDER_NAME=JobForged
```

O `docker-compose.override.yml` deste repositório aponta `GOTRUE_MAILER_TEMPLATES_RECOVERY` para o modelo do domínio Test. A lista `GOTRUE_URI_ALLOW_LIST` já deve aceitar o domínio Test; o `GOTRUE_SITE_URL` confirmado é `https://test.jobforged.com`. Depois de cadastrar os valores, valide o compose com `config --quiet` e recrie apenas o serviço `auth` do stack Test. Não imprima `.env` nem a saída completa de `docker compose config`.

O remetente deve continuar `suporte@jobforged.com`, já verificado na Brevo. Use uma SMTP key exclusiva para Test; a chave Live deverá ser provisionada separadamente após a aprovação de Test, sem copiar `.env` ou configuração secreta entre os ambientes.

## Live

O override versionado do Live aponta para `https://jobforged.com/api/auth/email-templates/password-recovery`. Não configure nem reinicie Live durante a validação desta branch. Após aprovação, configure credencial SMTP separada no `/opt/jbfd/supabase-live/.env`, valide o template no mesmo SHA aprovado em Test e siga o fluxo protegido de promoção.

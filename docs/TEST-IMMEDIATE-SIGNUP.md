# Cadastro imediato em Test

Decisão de 04/11/2026: Test não exige confirmação da caixa postal. GoTrue auto-confirma novos cadastros válidos e emite sessão; BFF instala cookies HttpOnly/SameSite, limpa autorização de recuperação e cliente abre o painel sem novo login. Candidato também recebe a sessão no modal. Live mantém confirmação ativa e a configuração própria.

Não se deve remover `email_confirmed_at` das políticas de banco: Test usa o estado emitido pelo Auth, sem relaxar RLS, MFA, senha, vínculo ou suspensão. Sem confirmação de caixa postal, o e-mail em Test não comprova propriedade; não usar identidades de Test como autorização de Live.

A configuração versionada é o override Supabase Test e helper SMTP Test. Verificação de deploy exige autoconfirm=true somente em Test; Live exige false. Não modificar credenciais ou dados de Live. Cadastros duplicados não devem ser considerados sucesso autenticado.

E-mails do catálogo compartilhado, convites empresariais e comunicação em texto têm rodapé Enviado por JobForged; em Test recebem [TESTE]. Recuperação continua sendo por link temporário, identidade/sessão e uso único. Links antigos e suas credenciais não devem ser registrados em evidência pública.

Cadastro empresarial usa cartão único central, componentes/validações já aprovados e responsividade existente. Anexo de alinhamento citado no pedido não estava disponível; não atribuir correção a outra página sem inspeção.

Validação: suite nativa isolada chama signup real sem SMTP válido e exige access/refresh, contexto empresarial, rejeição de duplicado e senha errada. Mantém testes existentes de recuperação/MFA/isolações. CI do app valida cookies e política de ambientes. Nenhuma mensagem externa é enviada para produzir evidências.

A reconciliação inclui cadastro empresarial legado válido anterior aos nonces: proprietário ativo, e-mail igual ao vínculo, CNPJ válido e aceite registrado na empresa ativa. Exclui administradores de plataforma, contas banidas/excluídas, candidatos e vínculos suspensos. Não exige intenção efêmera, pois ela não existia nos cadastros antigos e expira nos novos. Executada pela API administrativa nativa apenas na VPS, com auditoria, sem emitir mensagens ou mudar senha.

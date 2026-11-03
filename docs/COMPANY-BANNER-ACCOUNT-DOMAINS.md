# Imagem, conta e domínio empresarial — Test

## Imagens

Capa `backgrounds.coverImage`: foto de apresentação3:2, inclusive no celular. Banner `portal.coverImage`: campo já validado pelo banco, utilizado somente no Panorama em desktop. O editor exibe esse upload apenas no template que o utiliza; trocar template não apaga nenhum arquivo. Campos vazios usam dois assets locais persistentes. Banner padrão2172×724 (3:1), sem crop ou barras internas; upload recomendado2400×800, tolerância2,85–3,15 na API. Imagem principal permanece inteira; extensão CSS estática só compensa proporções diferentes, sem timers/canvas ou processamento periódico. Em telas estreitas imagem/texto são empilhados. A migration0037 expõe apenas o banner atualmente utilizado; não reescreve históricos ou escolhas empresariais.

## Conta e currículo

NotificationTrigger compartilhado mostra primeiro nome+Notificações, badge e rótulo acessível; celular mantém sino acessível. Drawer mostra nome/e-mail e sessão conectada, alertas e perfil. Logout com seção própria e botão secundário. Candidato pode enviar/atualizar/baixar PDF privado após confirmar e-mail e entrar. O cadastro informa essa etapa; não há upload anônimo nem exigência retroativa sobre contas existentes. Currículo demonstrativo aparece somente no exemplo mock do Design System. Não se presume que um usuário real já enviou arquivo.

Bucket candidate-resumes privado, objetos imutáveis com reserva vinculada à sessão/identidade. SQL/RLS negam empresa/admin/anon/outro candidato; leitura corrente apenas do titular. Limites técnicos:5MB por PDF,5 reservas/hora e20 arquivos/versões por candidato (inclui órfãos existentes); quota não substitui a quota empresarial de imagens. Substituição preserva versão antiga e usa versão esperada do perfil. Expirados sem objeto deixam de ocupar reserva; objetos/histórico não são removidos automaticamente. PDF simples sem ações/anexos/senha reconhecíveis; não é varredura antivírus. Download privado no-store, attachment, nosniff e sandbox. Arquivo não é publicado nem enviado a empresas/candidaturas. Backup existente cobre todo Storage, incluindo o novo bucket.

## Domínio próprio

Não é iframe ou redirecionamento mascarado. Cada empresa pode solicitar um hostname externo; owners/admins editam, membros consultam e candidato/backoffice não editam. Domínio não é salvo no JSON de identidade. company_domains isolada, RPC explícita e auditoria. Registro cria prova aleatória, nunca aceita ativação enviada pelo cliente. A aplicação não contém Docker socket ou credencial global.

TXT `_jobforged.<hostname>` com `jobforged-verification=<prova>`; A187.77.229.27 ou CNAME para o host do ambiente, sem proxy/AAAA divergente. Verificador operacional exclusivo Test a cada5min confere DNS, atualiza checked_at e cria apenas um pequeno container de labels usando a imagem aprovada do app, sem volumes/segredos. Traefik Docker existente emite HTTPS via Let's Encrypt, sem reiniciar Traefik ou alterar routers Live. APIs passam pelo gateway Test. Verificação HTTPS usa conexão fixa ao IP autorizado com SNI/certificado normal; nenhum HTTP arbitrário para alvos fornecidos pelo cliente. Dados DNS não são logados. Registro pendente expira após7dias; última prova com mais20min é negada; desconectar bloqueia imediatamente no app e retira rota no próximo ciclo. Falha de prova suspende roteamento, preserva registro. Até100 domínios por reconciliador é limite técnico de labels.

Host validado reescreve raiz para o slug atual da empresa; backoffice, painel, outra empresa e APIs fora da lista recebem404. Sessões são host-only, sem copiar cookies entre domínios. Login/recuperação/aceite continuam com Auth existente; não há SSO entre hosts. Test permanece noindex. Modelo suporta configuração futura em Live, mas instalador é somente Test e Live requer aprovação própria.

Dependência concreta: é necessário domínio controlado e seus TXT/A/CNAME. Sem isso não é possível comprovar DNS público/emitir certificado de cliente; testes com mocks não comprovam esse resultado. Nenhum domínio é comprado nem DNS de terceiros alterado por este trabalho.

## Operação

Após CI/migrations/deploy de Test: instalar script versionado em `/opt/jbfd/bin/reconcile-test-domains.py` com usuário operador root e timer systemd dedicado a cada5min. Executar `python3 /opt/jbfd/bin/reconcile-test-domains.py --apply`. Rollback: desativar timer, remover somente container rotulado jbfd.domain.environment=test; app anterior permanece compatível com novas tabelas. Nunca desativar o Traefik compartilhado.

## Aceitação

CI: mocks BFF para origem/identidade/versão/arquivo; SQL real para RLS/RPC/isolamento/projeção/host expirado; Auth+Storage reais em engine isolado para reserva/upload/commit/download e negação empresarial/anon; worker DNS/TLS unitário. Aplicação em Test exige backup+restauração isolada/cópia cifrada antes das migrations. Registrar SHA/healthchecks e limites de validação autenticada na entrega.

Referências operacionais: [Traefik TLS](https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/overview/) e [Let's Encrypt HTTP-01/porta80](https://letsencrypt.org/docs/allow-port-80/). O resolvedor ACME existente foi inspecionado por leitura; não foi reconfigurado.

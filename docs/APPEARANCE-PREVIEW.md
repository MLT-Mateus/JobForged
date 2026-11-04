# Personalização e página pública empresarial

Decisão atual do produto (29/10/2026): cada empresa ativa tem `/<slug>`; salvar aplica diretamente à página pública e à identidade empresarial. Não há publicação separada nem rascunho persistido. Os campos locais continuam editáveis antes de salvar, com aviso de saída e descarte. Domínios personalizados seguem futuros.

## Fluxo e composição

- Página, Identidade e Endereço preservam os campos existentes. Um botão Salvar alterações no topo, link Abrir página da empresa, histórico, restauração e padrões.
- Restauração e padrões carregam o editor; somente Salvar altera a versão pública. Não apagam o histórico. Restaurar padrão permanece desabilitado quando a configuração efetiva já é padrão.
- A prévia embutida demonstra os campos atuais, com dispositivos e vagas mock; não envia formulários nem cria contas. O endereço antigo `/app/personalizacao/previa` é apenas uma ponte autenticada para `/<slug>`, removendo fragmentos antigos. Não representa uma segunda versão.
- Navegação interna usa IDs estáveis e rolagem sem acrescentar fragmentos à URL. Panorama tem cartão compacto à direita e imagem de fundo ampla. Editor estreito empilha Rich Text; rótulos de menus/links usam TextField, nome obrigatório e endereço opcional.
- ThemeSelector e useThemePreference são os mesmos da plataforma. A marca é uma imagem, sem nome duplicado ao lado. O rodapé usa SiteFooter da LP.
- Padrão contém imagem ilustrativa local, banner explicitamente mock e links reais da plataforma. Contatos empresariais não são inventados. Arquivos próprios substituem os padrões sem exclusão de referências antigas. Valores existentes não são sobrescritos por exemplos.

## Persistência e segurança

Migration0033 substitui as operações de branding por gravação pública atômica com histórico, auditoria, papel empresarial e versão esperada. Mantém colunas e assinaturas legadas para compatibilidade; operações save_public/publish/reset_public/restore_public gravam a mesma configuração corrente. Discard é local/no-op no contrato legado. Unpublish é recusado. Configurações salvas anteriormente são adotadas mantendo histórico e autor. Empresas sem configuração mostram o padrão público, usando apenas nome/slug na projeção inicial.

Controle de concorrência de aplicação usa PT409: evita que o PostgREST trate um conflito previsível como falha SQL serializável e repita a chamada. APIs aceitam também 40001 por compatibilidade. Suspensão continua bloqueando página e imagens. Arquivos públicos são apenas os referenciados na projeção explícita; bucket privado, nomes originais, histórico, autores e fundos internos permanecem protegidos. Nenhum service_role no aplicativo.

## Conta de candidato no cabeçalho

Migration0034 acrescenta candidate_accounts sem vínculo empresarial. Cadastro mínimo: nome (3–120), e-mail (até254), senha da política compartilhada, confirmação e aceite dos documentos vigentes. Origem é a empresa ativa daquele slug; não é permissão para seu painel. Intenção de cadastro é temporária (15min), de uso único, vinculada ao e-mail e à empresa, com limites duráveis (3/e-mail/h,100/empresa/h) e gateway. API Auth direta sem intenção é recusada para account_type candidate. Metadados não conferem papéis; nonces e campos de privilégio são removidos.

Após confirmação de e-mail, a mesma autenticação HttpOnly permite entrar no menu da página. Alertas usa NotificationPanel; Conta permite alterar o próprio nome com versão esperada, recuperar senha e sair. Identidade inativa, sessão revogada e usuário banido/excluído não obtêm os dados. Tabelas não têm SELECT nem escrita direta para anon/authenticated. RPCs expõem somente os próprios campos/alertas. Não existe painel separado, currículo, candidatura real ou criação de vagas nesta entrega.

Contas empresariais/administrativas existentes podem consultar os próprios alertas no mesmo menu. mark_my_notification marca somente entrega própria elegível; não usa o privilégio administrativo de criar/disparar campanhas. Operações administrativas continuam exigindo MFA recente. Comunicação interna ganha público Candidatos; filtro empresarial usa a origem do cadastro, sem incluir visitantes ou outras empresas. Nenhuma campanha é disparada pela implementação.

## Verificação

- SQL isolado: autorização, projeção, arquivos, suspensão, histórico, versões, campos e isolamento.
- Provedores reais isolados: Auth, login, intenção, não promoção de candidato a membro/admin, perfil concorrente, alertas próprios, inativação e revogação. Sem SMTP externo.
- BFF com provedor simulado: origem, campos, autorização, conflitos e contratos explícitos.
- DS Widgets demonstra o mesmo menu em mock sem chamadas de autenticação.
- Resultados do CI, deploy, backup e limites da validação visual são registrados no relatório da entrega. Live não é alterado.

## Conferência responsiva final

O painel lateral compartilhado mede a largura percentual disponível, sem incluir a faixa reservada à barra de rolagem. Em viewport390, a área útil380 recebe painel380 com esquerda0 (antes:390 e esquerda−10). Panorama usa cartão480, título até40 e grupo flex de ações; na fixture desktop o cartão passou a385px de altura, com foto livre à esquerda. No celular os controles quebram em linhas dentro do cartão, sem rolagem horizontal. Evidências locais são identificadas como mock; a fixture visual temporária não integra o aplicativo publicado.

Migration0035 recusa save/reset/restore de editores antigos com conflito explícito, para que uma aba ainda intitulada Salvar rascunho não publique silenciosamente. O fluxo atual envia save ao contrato de portal, que aplica save_public; Publish explícito legado permanece compatível. Colunas/assinaturas são preservadas, mas um rollback para editor antigo requer manutenção ou orientação de recarga: não oferece rascunhos privados nem deve prometer esse comportamento.

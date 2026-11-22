# Implementação da auditoria UX/UI — 21/11/2026

Referência: [auditoria integral](UX-AUDIT-2026-11-21.md). PR 220, destino Test. Live exige aprovação separada.

## Como interpretar

Este registro cobre os 211 identificadores da auditoria. “Implementado” significa que existe alteração correspondente no código/contrato; não significa que todos os cruzamentos possíveis foram exercitados manualmente. “Revisado existente” registra proposta avaliada ou comportamento já adequado. As evidências e limites abaixo diferenciam inspeção visual, teste automatizado e inspeção de fonte.

Home e Personalização preservam a arquitetura aprovada. Correções compartilhadas de legibilidade, navegação, integridade da publicação e feedback não são uma substituição desses layouts.

## Biblioteca compartilhada

Fontes: `app/components/ui`, `app/components/ui/ui.css`, `app/components/ui/WorkspaceShell.tsx`.

Validação: Typecheck, lint, testes de API/HTML; DS interativo com navegação, descarte, coleção e viewport.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| G01 | Utilitário sr-only único elimina status duplicado sem perder anúncio acessível. | Implementado |
| G02 | Ajuda ausente deixa de reservar linha vazia; campos compartilham densidade e alinhamento. | Implementado |
| G03 | Escala operacional e auxiliar elevada nos componentes e exemplos; fontes de marca preservadas. | Implementado |
| G04 | Menu móvel fechado usa inert/aria-hidden; abertura e retorno de foco permanecem no shell. | Implementado |
| G05 | Organização curta visível no topo móvel, com truncamento. | Implementado |
| G06 | Link Pular para o conteúdo e alvo estável no shell. | Implementado |
| G07 | PendingChanges, DraftBoundary e useDraftScope cobrem editores, diálogos, navegação e modos. | Implementado |
| G08 | FormActions estabelece secundária antes da principal, à direita, estado ocupado e perigo. | Implementado |
| G09 | CollectionViewSwitch compartilhado nas entidades; logs/calendários/gráficos são exceções documentadas. | Implementado |
| G10 | Blocos usam auto-fill com largura limitada e alinhamento inicial. | Implementado |
| G11 | Mutações têm busy/feedback semântico e preservação dos valores após falha. | Implementado |
| G12 | Taxonomia revisada em vagas, conta, configurações e BO; termos DNS mantidos onde úteis. | Implementado |
| G13 | Visão de coleção persistida por contexto; filtros de vagas, filiais, operações, equipe e BO na URL. | Implementado |
| G14 | DateField para datas; datetime-local documentado para data/hora com Brasília explícita. | Implementado |
| G15 | Dados ausentes não viram zero fictício; plano e métricas têm fallback. | Implementado |
| G16 | Ajuda progressiva, formulários curtos, seções e histórico separados; sem reformular Home aprovada. | Implementado |

## Home

Fontes: `app/components/admin/AdminModuleClient.tsx`, `app/components/admin/PlatformHomeBanners.tsx`, `supabase/migrations/0068_communication_destination_guard.sql`.

Validação: Estrutura aprovada preservada; leitura da conta Hitori e identificação dos dois assets demonstrativos; verificação após deploy.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| H01 | Dois banners demonstrativos identificados por título+asset serão desativados reversivelmente na migration; destino administrativo bloqueado para empresa. | Implementado |
| H02 | Métricas móveis em grade 2×2 preservam ordem e hierarquia. | Implementado |
| H03 | Configuração da empresa e próximos passos substituem explicação técnica de setup. | Implementado |
| H04 | Estado inicial orienta o recrutamento sem multiplicar CTAs de criação. | Implementado |
| H05 | Resumo limita vagas e oferece coleção completa. | Implementado |

## Dashboards

Fontes: `app/components/operations/OperationalModule.tsx`, `supabase/migrations/0057_company_operations.sql`.

Validação: Contrato de dados inspecionado: coleção autorizada completa, sem LIMIT silencioso. Testes operacionais e renderização.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| D01 | Vazios não geram categoria Nenhuma vaga como dado. | Implementado |
| D02 | Títulos e explicações redundantes reduzidos. | Implementado |
| D03 | Totais e últimos seis meses identificados explicitamente. | Implementado |
| D04 | Verificado que fonte atual não é truncada; UI não inventa agregação ou filtro inexistente. Escala de carga continua documentada. | Revisado existente |

## Coleção de vagas

Fontes: `app/components/jobs/JobsListClient.tsx`, `app/components/jobs/job-editor-model.ts`.

Validação: Testes job-editor, jobs-api, rendered-html e typecheck; vazio e filtros via UI após deploy.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| V01 | Vazio da coleção distinto de ausência causada por filtros. | Implementado |
| V02 | Lista/Blocos usa switch compartilhado. | Implementado |
| V03 | Metadados ausentes exibem ausência, sem valores fictícios. | Implementado |
| V04 | Lista e wizard compartilham os mesmos 13 critérios de completude. | Implementado |
| V05 | Troca de estado protegida por busy e feedback de resultado. | Implementado |
| V06 | Mantidos apenas CTA principal e ação contextual do vazio; proposta avaliada sem apagar continuidade útil. | Revisado existente |

## Criação e edição de vagas

Fontes: `app/components/jobs/JobWizardClient.tsx`, `app/components/jobs/JobDraftDescription.tsx`, `app/components/jobs/job-editor-model.ts`.

Validação: Testes de editor, assistente, API e build; prévia usa o mesmo renderizador público.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| J01 | Rótulos e cabeçalhos redundantes removidos. | Implementado |
| J02 | Salvar, Prévia e Assistência têm hierarquia e textos curtos. | Implementado |
| J03 | Completude explicita critérios, incluindo padrões; pendências navegam aos campos. | Implementado |
| J04 | Seleção de filial precede resumo do endereço; saída protegida. | Implementado |
| J05 | Atividades, requisitos, diferenciais e benefícios têm nomes coerentes. | Implementado |
| J06 | Campos curtos e editores longos dimensionados pelo conteúdo, densidade compartilhada. | Implementado |
| J07 | Competências comportamentais e Prazo de retorno substituem jargão. | Implementado |
| J08 | JobDraftDescription reutiliza JobDescription público com rascunho e filiais. | Implementado |
| J09 | Pendências associadas a campo, erro inline e revelação/foco da etapa. | Implementado |
| J10 | Detalhe, editar e prévia têm rotas e significados distintos. | Implementado |

## Detalhe e opções da vaga

Fontes: `app/components/jobs/JobDetailClient.tsx`, `app/components/operations/JobSettings.tsx`.

Validação: Testes jobs-api/company-operations-api e typecheck.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| JD01 | Metadados são compostos apenas quando presentes. | Implementado |
| JD02 | Resumo factual substitui falso histórico reconstruído. | Implementado |
| JD03 | Editar exige a mesma permissão do editor. | Implementado |
| JD04 | Avisos automáticos descreve o recurso existente. | Implementado |
| JD05 | Opções têm leitura, erro, carregamento, guard e ações compartilhadas. | Implementado |

## Filiais

Fontes: `app/components/admin/BranchesClient.tsx`, `app/components/admin/branches.css`.

Validação: Typecheck/lint; validação da abertura, edição local e descarte sem gravar dados reais.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| F01 | Filial é a entidade consistente em vazio, formulário e ação. | Implementado |
| F02 | Limpeza desabilitada sem filtros; resumo condicionado ao conteúdo. | Implementado |
| F03 | Identificação/endereço/fotos organizados; Cancelar e Salvar à direita. | Implementado |
| F04 | Falha parcial informa filial persistida e mantém somente arquivos pendentes para reenviar. | Implementado |
| F05 | Vagas vinculáveis têm pesquisa, quantidade e área de rolagem limitada. | Implementado |
| F06 | Página efetiva limitada ao conjunto filtrado. | Implementado |

## Candidaturas

Fontes: `app/components/operations/OperationalModule.tsx`.

Validação: Testes de API e SQL em fixtures; não foram tomadas decisões sobre candidatos reais.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| C01 | Vazio contextual oferece Ver vagas conforme acesso. | Implementado |
| C02 | Página efetiva ajustada após filtro/redução. | Implementado |
| C03 | Histórico de candidatura em lotes de cinco, com rótulos humanos. | Implementado |
| C04 | Agendamento recebe candidatura e vaga de origem. | Implementado |
| C05 | Drawer dividido em Dados, Processo e Notas e histórico. | Implementado |

## Agenda

Fontes: `app/components/operations/OperationalModule.tsx`, `supabase/migrations/0060_interview_candidate_context.sql`.

Validação: Testes de calendário, filtro temporal e contratos operacionais. Nenhum convite real enviado.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| AG01 | Alternância compacta mantém as duas opções na linha móvel. | Implementado |
| AG02 | Lista cronológica é padrão; calendário alternativo com rolagem localizada; datas DS. | Implementado |
| AG03 | Compromisso é termo consistente; candidatura opcional caracteriza entrevista. | Implementado |
| AG04 | Link começa vazio e endereço genérico não é aceito como reunião pronta. | Implementado |
| AG05 | Candidatura selecionável e persistida no compromisso com isolamento empresarial. | Implementado |
| AG06 | Lista paginada em dez itens e período identificado. | Implementado |
| AG07 | Leitura desabilita campos; edição usa guard e Cancelar. | Implementado |

## Financeiro

Fontes: `app/components/admin/AdminModuleClient.tsx`.

Validação: Inspeção de fonte e build; comparação do plano com contexto empresarial real.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| FIN01 | Plano real substitui plano/faturas/cartão fictícios. | Implementado |
| FIN02 | Fluxo transacional simulado removido do módulo operacional. | Implementado |
| FIN03 | Indisponibilidade de cobrança indicada na origem, sem documento fiscal fictício. | Implementado |

## Administradores

Fontes: `app/components/admin/CompanyManagementClient.tsx`, `app/components/admin/MemberIdentityForm.tsx`, `app/components/operations/MemberPermissions.tsx`.

Validação: API/SQL de autorização e sessões; comparação lista/blocos na UI da Hitori; não alterar papéis reais.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| ADM01 | Cartão de pessoa limitado pela grade de blocos e badges agrupados. | Implementado |
| ADM02 | Filtro usa largura útil e opções legíveis. | Implementado |
| ADM03 | Membro incluído nas funções reconhecidas e permitidas. | Implementado |
| ADM04 | Detalhe organiza identificação e acesso sem cartão por atributo. | Implementado |
| ADM05 | Próprio perfil oferece Minha conta. | Implementado |
| ADM06 | Convite usa rodapé comum e ordem Cancelar/Convidar. | Implementado |
| ADM07 | Bloquear/desbloquear coerente e confirmado; titular protegido. | Implementado |
| ADM08 | Permissões agrupadas por módulo e dependências explicadas. | Implementado |
| ADM09 | Permissões e identidade usam dirty, descarte e FormActions. | Implementado |
| ADM10 | Filtros compactos sem ajuda vazia e densidade móvel compartilhada. | Implementado |

## Configurações

Fontes: `app/components/admin/CompanyManagementClient.tsx`, `app/components/admin/CompanyActivity.tsx`, `supabase/migrations/0063_activity_and_alert_pagination.sql`.

Validação: API/SQL paginada e isolamento; navegação por abas e edição local.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| CFG01 | Dados normalizados determinam dirty; salvar/descarte e saída protegidos. | Implementado |
| CFG02 | Plano e situação contratual exibem conceitos diferentes. | Implementado |
| CFG03 | Dados, Preferências e Histórico em áreas distintas. | Implementado |
| CFG04 | Atualizar tem largura natural na barra de resumo. | Implementado |
| CFG05 | Eventos da mesma operação agrupados mantendo detalhes. | Implementado |
| CFG06 | Histórico tem autor/data/categoria e atalho ao histórico da página. | Implementado |
| CFG07 | Preferências não sobrescrevem rascunho ao atualizar; ações compartilhadas. | Implementado |

## Minha conta

Fontes: `app/components/admin/AccountManagementClient.tsx`, `app/components/admin/ProfilePhoto.tsx`.

Validação: Testes nativos de e-mail e login com contas descartáveis; inspeção Hitori sem mudar credenciais.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| MC01 | Resumo decorativo inicial removido. | Implementado |
| MC02 | Foto compacta no formulário aproxima os dados essenciais. | Implementado |
| MC03 | Upload de avatar tem prévia e ação legível. | Implementado |
| MC04 | Foto informa salvamento imediato; descarte refere-se aos campos do formulário. | Implementado |
| MC05 | Textos não dependem de cartão ao lado; labels de credenciais curtos. | Implementado |
| MC06 | Troca de modo de credencial confirma abandono e limpa segredos. | Implementado |
| MC07 | Segurança mostra resumo e somente o formulário ativo. | Implementado |

## Alertas

Fontes: `app/components/ui/NotificationPanel.tsx`, `app/components/admin/NotificationBell.tsx`, `supabase/migrations/0063_activity_and_alert_pagination.sql`.

Validação: SQL com 21 alertas e isolamento por destinatário; contrato candidato validado pelo teste nativo.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| N01 | hasNext calculado no servidor impede página final fantasma. | Implementado |
| N02 | Mensagens resumidas/expansíveis e filtro Somente não lidos. | Implementado |
| N03 | Nome acessível do destino inclui o assunto do aviso. | Implementado |

## Personalização: estrutura

Fontes: `app/components/personalization/PersonalizationClient.tsx`, `app/components/ui/Widgets.tsx`.

Validação: Estrutura aprovada mantida; DS guard e galeria de templates; revisão visual Test.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| PER01 | Um status visual de salvamento e anúncio assistivo oculto. | Implementado |
| PER02 | Acesso móvel Editor/Prévia e salvar sem quebrar cartão aprovado. | Implementado |
| PER03 | Descartar é local; padrão e versão são carregados para revisar antes de publicar. | Implementado |
| PER04 | Tratamento semântico de confirmação conforme consequência. | Implementado |
| PER05 | Seção desativada explica onde reativar e preserva conteúdo. | Implementado |

## Personalização: Elementos

Fontes: `app/components/personalization/PersonalizationClient.tsx`, `app/design-system/PortalValidationDemo.tsx`.

Validação: Cinco templates: 320/390/768/1280; textos extensos e quatro pares tipográficos em 390.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| EL01 | Template, seções e composição em ordem; filtros subordinados a Vagas. | Implementado |
| EL02 | Atalhos entre Elementos e Textos usam os mesmos nomes. | Implementado |
| EL03 | Orientação de imagem reduzida a formatos, tamanho e proporção; prévia preservada. | Implementado |
| EL04 | Galeria real dos cinco templates, conteúdo extremo e quatro larguras. | Implementado |

## Personalização: Textos

Fontes: `app/components/ui/ContentField.tsx`, `app/components/personalization/PersonalizationClient.tsx`, `app/components/personalization/PublicCompanyPortal.tsx`.

Validação: Testes branding-model/public-access-ui; galeria real de prévia.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| TX01 | ContentField usa input/textarea para textos simples e preserva rich text legado. | Implementado |
| TX02 | Título de apresentação e texto complementar substituem hero. | Implementado |
| TX03 | Validação impede publicar destinos internos inadequados e mantém URLs públicas legítimas. | Implementado |
| TX04 | Controle de tema tem uma fonte no editor. | Implementado |
| TX05 | PublicJobs recebe flags e textos do mesmo contrato da prévia. | Implementado |
| TX06 | Limites semânticos e quebra de conteúdo preservam textos completos. | Implementado |

## Personalização: Marca

Fontes: `app/components/personalization/BrandColorsEditor.tsx`, `app/components/personalization/CareerPortalPreview.tsx`, `app/components/SiteFooter.tsx`.

Validação: Testes de seis paletas, extremos, foreground, hover e semântica nos dois temas; quatro fontes × cinco templates.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| MAR01 | Orientação de cores curta e ajustes por grupo. | Implementado |
| MAR02 | Logo sem versão escura ganha superfície de apoio no cabeçalho e rodapé. | Implementado |
| MAR03 | Tokens compartilhados mantêm derivação contrastante; paletas e extremos testados. | Implementado |
| MAR04 | Quatro fontes mantidas e testadas nos cinco templates em 390 px. | Implementado |

## Endereço e publicação

Fontes: `app/components/personalization/CompanyDomainEditor.tsx`, `supabase/migrations/0062_page_publication_address_transaction.sql`, `scripts/security/reconcile-test-domains.py`.

Validação: SQL transacional: conflito, versão, slug, domínio pendente, desconexão e isolamento. Worker: DNS, TLS e guarda de versão.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| END01 | Slug participa do mesmo salvar/versionamento da página. | Implementado |
| END02 | Intenções de domínio/preparação/desconexão integram a publicação transacional. | Implementado |
| END03 | Desconectar exige confirmação e só aplica ao publicar. | Implementado |
| END04 | Carregando/erro/ativo/pendente/ausente são estados distintos. | Implementado |
| END05 | Resumo ativo primeiro e procedimento DNS progressivo. | Implementado |
| END06 | Atalho de prévia usa resolvedor público comum. | Implementado |

## Histórico da página

Fontes: `app/components/personalization/BrandingHistory.tsx`, `supabase/migrations/0061_branding_history_pagination.sql`.

Validação: SQL paginado/isolamento; comparação no mesmo painel, sem empilhar modais.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| HIS01 | Histórico servidor com dez versões por página. | Implementado |
| HIS02 | Somente versão publicada corrente recebe Atual. | Implementado |
| HIS03 | Lista e comparação usam o mesmo painel com retorno. | Implementado |
| HIS04 | Diff percorre configuração versionada completa com textos, cores, imagens e endereço. | Implementado |
| HIS05 | Revisar esta versão prepara rascunho; publicação é explícita e gera nova versão. | Implementado |

## Portal e vaga públicos

Fontes: `app/components/jobs/PublicJobs.tsx`, `app/components/jobs/JobDescription.tsx`, `app/components/jobs/PublicVacancy.tsx`, `app/[companySlug]/page.tsx`.

Validação: Testes de projeção pública, links, busca e branding; matriz visual de templates e inspeção do portal Test.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| P01 | Busca, filtros e vazio publicados respeitam configuração. | Implementado |
| P02 | Título e descrição públicos identificam a empresa. | Implementado |
| P03 | Lista/Blocos e busca normalizada por acentos. | Implementado |
| P04 | Resumo respeita palavras; múltiplas filiais têm síntese e detalhe. | Implementado |
| P05 | Links publicados para administração são suprimidos; editor exige destino público. Nenhum telefone/WhatsApp foi inventado ou substituído sem fonte. | Implementado |
| P06 | Página canônica de vaga e compatibilidade com hash antigo. | Implementado |
| P07 | Renderizador/projeção pública incluem campos destinados ao candidato; classificação descrita no relatório. | Implementado |
| P08 | Tema e marca herdados do portal no anúncio individual. | Implementado |
| P09 | Cabeçalho compacto da empresa, retorno e candidatura no contexto. | Implementado |

## Conta do candidato

Fontes: `app/components/personalization/PublicPortalAccount.tsx`, `app/components/personalization/CandidateCredentials.tsx`, `app/components/operations/MyApplications.tsx`.

Validação: Testes nativos com conta sintética: troca de e-mail, login novo/antigo, senha incorreta, conta/alertas/currículo.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| CA01 | Labels legais legíveis; ação principal alinhada à direita. | Implementado |
| CA02 | Modos preservam e-mail e protegem cadastro; segredos não persistidos. | Implementado |
| CA03 | Credenciais usam mesma linguagem e feedback do painel empresarial. | Implementado |
| CA04 | Candidato altera e-mail/senha imediatamente mediante senha atual no contrato próprio. | Implementado |
| CA05 | Perfil e credenciais têm guard; currículo informa persistência imediata. | Implementado |
| CA06 | Minhas candidaturas tem busca, etapa, paginação e Lista/Blocos. | Implementado |
| CA07 | Etapa legível e link canônico à vaga com situação real. | Implementado |
| CA08 | Retirada tem Cancelar e logout usa perigo. | Implementado |

## Candidatura pública

Fontes: `app/components/operations/ApplicationAction.tsx`.

Validação: Testes de API, autorização e renderização; nenhum envio para vaga real.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| AP01 | Login integrado retorna à mesma vaga sem ação atrás de modal. | Implementado |
| AP02 | Sessão ausente e erro de rede têm estados/continuidade distintos. | Implementado |
| AP03 | Arquivo salvo é separado do envio efetivo da candidatura. | Implementado |
| AP04 | Situação anterior é reconhecida sem prometer reenvio não suportado. | Implementado |

## Backoffice compartilhado

Fontes: `app/components/admin/BackofficeManagementClient.tsx`, `app/components/ui/WorkspaceShell.tsx`.

Validação: Build, APIs e SQL com plataforma/MFA; Hitori deve continuar recebendo 403. Inspeção visual autenticada como plataforma não presumida.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BO01 | Identidade fica no shell; cabeçalhos focam tarefa. | Implementado |
| BO02 | Filtros, resultados e vazio no mesmo contêiner. | Implementado |
| BO03 | Entidades usam alternância e paginação compartilhadas; auditoria mantém tabela. | Implementado |
| BO04 | Filtros aplicados juntos em Buscar, labels por entidade e URL compartilhável. | Implementado |
| BO05 | Escopo de rascunho protege editores e atualização; motivo mantido. | Implementado |
| BO06 | Placeholders finais seguem normalização do componente; exemplos em fonte não são tratados como bug visual sem evidência. | Revisado existente |

## Backoffice: visão geral

Fontes: `app/components/admin/BackofficeManagementClient.tsx`.

Validação: Projeção real, typecheck e testes backoffice-api/SQL.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BOV01 | Ausência de métrica é Indisponível, zero real preservado. | Implementado |
| BOV02 | Vocabulário de pessoas/empresas/convites e escopo explícito. | Implementado |
| BOV03 | Acompanhar agora usa contagens reais de convites e suspensão, com links filtrados. | Implementado |

## Backoffice: empresas

Fontes: `app/components/admin/BackofficeManagementClient.tsx`.

Validação: Typecheck e SQL/API administrativa com MFA.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BOE01 | Plano, documento e estado legíveis, ausência explícita. | Implementado |
| BOE02 | Coleção de empresas integrada com Lista/Blocos. | Implementado |
| BOE03 | Situação operacional e situação do plano separadas. | Implementado |

## Backoffice: detalhe empresarial

Fontes: `app/components/admin/BackofficeManagementClient.tsx`, `app/components/admin/CompanyDeletion.tsx`.

Validação: SQL/API administrativa e testes de exclusão isolados; nenhuma exclusão real.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BOD01 | Equipe resumida a dez e convites a 25, com acesso à coleção completa. | Implementado |
| BOD02 | Dados, equipe, plano e operações sensíveis têm grupos identificados. | Implementado |
| BOD03 | Exclusão em área própria, mantendo nome, motivo e MFA. | Implementado |

## Backoffice: usuários

Fontes: `app/components/admin/BackofficeManagementClient.tsx`, `supabase/migrations/0067_backoffice_read_context.sql`.

Validação: Projeção de dados e foto restrita a administrador/MFA, tests SQL.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BOU01 | Nome e empresa substituem IDs no conteúdo principal. | Implementado |
| BOU02 | CPF, telefone, foto leve e papel contextual com autorização administrativa existente. | Implementado |
| BOU03 | Alterar vínculo explica que não bloqueia a identidade global. | Implementado |

## Backoffice: convites

Fontes: `app/components/admin/BackofficeManagementClient.tsx`.

Validação: Typecheck, contrato de estados e testes de convite; sem envio real.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BOC01 | Convite apresenta data, validade, função, empresa e ações conforme estado. | Implementado |
| BOC02 | Formulário protegido e feedback não promete entrega de e-mail comprovada. | Implementado |
| BOC03 | Blocos mantêm destinatário, situação e prazo, com paginação. | Implementado |

## Backoffice: comunicações

Fontes: `app/components/admin/CommunicationsClient.tsx`, `supabase/migrations/0064_communication_management_pagination.sql`, `supabase/migrations/0068_communication_destination_guard.sql`.

Validação: SQL paginado, teste de dispatch bloqueado antes de criar destinatários; sem envio real.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| COM01 | Banners e Comunicados separados e paginados no servidor. | Implementado |
| COM02 | Matriz de canais corresponde ao suporte existente; cadastro do candidato não é negado. | Implementado |
| COM03 | Conteúdo, Imagens e Destino/exibição organizados. | Implementado |
| COM04 | Upload não equivale a publicação; rascunho protegido e feedback parcial claro. | Implementado |
| COM05 | Revisão de público/destino antes de enviar; servidor também revalida drafts antigos. | Implementado |
| COM06 | Verbos de envio/publicação substituem Confirmar genérico. | Implementado |

## Backoffice: configurações

Fontes: `app/components/admin/BackofficeManagementClient.tsx`.

Validação: Typecheck e APIs administrativas; motivo/MFA preservados.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BOS01 | Valores ausentes não exibem undefined. | Implementado |
| BOS02 | Suporte público primeiro, informações técnicas progressivas. | Implementado |
| BOS03 | Motivo, dirty e ações comuns preservados. | Implementado |

## Backoffice: auditoria

Fontes: `app/components/admin/BackofficeManagementClient.tsx`, `supabase/migrations/0067_backoffice_read_context.sql`.

Validação: SQL com filtros de autor/data/alvo e páginas limitadas.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BOA01 | Evento mostra autor, ação, empresa, motivo; JSON em detalhe técnico. | Implementado |
| BOA02 | Autor, datas e alvo no servidor, URL e paginação. | Implementado |
| BOA03 | Dicionário de ações e fallback legível mantêm código original no detalhe. | Implementado |

## Backoffice: segurança

Fontes: `app/components/admin/SecurityClient.tsx`.

Validação: Typecheck e testes de sessão/MFA existentes. Não se simulou relógio divergente na conta real.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| BSEC01 | Estado do MFA primeiro; solução de problemas recolhível. | Implementado |
| BSEC02 | Suporte usa destino configurado. | Implementado |
| BSEC03 | Sessão elevada separada de MFA cadastrado; ação aparece quando necessária. | Implementado |

## Backoffice: integrações

Fontes: `app/components/admin/IntegrationsClient.tsx`.

Validação: Typecheck, validação por linha e testes de API existentes. Nenhuma integração externa ativada.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| INT01 | Busca examina nomes e configurações reais. | Implementado |
| INT02 | Sem resultado apresenta vazio e limpar busca. | Implementado |
| INT03 | Coleção integrada, paginada e com alternância. | Implementado |
| INT04 | Editor com guard, Cancelar e preservação em erro. | Implementado |
| INT05 | URLs validadas por linha e erro de autorização/MFA acionável. | Implementado |

## Exclusão empresarial

Fontes: `app/components/admin/CompanyDeletion.tsx`, `supabase/migrations/0067_backoffice_read_context.sql`.

Validação: Testes nativos de isolamento/eliminação e SQL paginado em fixtures; nenhuma operação destrutiva real.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| DEL01 | Fila servidor paginada com empresa, solicitante e horários. | Implementado |
| DEL02 | Texto corresponde à cópia cifrada automática; não exige computador ligado. | Implementado |
| DEL03 | Cancelar antes da ação de perigo; confirmação nominal/MFA preservados. | Implementado |

## Autenticação empresarial

Fontes: `app/components/auth/AuthClient.tsx`, `app/components/auth/auth-validation.ts`.

Validação: Testes signup-session, contratos de documento e build. Backend atual aceita CNPJ numérico.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| AU01 | Contrato numérico existente verificado; filial agora usa a mesma máscara/validação. Alfanumérico não é anunciado como suportado pelo cadastro. | Implementado |
| AU02 | Cadastro agrupado em empresa/responsável, acesso e confirmação. | Implementado |
| AU03 | Resultado de confirmação/recuperação não é duplicado e não promete entrega. | Implementado |

## Convite empresarial

Fontes: `app/components/auth/CompanyInvitationClient.tsx`, `supabase/migrations/0069_invitation_recipient_context.sql`.

Validação: SQL: contexto somente para destinatário confirmado; testes nativos de aceite existentes.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| IV01 | Sessão identificada; contexto do convite é validado antes de permitir aceite. | Implementado |
| IV02 | Entrar/Criar conta são modos claros, com empresa/função após autenticar destinatário. | Implementado |
| IV03 | Convite inválido/expirado/revogado/aceito tem estado e continuidade. | Implementado |
| IV04 | Após aceite, orientação e link para completar perfil. | Implementado |

## Confirmação legada de e-mail

Fontes: `app/components/auth/ConfirmEmailClient.tsx`.

Validação: Testes de email/API e typecheck; fluxo novo imediato permanece independente.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| EM01 | Estados legados de confirmação têm resultado específico. | Implementado |
| EM02 | Resultado persistente evita toast duplicado. | Implementado |

## Estados gerais

Fontes: `app/components/system/SystemPage.tsx`, `app/status`.

Validação: Renderização, service-status e rotas Docker.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| ST01 | 403 distingue empresa de administração da plataforma. | Implementado |
| ST02 | Voltar ao espaço autorizado é prioridade; troca de conta é secundária. | Implementado |
| ST03 | Links contextuais sem recomendar backoffice a visitante. | Implementado |
| ST04 | Orientação decorativa genérica removida. | Implementado |
| ST05 | FAQ rotulado como Central de ajuda; suporte mantém resolvedor configurado. | Implementado |
| ST06 | Detalhes de atualização ficam recolhidos, horário e estado permanecem. | Implementado |

## Design System

Fontes: `app/design-system/OperationalPatternsDemo.tsx`, `app/design-system/PortalValidationDemo.tsx`, `app/components/ui`.

Validação: DS interativo: dirty, navegação, coleção 0/1/2/11, tamanhos, tipografia e camadas; contrastes automatizados.

| ID | Resultado implementado/decisão | Estado |
|---|---|---|
| DS01 | Demonstração viva de edição, guarda de navegação e diálogo. | Implementado |
| DS02 | Demonstração 0/1/2/11 registros, busca, paginação e modos. | Implementado |
| DS03 | Escala legível compartilhada e demonstrações atualizadas. | Implementado |
| DS04 | Densidade/ajuda/erro demonstrados nos componentes reais. | Implementado |
| DS05 | FormActions demonstrado e consumido nos editores operacionais. | Implementado |
| DS06 | Contrato diagnóstico/rascunho/publicação documentado e demonstrado. | Implementado |
| DS07 | Primitivo de camadas mantido; testes de borda/foco na galeria sem criar implementações por página. | Revisado existente |

## Classificação dos campos da vaga

- Públicos: título/área/modalidade/contratação/senioridade/localizações, descrição, atividades, requisitos, diferenciais, benefícios, escolaridade, certificações, idiomas, competências, ferramentas, liderança/equipe, metodologia/crescimento, etapas/entrevistas/teste técnico e prazo de retorno quando preenchidos. Salário respeita a opção de confidencialidade. Contatos somente os definidos para o anúncio.
- Internos: responsável de gestão, motivo de abertura, hierarquia/autonomia de gestão, etapa atual do editor, score/completude interna, permissões, notas de candidatura e dados pessoais de terceiros. Não são publicados para preencher espaço.
- O renderizador JobDescription é compartilhado pela prévia de rascunho e detalhe público. Formulários demonstrativos da Personalização permanecem exemplos identificados e não executam autenticação/candidatura.

## Exceções deliberadas

- Histórico de auditoria, linha do tempo, calendário, gráficos, opções de seletor e menu não ganham cartões de entidade artificiais.
- Data simples usa DateField; data/hora operacional usa controle nativo identificado com fuso Brasília.
- Foto/currículo/upload de banner podem persistir antes do formulário; a interface informa o efeito. Arquivo enviado não significa campanha publicada ou candidatura enviada.
- Endereço antigo continua ativo enquanto um substituto não tiver prova DNS e TLS válidos; somente a publicação registra intenção.
- CNPJ do cadastro tem contrato numérico de 14 dígitos no backend atual. Não foi feita migração de domínio documental para CNPJ alfanumérico nesta auditoria visual.
- Lista/Blocos é preferência de apresentação por rota/contexto, não dado cadastral. Filtros em URL não contêm credenciais.

## Evidências e limites de validação

- CI anterior a esta documentação: execução 44976402665 aprovada para código/build, SQL, Docker Test/Live e Auth/Storage nativos. Mudanças finais são submetidas novamente antes da integração.
- SQL usa dados sintéticos e rollback: publicação com domínio pendente, conflito otimista, slug, histórico, alerta paginado e isolamento. Novos testes cobrem bloqueio de campanha antiga e contexto de convite por destinatário.
- Worker: prova DNS exata, gateway Test, TLS obrigatório e guarda de versão antes da troca do endereço. Nenhuma alteração de DNS de cliente foi realizada.
- UI local: coleção móvel, confirmação ao sair de rascunho, retorno preservando edição e descarte; template Clássico/Equipe/Panorama/Foco nas vagas/Essencial em 320 e 768 claro, 1280 escuro; quatro fontes × cinco templates em 390 com conteúdo extenso. Sem overflow horizontal nos documentos internos das prévias; largura útil desconta a barra vertical.
- A galeria reproduz os cenários em Design System → Formulários → Validar templates e conteúdo. Não persiste configurações de cliente.
- Fonte e testes de contraste abrangem seis paletas, pares de texto/ação/hover/fundo e cores extremas; isso não substitui avaliação humana de fotografias arbitrárias enviadas por empresas.
- Acesso real Hitori é empresarial. Não se concede papel de plataforma para validar o BO. APIs e migrations administrativas são cobertas pelos testes com MFA; não se afirma inspeção manual autenticada de todas as telas BO no servidor.
- Não foram enviadas mensagens, convites ou candidaturas reais, nem alterados e-mail, senha, permissões ou domínios da Hitori.
- Links previamente cadastrados com destino interno inadequado são impedidos no editor e omitidos do portal; novos destinos comerciais/WhatsApp não foram inventados.
- Operações e Minhas candidaturas ainda recebem a coleção autorizada completa antes da paginação visual; não há truncagem silenciosa, mas o custo de transporte em volumes muito altos continua uma limitação de escala, distinta da altura da página corrigida.

## Checklist para revisão no Test

1. Abrir Home e confirmar hierarquia preservada, métricas compactas e ausência das duas peças de teste identificadas.
2. Comparar plano em Financeiro e Configurações; não há dívida/cartão demonstrativos.
3. Administradores: Lista/Blocos, filtro Membro, detalhes completos e próprio perfil.
4. Editar localmente filial/configuração/permissões; sair e escolher continuar ou descartar, sem salvar dados de teste na empresa real.
5. Criar rascunho de vaga sem publicar: pendências levam aos campos e Prévia corresponde ao detalhe público.
6. Personalização: quatro abas preservadas, salvar dentro do cartão de prévia, histórico paginado, versão atual e comparação completa.
7. Endereço: resumo ativo, alteração explícita e aplicação junto à versão. Testes que mudam DNS devem usar fixture isolada.
8. Em 390 px, navegar com teclado, verificar menu fechado, foco, botões e ausência de rolagem horizontal.
9. Backoffice com conta autorizada: coleções, filtros persistidos, contexto de pessoas, operações sensíveis e estado MFA.

## Publicação

A publicação final deve registrar SHA, execução de CI, execução de deploy, backup automático, migrations aplicadas, healthcheck e inspeção da interface. Não usar este documento como evidência de deploy antes do resultado efetivo do pipeline.

## Conferência autenticada após a publicação

O primeiro deploy foi confirmado em Test no SHA `6d375c6818cd42688b984f10e7365cfb32265d62`, pipeline `44977932125`, com backup cifrado automático e migrations verificadas. A conta Hitori confirmou Home sem os dois banners demonstrativos, Financeiro real, coleção de vagas, domínio ativo, histórico com 10 versões por página e comparação, além da proteção de rascunho na Personalização. Um rascunho vazio foi criado para exercitar o bloqueio de publicação e removido pelo fluxo de exclusão lógica; nenhuma vaga foi publicada nem candidatura enviada. A revisão revelou título vazio no detalhe/menu/confirmação: o complemento usa `jobDisplayTitle` compartilhado e ajusta o singular da contagem. O recibo local de publicação registra o SHA final e demais verificações.

A mesma conferência substituiu os dois filtros de data simples restantes na Agenda pelo DateField do DS, preservando limites inicial/final e reinício da paginação. Os campos de horário do compromisso continuam datetime-local com Brasília explícita, conforme a exceção documentada.

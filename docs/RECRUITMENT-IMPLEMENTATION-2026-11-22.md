# Vagas, assistente e Kanban — implementação e validação

Data: 22/11/2026. Estudo de origem: `ESTUDO-VAGAS-ASSISTENTE-KANBAN-2026-11-22.md`, no workspace JobForged. PR: https://github.com/MLT-Mateus/JobForged/pull/224. Destino autorizado: Test. Live não recebe esta implementação automaticamente.

## Resultado de produto

- Editor reduzido de cinco para três etapas: **Vaga → Conteúdo → Revisão**. A configuração do processo por vaga foi removida.
- Dez essenciais: cargo, área, contratação, modalidade, local/abrangência, jornada, quantidade, apresentação, atividades e requisitos ou declaração explícita sem exigência prévia.
- Complementos ficam recolhidos e não entram na contagem de essenciais: remuneração, acessibilidade, nível, formação, benefícios, cultura, equipe, idiomas, ferramentas, contatos e prazo. Um complemento preenchido com formato inválido pode ser corrigido ou removido.
- Rascunho vazio permitido; pendências visíveis e clicáveis antes de tentar publicar. Local remoto dispensa filial. Presencial/híbrido exige unidade ativa, cidade e UF; a publicação revalida no banco.
- Revisão separa dados essenciais de condições operacionais: portal público, confirmação humana e conversão de exemplo fictício em oportunidade real.
- Uma revisão salva não altera o anúncio publicado. A nova versão pública é gravada somente na publicação explícita. Currículo obrigatório e quantidade seguem a mesma versão.
- **Triagem → Entrevista → Aprovação → Contratação**, com quatro etapas universais. Não selecionado e desistência são desfechos, disponíveis em filtros; não acrescentam colunas.
- Quadro, lista e blocos, busca, filtro por vaga, contagens do servidor e paginação. O quadro carrega vinte cartões por coluna; novos lotes são solicitados por coluna. Em mobile, uma etapa é exibida por vez.
- Cada candidatura continua vinculada à sua vaga. Uma pessoa em duas vagas tem processos independentes. Cor categórica estável, título e código identificam a vaga sem depender só da cor.
- Mover por arraste ou botão usa a mesma confirmação. Aprovação/contratação, reprovação e retornos relevantes exigem permissão e confirmação/motivo. Conflitos não sobrescrevem decisões da equipe.
- Última movimentação pode ser revertida pela mesma operação validada. A reversão não restaura convites cancelados silenciosamente: um retorno à Entrevista pode exigir novo agendamento.
- Detalhe sob demanda com perfil, atividades, currículo privado da candidatura, anotações e histórico paginado. PDF tem alternativa de download. Anotação em conflito permanece no formulário e permite comparar com a versão da equipe.
- Movimentar não envia mensagem ao candidato. Entrar em Entrevista cria pendência sem duplicação; o envio de convite continua sendo uma ação explícita na Agenda.

## Assistente: comportamento e limites

O pedido atual, formulário efetivamente preenchido e proposta ainda não aplicada são contextos separados. Cada proposta traz intenção, objetivo, origem por campo e cobertura calculada pelo servidor. Aplicação é seletiva e tem reversão antes de salvar; edição manual posterior é protegida por comparação por campo.

Exemplo, mock e MOC completos geram conteúdo dos dez essenciais e complementos pertinentes. Dados inventados ficam marcados como exemplo, inclusive em aplicação parcial. O assistente não pode confirmar privacidade, alterar empresa, publicar, converter um exemplo em vaga real ou criar etapas. Pedidos delimitados preservam o restante do formulário. Conteúdo de anexos é referência, não instrução de acesso.

A validação aceita somente chaves/tipos autorizados e filiais do contexto. Há normalizações sem mudança de significado para números armazenados como texto e caracteres de quebra de linha em JSON. Um `example=false` redundante em vaga já real é descartado; limpar um exemplo existente continua proibido ao assistente.

Resposta com tipos inválidos recebe **uma única tentativa automática de correção**, limitada pelo mesmo contexto, validação e prazo total. Se continuar inválida, nada é aplicado e a mensagem pode ser reenviada. Não há garantia de resposta perfeita de um modelo probabilístico.

Prompt versionado: `docs/job-assistant-prompt-v2.md`. Workflow Test: `NTb1OmXykFRnRETw`. Workflow manual de avaliação: `lTDNeAyLCgU8ZWWo`, no projeto **Mateus Batista Santos**, sem gatilho público ou agenda. As avaliações usam exclusivamente casos sintéticos, sem candidaturas, currículo, envio de mensagens ou publicação de vagas.

Execuções reais de avaliação: 1779, 1780 e 1781. Na rodada 1780, uma proposta apresentou `careerPlan` booleano e `performanceReviews` textual; o contrato a rejeitou. A execução 1781 confirmou a correção em uma segunda tentativa. A evidência original inválida foi preservada no corpus para não esconder a falha. Sete cenários terminam aceitos pelo contrato, incluindo a correção documentada. Corpus: `tests/fixtures/recruitment-ai-v2.json`.

## Design System e páginas preservadas

Componentes existentes reutilizados: Panel, WorkspacePageHeader, campos, RichTextField, ItemListField, SelectField com posicionamento adaptativo, WidgetDialog, FormActions, PendingChanges, EmptyState, AppToast e WorkspacePagination.

Adições compartilhadas: FormReadiness, OptionalSection, KanbanBoard, VacancyIdentity e opção Quadro no seletor de coleção. Tokens categóricos ficam na biblioteca de UI; a demonstração operacional do DS usa a mesma implementação. Nenhum layout da Home ou de Personalização foi refeito. A métrica operacional foi adaptada aos novos estados sem redesenhar a Home.

## Banco, compatibilidade e isolamento

Migrations novas 0071–0073: versão pública imutável do anúncio, metadados do editor, cores; pipeline canônico e histórico; revisões públicas e compatibilidade. Estados legados são preservados como evidência. Pré-aprovação/pré-reprovação não se tornam decisões finais automaticamente e recebem indicação de revisão.

RPCs anteriores continuam disponíveis para leitura/rollback. Escritas antigas não podem publicar vagas do contrato v2 e contornar as validações. Novas candidaturas mantêm correspondência de estado legado. Versão esperada, empresa ativa e permissão são conferidas no servidor; ID informado no navegador não concede acesso.

Currículos continuam no armazenamento privado existente, vinculados por documento à candidatura. A listagem não traz e-mail, notas, currículo ou histórico completos. Histórico e detalhe são consultas separadas.

## Evidências de validação

| Verificação | Evidência |
|---|---|
| Regras do editor e limites | `tests/job-editor.test.mjs`: dez essenciais, remota/presencial, jornada condicional, complementos, exemplo, consentimento, HTML/espaços vazios, limite de texto, normalização e URLs antigas. |
| Contrato da IA | `tests/recruitment-contracts.test.mjs`, `tests/job-assistant.test.mjs`: intenção, origens, contexto, mocks, seleção, campos proibidos e respostas reais sintéticas. |
| Rotas e segurança da API | `tests/jobs-api.test.mjs`, `tests/company-operations-api.test.mjs`: sessão, origem, empresa, permissões, versão, stream, erro, tentativa de correção, paginação e domínio personalizado. |
| Banco isolado | `tests/recruitment-security.sql`: rascunho, publicação, revisão sem vazamento, concorrência, exemplo, compatibilidade, deduplicação, duas vagas, etapas, desfechos, histórico e isolamento. Integra o CI completo de migrations. |
| Volume | 5.000 candidaturas sintéticas no teste SQL; lotes limitados e contagens. Não é um benchmark de latência da VPS sob carga concorrente. |
| Visual responsivo | Harness com componentes reais em `tests/visual-recruitment/`; matriz de 50 combinações de telas/etapas em 320, 390, 768, 1024 e 1440 px, temas claro/escuro. Evidências locais em `outputs/recruitment/`. |
| Interação | Movimento, reversão, notas, histórico limitado, conflito recuperável, indicação/foco de pendências, preservação entre etapas e zoom. Relatório local `interaction-checks.json`. |
| Regressão geral | Pipeline `Qualidade da JBFD`: código/build, Docker, Auth/Storage nativos, SQL e MCP. Nenhum gate foi retirado para publicar. |

## Rastreabilidade dos 72 casos do estudo

Esta tabela diferencia implementação, teste automatizado e conferência visual. Não declara que simulação de navegador equivale a ensaio físico em todo dispositivo.

| Casos | Cobertura implementada | Evidência principal |
|---|---|---|
| T01–T03 | Rascunho, dez essenciais e resumo com links por campo | Editor + testes de regras/SQL |
| T04–T07 | Remoto sem filial, unidade ativa, jornada condicional, requisitos explícitos | Editor + SQL; inativação revalidada no momento de publicar |
| T08–T12 | Opcionais, contatos, vazio semântico, limites, salário e data | Regras compartilhadas + contrato IA + SQL |
| T13–T17 | Portal, mesma publicação, estado ocupado, versão e falhas | Serviço único/RPC/BFF; dados mantidos na falha |
| T18–T22 | Guard de saída, navegação interna, revisão pública, componente público compartilhado, duplicação e URLs antigas | Editor/modelo, snapshot SQL; renderização pública reutilizada em todos os templates |
| T23–T25 | Exemplo completo, MOC, negação de exemplo | Execuções reais 1780/1781 e corpus |
| T26–T28 | Briefing completo, opcionais sem invenção e pergunta agrupada | Prompt/contrato; cenário real T25 exercita parte deste conjunto |
| T29–T33 | Escopo, proposta não aplicada, seleção, normalização e confirmação humana | Corpus T29/T30/T33 + testes de contrato/editor |
| T34–T37 | Filiais/chaves proibidas, anexo hostil, contexto e erro/stream | Contrato e BFF; corpus T35; uma correção de formato no máximo |
| T38–T41 | Limites/cancelamento/mídia, conflito por campo, conversão humana e corpus versionado | Rotas de mídia existentes/testes, JobAssistant, revisão e execuções registradas |
| T42–T46 | Inscrição atômica, deduplicação, processos separados, vaga indisponível e currículo condicional | SQL de recrutamento e testes operacionais existentes |
| T47–T52 | Botão/teclado/arraste, permissões, decisões, conflito, agendamento e ausência de envio implícito | Mesma função de movimento; SQL + interação isolada |
| T53–T56 | Filtro fixo, lotes/volume, estados vazios e preferências de visualização | Consulta paginada + fixtures de volume/erro/vazio + biblioteca de coleções |
| T57–T60 | Currículo privado e histórico paginado | Gate de Storage existente, vínculo por documento, BFF e drawer |
| T61–T64 | Migração conservadora, cores, contexto e leitura legada | Migrations, testes de segurança e matriz visual |
| T65–T69 | Larguras, temas, zoom, menus adaptativos, foco e texto longo | Matriz visual, interação e componentes DS; teclado virtual físico e leitor de tela real não foram ensaiados neste ambiente |
| T70–T72 | Home/Personalização preservadas, host personalizado, publicação Test | Diff de escopo, API de host e conferência pós-deploy registrada no workspace |

## Operação e reversão

1. Integrar somente após CI aprovado. Pipeline cria backup cifrado externo, verifica restauração, aplica migrations e publica Test.
2. Conferir `/api/health` com o SHA integrado, ativar a versão correspondente do workflow Test e conferir rotas afetadas.
3. Em falha de migração, o pipeline interrompe a publicação. Em regressão de app, usar o mecanismo existente de imagem anterior; não desfazer tabelas nem apagar candidaturas.
4. Workflow anterior permanece no histórico n8n para restauração coordenada com a imagem anterior. Dados de avaliação não são copiados para o banco do produto.
5. Live exige a aprovação explícita do usuário e o gate `jbfd-live`, promovendo a imagem já validada no Test.

Não fazem parte desta entrega: etapas editáveis por empresa, ranqueamento automático de pessoas, reprovação automática por IA, mensageria implícita ao mover cartões ou publicação autônoma de vagas fictícias.

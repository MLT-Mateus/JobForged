# Revalidação do estudo de vagas, assistente e Kanban

Data: 22/11/2026. Referência: ESTUDO-VAGAS-ASSISTENTE-KANBAN-2026-11-22.md. Esta conferência revisita o estudo e amplia a primeira entrega: a validação anterior não havia publicado uma vaga nem inscrito uma pessoa no Test. Agora esse caminho foi executado com registros explicitamente técnicos e sintéticos.

## Lacunas encontradas e corrigidas

1. Resumo extenso no celular: padrão compartilhado compacto, próximo campo e expansão das pendências.
2. Navegação de erro: habilita mensagens por campo, abre complementos recolhidos e foca o horário ausente quando a jornada exige horário.
3. Continuidade após publicar: Abrir página e Ver candidaturas, com aba da vaga persistida na URL.
4. Recebimento de inscrições: preferência em Revisão, persistida/publicada atomicamente com a vaga; alterações não vazam do rascunho. Configurações orientam editar a revisão.
5. Desistência comunicada pela equipe: decisão autorizada, origem, motivo e histórico; retirada do próprio candidato permanece bloqueada para reabertura pela equipe. Retorno de Aprovação também exige motivo.
6. IA: campos internos sem destino aprovado removidos; carreira/benefícios seguem limite de 5.000. Resposta histórica incompatível foi mantida como evidência negativa e substituída na aceitação por nova execução real.
7. Identidade: cor menos usada priorizada enquanto a paleta oferece opções. Exportação do quadro não considera um filtro de etapa que esteja oculto.
8. Contratação/jornada: opções válidas conferidas no cliente e banco, com normalização de aliases de contratação.

## Fluxo executado no Test

- Cadastro de candidato sintético com endereço example.invalid, sem caixa de terceiros.
- Briefing completo enviado no assistente pela interface; dez campos propostos e aplicados, sem opcionais inventados.
- Revisão humana pelo fluxo do aplicativo, publicação 200 e anúncio acessível no portal.
- Candidatura pela interface móvel, sem currículo quando opcional; repetição não duplica.
- Triagem → Entrevista → Aprovação → Contratação pela interface, confirmações e histórico; nota interna gravada.
- Segunda vaga/inscrição com PDF privado: processo independente; atualizar o currículo da conta preservou o arquivo original da inscrição.
- Os anúncios técnicos foram pausados logo após a inscrição. Destino final dos registros consta no recibo de publicação. Não houve convite ou e-mail enviado ao candidato.

## Rastreabilidade individual dos 72 casos

“Implementado” não significa teste físico em todos os dispositivos. A evidência abaixo distingue uso do Test, automação isolada e limites materiais. T67/T69 continuam com ensaio físico de teclado/leitor de tela não realizado; isso não é apresentado como teste aprovado.

| ID | Cenário do estudo | Evidência e alcance |
|---|---|---|
| T01 | Nova vaga vazia | Test autenticado: rascunho vazio salvo; regras do editor e SQL. |
| T02 | Dez essenciais válidos, opcionais vazios | Test autenticado: briefing completo gerado por IA e publicado sem salário/benefícios. |
| T03 | Cada essencial ausente, um por vez | Teste parametrizado dos dez essenciais; prontidão compartilhada. |
| T04 | Remoto sem filial | Test autenticado: remoto Brasil, nenhuma filial, publicação 200. |
| T05 | Presencial/híbrido sem unidade | Seletor de unidades abre Filiais em outra aba e permite atualizar sem sair do rascunho. |
| T06 | Filial inativada durante edição | RPC revalida unidade ativa na validação/publicação; contexto é reconsultado pelo seletor. |
| T07 | Requisitos vazios versus modo sem exigência prévia | Test autenticado: declaração sem experiência aceita e renderizada no portal. |
| T08 | Salário/benefícios/nivel/PCD vazios | Test autenticado: nível, salário, benefícios e acessibilidade vazios não bloquearam. |
| T09 | Contato opcional inválido | Navegador isolado: e-mail inválido expande seção, recebe foco e pode ser removido. |
| T10 | HTML vazio, espaços, listas vazias e texto extenso | Testes de vazio semântico, listas, whitespace e 5.000 caracteres. |
| T11 | Limites de título/texto em digitação, IA e API | Contrato IA/editor/SQL; complementos carreira/benefícios alinhados a 5.000; corpus negativo preservado. |
| T12 | Faixa mínima maior que máxima/data inválida | Testes de faixa/data, data impossível e complementos ausentes. |
| T13 | Portal não publicado/empresa indisponível | Condições operacionais separadas, BFF e RPC; quadro de prontidão não conta portal como essencial. |
| T14 | Publicação via lista, detalhe ou editor | Lista/detalhe/editor usam company_jobs_v2 e a mesma job_issues; BFF mantém pendências. |
| T15 | Publicação em andamento/duplo clique | UI desabilita ação ocupada; operações gravam versão; testes transacionais. |
| T16 | Edição simultânea | Versão observada nas ações; testes 40001/409, conflito de notas e movimento. |
| T17 | Falha de rede ao salvar/publicar | Teste isolado de erro/concorrência; estado do formulário mantido; sem sucesso fictício. |
| T18 | Sair com rascunho; navegar entre etapas | PendingChanges e teste de navegação entre etapas; abas internas preservam conteúdo. |
| T19 | Alterar vaga já publicada | Teste SQL: revisão não altera anúncio, exigência de currículo nem recebimento até publicar. |
| T20 | Prévia e anúncio em todos os templates | JobDescription compartilhado, allowlist pública e ausência de campos internos; portal real conferido. |
| T21 | Duplicar vaga com opções e prazo vencido | Duplicação por criação de rascunho, sem candidatos; quantidade/currículo preservados, prazo/aceite zerados. |
| T22 | URLs/rascunhos antigos | sectionIndex mantém URLs antigas e hidratação preserva rascunhos. |
| T23 | “Crie uma vaga fictícia completa de atendimento” | Nova resposta real T23-current: 28 campos, dez essenciais completos, example=true, não publicada. |
| T24 | “Crie uma vaga MOC de ponta a ponta” | Pedido real de MOC completo e corpus T24 aceitos. |
| T25 | “Não é uma vaga fictícia” | Corpus T25: ausência de exemplo e de salário/benefícios inventados. |
| T26 | Briefing real completo em uma mensagem | Test autenticado: dez dados fornecidos em uma mensagem, proposta de dez campos sem perguntas repetidas. |
| T27 | Pedido real sem salário/benefícios | Mesmo briefing real sem opcionais; publicação passou. |
| T28 | Pedido sem contratação/jornada/local | Prompt e validationState agrupam fatos ausentes; cobertura recalculada pelo servidor. |
| T29 | “Altere só o título” | Test autenticado e corpus: somente título alterado; aplicação e Desfazer conferidos. |
| T30 | Proposta anterior não aplicada | Contrato separa formulário e proposta; corpus T30 mantém lacunas não aplicadas. |
| T31 | Aplicação parcial | Seleção por campo, proteção de example e prontidão após aplicação efetiva. |
| T32 | Aplicação de description/attributions | normalizeJob e applicationFeedback testados sobre o mesmo documento. |
| T33 | Confirmação humana já feita | Corpus T33 e contrato de validação humana fora do patch. |
| T34 | Filial inventada/outra empresa/chave proibida | BFF/contrato: rejeita filial externa, IDs, LGPD e campos fora da lista. |
| T35 | Instrução maliciosa em PDF ou texto | Corpus T35 e prompt tratam anexo como referência não confiável. |
| T36 | Contradição entre pedido e formulário | Objetivo e pedido atuais separados; proposta anterior não confirmada; testes de escopo. |
| T37 | Timeout/JSON inválido/stream interrompido | Testes de stream, contrato e tentativa única de correção; entrada preservada. |
| T38 | Limite de uso/cancelamento/áudio inválido | Testes de voz/cancelamento/media e limites de BFF; sem teste com microfone físico. |
| T39 | Edição manual depois da geração | Comparação por campo com snapshot da proposta; versão no servidor para persistência. |
| T40 | Exemplo convertido em real | UI de conversão com revisão explícita e proteção SQL; IA não pode limpar example. |
| T41 | Comparar versões do modelo/prompt | Corpus versionado com casos positivos, resposta originalmente inválida e resposta obsoleta rejeitada. |
| T42 | Inscrição válida | Test publicado: inscrição via portal retornou Triagem e apareceu no quadro. |
| T43 | Repetir inscrição | Test publicado: repetição retornou uma candidatura, sem cartão duplicado. |
| T44 | Mesma pessoa em duas vagas | Test publicado: duas inscrições da mesma pessoa; uma contratada e outra em Triagem. |
| T45 | Vaga pausada/encerrada/prazo vencido | Validação SQL/BFF de status, prazo e aceitação; vagas técnicas pausadas após inscrição. |
| T46 | Currículo opcional/obrigatório | Test publicado: primeira inscrição sem currículo; segunda com exigência e PDF. |
| T47 | Mover por drag, clique e teclado | Botões/arraste usam a mesma operação; fluxo real por botão e testes isolados de movimentação. |
| T48 | Aprovar/contratar sem permissão | Permissões SQL/BFF e teste de administrador sem applications.decide. |
| T49 | Reprovar/desistir/reabrir | 0075 adiciona desistência comunicada com origem/motivo; teste protege retirada do candidato e retorno de decisão. |
| T50 | Movimento concorrente/falha de rede | Conflito recuperável testado com 409, preservação do quadro e versão atualizada. |
| T51 | Entrar repetidamente em Entrevista | Testes SQL de entradas repetidas em Entrevista; um compromisso pendente. |
| T52 | Mover etapa | Movimentos reais sem envio; mensagem explícita na confirmação e no sucesso. |
| T53 | Quadro dentro da vaga | jobId da prop prevalece na consulta, exportação e limpeza; atalhos pós-publicação abrem a aba certa. |
| T54 | Quadro com 0/1/100/5.000 candidaturas | 5.000 fixtures SQL; lotes por coluna e detalhe separados; visual com vazio e volume. |
| T55 | Filtro sem resultados versus nenhuma inscrição | Estados vazios distinguem busca/filtros e ausência de inscrições no mesmo cartão. |
| T56 | Lista/Blocos/Quadro | Componente compartilhado e preferência por rota; exportação do quadro ignora filtro de etapa oculto. |
| T57 | Currículo de outra empresa/ID alterado | Permissão applications.resume, vínculo empresarial e API privada; testes de Storage e ID externo. |
| T58 | Currículo atualizado após inscrição | Test publicado: após currículo v2, candidatura manteve curriculo-validacao-v1.pdf. |
| T59 | Currículo indisponível ou viewer incompatível | Download privado real 200; viewer com fallback Baixar e erro recuperável; não presume suporte PDF em todo navegador. |
| T60 | Muitas notas/eventos | Histórico de cinco eventos por página; notas sob demanda; fluxo real gravou anotação. |
| T61 | Migração dos oito estados | Migração aditiva preserva stage legado e vínculos; pré-decisões ficam pendentes de revisão. |
| T62 | Cor de vaga em tema claro/escuro | Tokens DS em claro/escuro; 0075 prioriza cor menos usada entre vagas não arquivadas; nome/código sempre presentes. |
| T63 | Revogar acesso/trocar empresa durante edição | BFF/RPC revalidam empresa e acesso; componentes são remontados ao mudar organização. |
| T64 | Reverter versão do aplicativo após migração | RPCs antigos mantidos para leitura; publicações v2 não podem ser sobrescritas pelo editor antigo. |
| T65 | 320/390/768/1024/1440 px, zoom 200% | Matriz anterior de 50 combinações e nova verificação de prontidão compacta/foco/ações; zoom 200%. |
| T66 | Menu Mover/Select junto às bordas | Popover DS adaptativo e dialog; opções do movimento real conferidas. |
| T67 | Teclado virtual aberto | Layout/visualViewport e rolagem implementados; teclado virtual físico não disponível nesta execução. |
| T68 | Texto muito curto/longo, nome/e-mail longos | Fixtures com nomes/e-mails extensos e correção compartilhada de quebra a 320 px. |
| T69 | Contraste, foco, teclado e leitor de tela | Controles nomeados, foco verificado e alternativa ao arraste; leitor de tela físico não ensaiado. |
| T70 | Home e Personalização | Diff restrito ao recrutamento/DS compartilhado; layouts Home e Personalização preservados. |
| T71 | Domínio personalizado funcional | Domínio Hitori confirmado no Abrir página; host personalizado coberto por API e portal Test. |
| T72 | Test publicado | CI, migration, SHA, healthcheck e revalidação publicados constam no recibo final do workspace. Live não promovida. |

## Diagnósticos e backlog do estudo

- V01–V11: editor, taxonomia, limites, normalização, feedback e complementos — T01–T18; prontidão/foco ampliados nesta revisão.
- V12–V17: pipeline universal, lotes, currículo e contexto por vaga — T42–T60.
- V18–V25: concorrência, preferências, prazo, estados públicos, revisão e duplicação — T12–T22 e T42–T46.
- V26: implementação operacional usa pipeline/modelo e RPCs reais; tipos históricos não são tratados como recursos existentes.
- V27: identidade categórica persistida; prioridade de cores livres corrigida nesta revisão.
- IA01–IA12: prompt por intenção/contexto, contrato validado, proveniência, mock completo e tentativa limitada de correção — T23–T41.
- B01–B10: fundação, migração, editor, IA, inscrição, quadro, detalhe, identidade, DS e publicação cobertos pelas duas entregas. Não inclui etapas customizáveis, decisão automática ou contato implícito.

## Arquivos e execução

- Migration nova e imutável: 0075_recruitment_completion.sql.
- Teste visual adicional reproduzível: tests/visual-recruitment/revalidation.mjs, com servidor de fixtures da mesma pasta; exige Playwright e navegador disponível.
- Testes de regras/contratos, BFF e SQL ampliados; backup/migrations continuam pelo pipeline protegido.
- Evidências locais: outputs/recruitment-revalidation/. Não contêm credenciais.
- Prompt Test publicado: versão 98287bc7-0f8e-415c-9323-2c3e2b5ca66e de NTb1OmXykFRnRETw; somente instruções do agente alteradas.
- Recibo do SHA final e CI: REVALIDACAO-VAGAS-DEPLOY-2026-11-22.md no workspace.

Live permanece dependente de aprovação explícita posterior. Não se copiam dados Test para Live.

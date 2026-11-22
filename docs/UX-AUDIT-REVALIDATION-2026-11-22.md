# Revalidação UX/UI — 22/11/2026

## Escopo e conclusão

Revisão dos **211 IDs**, comparando o aceite original com o inventário de implementação e as fontes atuais. Esta rodada corrige lacunas concretas encontradas no backoffice e conclui a conferência visual **isolada** autorizada pelo usuário. Home e Personalização mantêm a arquitetura aprovada. O destino é Test; nenhuma promoção Live está autorizada.

**Não equivale a homologação autenticada do backoffice publicado.** A conta Hitori retorna 403 para essa área. O usuário escolheu continuar com validação isolada. Os componentes reais foram montados com dados sintéticos e todas as gravações/envios da bancada retornam falha controlada; não foi criado administrador nem ampliado acesso. IDs com método fonte/testes não foram todos percorridos visualmente nesta rodada. Aceites com matrizes abertas (todos os dispositivos, leitor de tela, teclado virtual e combinações de papéis) não são convertidos em aprovação universal.

## Lacunas corrigidas nesta rodada

- **G02:** Barra compartilhada alinha base dos campos e ações; filtros extensos usam grade 3/2/1.
- **G13:** Contexto explícito de retorno preserva filtros, página e visão em empresa e vagas, inclusive editor/prévia. Destinos de retorno são restritos à coleção.
- **G15:** Métricas BO usam Indisponível para resposta parcial, zero real continua zero; números locais e grade equilibrada.
- **BO04:** Filtro de empresa validado é enviado ao servidor; busca/status/autor/alvo/datas são aplicados juntos.
- **BOV01:** Corrigido estado ausente e tamanho textual do fallback; resposta parcial testada visualmente.
- **BOE01:** CNPJ/telefone usam máscaras compartilhadas; plano/contrato/estado operacional separados.
- **BOD01:** Equipe limitada a 10 e convites a 5, com links que efetivamente filtram a empresa.
- **BOD02:** Detalhe em Dados, Equipe, Convites e Gestão. Plano e acesso têm valores separados.
- **BOD03:** Suspensão e exclusão na Gestão, com revisão de impacto, motivo, confirmação nominal e MFA preservados.
- **BOU02:** Avatar compacto e dados pessoais progressivos; largura mínima legível na tabela e blocos no móvel.
- **BOU03:** Editor informa pessoa, empresa e que apenas o vínculo muda; conta global preservada.
- **BOC01:** Datas em Brasília e destinatário/empresa na confirmação; ações dependem do estado.
- **COM01:** Carregamento não mostra resultado antigo ao trocar busca; paginação ocupada e vazio distinguem busca e coleção.
- **COM04:** Banner recuperável por sete dias no mesmo navegador/conta, sem publicar; upload concluído distinto de salvar. Cancelar/descartar remove rascunho local. Sem apagar assets registrados.
- **BOA02:** Datas exibidas no mesmo fuso dos filtros; grade extensa evita campo isolado com largura total.
- **BSEC03:** Estado de sessão deriva do mesmo requisito de MFA recente do servidor. Expira automaticamente e atualiza ao retornar à aba; permite nova confirmação mesmo com aal2.
- **INT05:** Erro aponta a linha original, incluindo linhas vazias; salvar indisponível enquanto inválida.

Também: identidade compacta com avatar; saída visível em vermelho e compacta no móvel; detalhes de convites identificam destinatário/empresa; erro não apaga formulário; não exibir paginação em coleção sem registros; guard compartilhado não disputa eventos de retorno já tratados.

## Evidências visuais e funcionais

Capturas locais: ../validacao-backoffice-2026-11-22/ (fora do repositório público, dados exclusivamente sintéticos).

| Área | Conferência realizada | Evidência principal |
|---|---|---|
| Visão geral | Resposta parcial, 1.234.567, seis cartões, pendências reais da fixture; desktop claro e 320 px escuro | visao-geral-desktop.png; visao-geral-320-escuro.png |
| Empresas | Campos/ações alinhados, documento mascarado, lista/blocos, vazio integrado, erro/retentar, filtro e retorno | empresas-desktop.png; empresas-vazio.png; empresas-erro.png |
| Detalhe | Quatro abas, dados/contrato/acesso, equipe limitada, coleção filtrada por empresa | empresa-detalhe-desktop.png |
| Usuários | Nome/e-mail longo, avatar, detalhes pessoais, vínculo distinto da conta, blocos móveis | usuarios-mobile-escuro.png |
| Convites | Estados pendente/expirado/aceito/revogado, validade, botões apropriados e confirmação contextual | convites-desktop.png; convites-mobile-escuro.png |
| Comunicação | Abas, paginação 10 itens, formulário por grupos, recuperação de texto em nova aba do mesmo navegador, descarte confirmado | banner-rascunho-recuperado.png |
| Configurações | Dados públicos, formulário com motivo; falha controlada mantém valores; descarte pede confirmação | configuracoes-desktop.png |
| Auditoria | Grade de filtros, fuso Brasília, resumo humano, evento desconhecido, detalhe técnico recolhível | auditoria-desktop.png; auditoria-mobile-escuro.png |
| Segurança | Fixture aal2 expirada permite confirmar; fixture recente expira após 12 segundos e volta ao código | seguranca-sessao-expirada.png; seguranca-expiracao-mobile.png |
| Integrações | Nome real, paginação, formulário, descarte e erro na linha 3 após linha vazia | integracoes-erro-linha-mobile.png |
| Exclusão | Revisão de impacto, nome/motivo, botão indisponível sem confirmação; cancelamento sem executar exclusão | exclusao-revisao-desktop.png |

Medições em DOM confirmaram largura documental igual ao viewport em 390 px e 320 px nos casos medidos. Tabelas podem rolar dentro do seu cartão, mantendo a página sem rolagem horizontal; blocos oferecem leitura vertical. Não declarar que todas as rotas foram medidas em todas as larguras.

## Reproduzir sem dados reais

Executar na raiz do checkout: node tests/visual-backoffice/server.mjs. Abrir http://127.0.0.1:5184/backoffice. Servidor apenas em 127.0.0.1, sem credenciais, sem encaminhar chamadas e sem gravações. Cenários por query scenario: empty, error, mfa e security-fresh. Mesmos componentes/CSS; dados sintéticos extensos e paginados. A bancada não entra nas rotas da aplicação.

## Persistência e segurança

- Migration 0070 acrescenta leitura do prazo de confirmação ao security_status; usa require_admin_factor(true). Não reduz o prazo, não libera operação e não altera credenciais.
- Teste SQL cobre MFA recente e expirado mantendo aal2, e confirma que o gate continua recusando operação expirada.
- Retorno de coleção rejeita origens externas e rotas diferentes da coleção esperada.
- Recuperação de banner guarda somente metadados e referências dos assets, por conta, no navegador, por sete dias. Não guarda arquivos, tokens, senhas ou destinatários de comunicados. Não é backup nem publicação. Limpeza do navegador impede recuperação; o guard continua funcionando quando o armazenamento está indisponível. Não existe promessa de limpeza automática dos assets de plataforma: continuam registrados, privados e sujeitos à política atual, inclusive após descarte explícito. Upload não registrado por falha do servidor continua sendo erro, sem anúncio de publicação.
- Nenhum envio de e-mail/comunicado, troca de papel, suspensão, alteração de DNS ou exclusão de empresa real foi executado para validar UI.

## Validação automatizada e publicação

Typecheck e testes direcionados de máscaras, fuso, filtros, retorno seguro e recuperação de banner executados localmente. A aceitação final depende do CI (lint, build, API/HTML, migrations, Auth/Storage), deploy automático Test, SHA e healthcheck. Os links/SHA finais são registrados no recibo de publicação; não inferir deploy a partir deste arquivo.

## Matriz de 211 IDs

“Fonte/testes” = correspondência revisada com implementação e testes existentes; não é novo aceite visual de todas as variantes. “Visual isolado + fonte” = família de telas exercitada com os componentes reais, conforme a tabela de evidências; não significa cada combinação possível nem sessão administrativa publicada. Propostas já classificadas como revisadas existentes mantêm essa decisão.

| ID | Situação da implementação | Método nesta rodada | Resultado / ajuste |
|---|---|---|---|
| G01 | Implementado | Fonte/testes | Utilitário sr-only único elimina status duplicado sem perder anúncio acessível. |
| G02 | Implementado | Fonte/testes | Barra compartilhada alinha base dos campos e ações; filtros extensos usam grade 3/2/1. |
| G03 | Implementado | Fonte/testes | Escala operacional e auxiliar elevada nos componentes e exemplos; fontes de marca preservadas. |
| G04 | Implementado | Fonte/testes | Menu móvel fechado usa inert/aria-hidden; abertura e retorno de foco permanecem no shell. |
| G05 | Implementado | Fonte/testes | Organização curta visível no topo móvel, com truncamento. |
| G06 | Implementado | Fonte/testes | Link Pular para o conteúdo e alvo estável no shell. |
| G07 | Implementado | Fonte/testes | PendingChanges, DraftBoundary e useDraftScope cobrem editores, diálogos, navegação e modos. |
| G08 | Implementado | Fonte/testes | FormActions estabelece secundária antes da principal, à direita, estado ocupado e perigo. |
| G09 | Implementado | Fonte/testes | CollectionViewSwitch compartilhado nas entidades; logs/calendários/gráficos são exceções documentadas. |
| G10 | Implementado | Fonte/testes | Blocos usam auto-fill com largura limitada e alinhamento inicial. |
| G11 | Implementado | Fonte/testes | Mutações têm busy/feedback semântico e preservação dos valores após falha. |
| G12 | Implementado | Fonte/testes | Taxonomia revisada em vagas, conta, configurações e BO; termos DNS mantidos onde úteis. |
| G13 | Implementado | Fonte/testes | Contexto explícito de retorno preserva filtros, página e visão em empresa e vagas, inclusive editor/prévia. Destinos de retorno são restritos à coleção. |
| G14 | Implementado | Fonte/testes | DateField para datas; datetime-local documentado para data/hora com Brasília explícita. |
| G15 | Implementado | Fonte/testes | Métricas BO usam Indisponível para resposta parcial, zero real continua zero; números locais e grade equilibrada. |
| G16 | Implementado | Fonte/testes | Ajuda progressiva, formulários curtos, seções e histórico separados; sem reformular Home aprovada. |
| H01 | Implementado | Fonte/testes | Dois banners demonstrativos identificados por título+asset serão desativados reversivelmente na migration; destino administrativo bloqueado para empresa. |
| H02 | Implementado | Fonte/testes | Métricas móveis em grade 2×2 preservam ordem e hierarquia. |
| H03 | Implementado | Fonte/testes | Configuração da empresa e próximos passos substituem explicação técnica de setup. |
| H04 | Implementado | Fonte/testes | Estado inicial orienta o recrutamento sem multiplicar CTAs de criação. |
| H05 | Implementado | Fonte/testes | Resumo limita vagas e oferece coleção completa. |
| D01 | Implementado | Fonte/testes | Vazios não geram categoria Nenhuma vaga como dado. |
| D02 | Implementado | Fonte/testes | Títulos e explicações redundantes reduzidos. |
| D03 | Implementado | Fonte/testes | Totais e últimos seis meses identificados explicitamente. |
| D04 | Revisado existente | Fonte/testes | Verificado que fonte atual não é truncada; UI não inventa agregação ou filtro inexistente. Escala de carga continua documentada. |
| V01 | Implementado | Fonte/testes | Vazio da coleção distinto de ausência causada por filtros. |
| V02 | Implementado | Fonte/testes | Lista/Blocos usa switch compartilhado. |
| V03 | Implementado | Fonte/testes | Metadados ausentes exibem ausência, sem valores fictícios. |
| V04 | Implementado | Fonte/testes | Lista e wizard compartilham os mesmos 13 critérios de completude. |
| V05 | Implementado | Fonte/testes | Troca de estado protegida por busy e feedback de resultado. |
| V06 | Revisado existente | Fonte/testes | Mantidos apenas CTA principal e ação contextual do vazio; proposta avaliada sem apagar continuidade útil. |
| J01 | Implementado | Fonte/testes | Rótulos e cabeçalhos redundantes removidos. |
| J02 | Implementado | Fonte/testes | Salvar, Prévia e Assistência têm hierarquia e textos curtos. |
| J03 | Implementado | Fonte/testes | Completude explicita critérios, incluindo padrões; pendências navegam aos campos. |
| J04 | Implementado | Fonte/testes | Seleção de filial precede resumo do endereço; saída protegida. |
| J05 | Implementado | Fonte/testes | Atividades, requisitos, diferenciais e benefícios têm nomes coerentes. |
| J06 | Implementado | Fonte/testes | Campos curtos e editores longos dimensionados pelo conteúdo, densidade compartilhada. |
| J07 | Implementado | Fonte/testes | Competências comportamentais e Prazo de retorno substituem jargão. |
| J08 | Implementado | Fonte/testes | JobDraftDescription reutiliza JobDescription público com rascunho e filiais. |
| J09 | Implementado | Fonte/testes | Pendências associadas a campo, erro inline e revelação/foco da etapa. |
| J10 | Implementado | Fonte/testes | Detalhe, editar e prévia têm rotas e significados distintos. |
| JD01 | Implementado | Fonte/testes | Metadados são compostos apenas quando presentes. |
| JD02 | Implementado | Fonte/testes | Resumo factual substitui falso histórico reconstruído. |
| JD03 | Implementado | Fonte/testes | Editar exige a mesma permissão do editor. |
| JD04 | Implementado | Fonte/testes | Avisos automáticos descreve o recurso existente. |
| JD05 | Implementado | Fonte/testes | Opções têm leitura, erro, carregamento, guard e ações compartilhadas. |
| F01 | Implementado | Fonte/testes | Filial é a entidade consistente em vazio, formulário e ação. |
| F02 | Implementado | Fonte/testes | Limpeza desabilitada sem filtros; resumo condicionado ao conteúdo. |
| F03 | Implementado | Fonte/testes | Identificação/endereço/fotos organizados; Cancelar e Salvar à direita. |
| F04 | Implementado | Fonte/testes | Falha parcial informa filial persistida e mantém somente arquivos pendentes para reenviar. |
| F05 | Implementado | Fonte/testes | Vagas vinculáveis têm pesquisa, quantidade e área de rolagem limitada. |
| F06 | Implementado | Fonte/testes | Página efetiva limitada ao conjunto filtrado. |
| C01 | Implementado | Fonte/testes | Vazio contextual oferece Ver vagas conforme acesso. |
| C02 | Implementado | Fonte/testes | Página efetiva ajustada após filtro/redução. |
| C03 | Implementado | Fonte/testes | Histórico de candidatura em lotes de cinco, com rótulos humanos. |
| C04 | Implementado | Fonte/testes | Agendamento recebe candidatura e vaga de origem. |
| C05 | Implementado | Fonte/testes | Drawer dividido em Dados, Processo e Notas e histórico. |
| AG01 | Implementado | Fonte/testes | Alternância compacta mantém as duas opções na linha móvel. |
| AG02 | Implementado | Fonte/testes | Lista cronológica é padrão; calendário alternativo com rolagem localizada; datas DS. |
| AG03 | Implementado | Fonte/testes | Compromisso é termo consistente; candidatura opcional caracteriza entrevista. |
| AG04 | Implementado | Fonte/testes | Link começa vazio e endereço genérico não é aceito como reunião pronta. |
| AG05 | Implementado | Fonte/testes | Candidatura selecionável e persistida no compromisso com isolamento empresarial. |
| AG06 | Implementado | Fonte/testes | Lista paginada em dez itens e período identificado. |
| AG07 | Implementado | Fonte/testes | Leitura desabilita campos; edição usa guard e Cancelar. |
| FIN01 | Implementado | Fonte/testes | Plano real substitui plano/faturas/cartão fictícios. |
| FIN02 | Implementado | Fonte/testes | Fluxo transacional simulado removido do módulo operacional. |
| FIN03 | Implementado | Fonte/testes | Indisponibilidade de cobrança indicada na origem, sem documento fiscal fictício. |
| ADM01 | Implementado | Fonte/testes | Cartão de pessoa limitado pela grade de blocos e badges agrupados. |
| ADM02 | Implementado | Fonte/testes | Filtro usa largura útil e opções legíveis. |
| ADM03 | Implementado | Fonte/testes | Membro incluído nas funções reconhecidas e permitidas. |
| ADM04 | Implementado | Fonte/testes | Detalhe organiza identificação e acesso sem cartão por atributo. |
| ADM05 | Implementado | Fonte/testes | Próprio perfil oferece Minha conta. |
| ADM06 | Implementado | Fonte/testes | Convite usa rodapé comum e ordem Cancelar/Convidar. |
| ADM07 | Implementado | Fonte/testes | Bloquear/desbloquear coerente e confirmado; titular protegido. |
| ADM08 | Implementado | Fonte/testes | Permissões agrupadas por módulo e dependências explicadas. |
| ADM09 | Implementado | Fonte/testes | Permissões e identidade usam dirty, descarte e FormActions. |
| ADM10 | Implementado | Fonte/testes | Filtros compactos sem ajuda vazia e densidade móvel compartilhada. |
| CFG01 | Implementado | Fonte/testes | Dados normalizados determinam dirty; salvar/descarte e saída protegidos. |
| CFG02 | Implementado | Fonte/testes | Plano e situação contratual exibem conceitos diferentes. |
| CFG03 | Implementado | Fonte/testes | Dados, Preferências e Histórico em áreas distintas. |
| CFG04 | Implementado | Fonte/testes | Atualizar tem largura natural na barra de resumo. |
| CFG05 | Implementado | Fonte/testes | Eventos da mesma operação agrupados mantendo detalhes. |
| CFG06 | Implementado | Fonte/testes | Histórico tem autor/data/categoria e atalho ao histórico da página. |
| CFG07 | Implementado | Fonte/testes | Preferências não sobrescrevem rascunho ao atualizar; ações compartilhadas. |
| MC01 | Implementado | Fonte/testes | Resumo decorativo inicial removido. |
| MC02 | Implementado | Fonte/testes | Foto compacta no formulário aproxima os dados essenciais. |
| MC03 | Implementado | Fonte/testes | Upload de avatar tem prévia e ação legível. |
| MC04 | Implementado | Fonte/testes | Foto informa salvamento imediato; descarte refere-se aos campos do formulário. |
| MC05 | Implementado | Fonte/testes | Textos não dependem de cartão ao lado; labels de credenciais curtos. |
| MC06 | Implementado | Fonte/testes | Troca de modo de credencial confirma abandono e limpa segredos. |
| MC07 | Implementado | Fonte/testes | Segurança mostra resumo e somente o formulário ativo. |
| N01 | Implementado | Fonte/testes | hasNext calculado no servidor impede página final fantasma. |
| N02 | Implementado | Fonte/testes | Mensagens resumidas/expansíveis e filtro Somente não lidos. |
| N03 | Implementado | Fonte/testes | Nome acessível do destino inclui o assunto do aviso. |
| PER01 | Implementado | Fonte/testes | Um status visual de salvamento e anúncio assistivo oculto. |
| PER02 | Implementado | Fonte/testes | Acesso móvel Editor/Prévia e salvar sem quebrar cartão aprovado. |
| PER03 | Implementado | Fonte/testes | Descartar é local; padrão e versão são carregados para revisar antes de publicar. |
| PER04 | Implementado | Fonte/testes | Tratamento semântico de confirmação conforme consequência. |
| PER05 | Implementado | Fonte/testes | Seção desativada explica onde reativar e preserva conteúdo. |
| EL01 | Implementado | Fonte/testes | Template, seções e composição em ordem; filtros subordinados a Vagas. |
| EL02 | Implementado | Fonte/testes | Atalhos entre Elementos e Textos usam os mesmos nomes. |
| EL03 | Implementado | Fonte/testes | Orientação de imagem reduzida a formatos, tamanho e proporção; prévia preservada. |
| EL04 | Implementado | Fonte/testes | Galeria real dos cinco templates, conteúdo extremo e quatro larguras. |
| TX01 | Implementado | Fonte/testes | ContentField usa input/textarea para textos simples e preserva rich text legado. |
| TX02 | Implementado | Fonte/testes | Título de apresentação e texto complementar substituem hero. |
| TX03 | Implementado | Fonte/testes | Validação impede publicar destinos internos inadequados e mantém URLs públicas legítimas. |
| TX04 | Implementado | Fonte/testes | Controle de tema tem uma fonte no editor. |
| TX05 | Implementado | Fonte/testes | PublicJobs recebe flags e textos do mesmo contrato da prévia. |
| TX06 | Implementado | Fonte/testes | Limites semânticos e quebra de conteúdo preservam textos completos. |
| MAR01 | Implementado | Fonte/testes | Orientação de cores curta e ajustes por grupo. |
| MAR02 | Implementado | Fonte/testes | Logo sem versão escura ganha superfície de apoio no cabeçalho e rodapé. |
| MAR03 | Implementado | Fonte/testes | Tokens compartilhados mantêm derivação contrastante; paletas e extremos testados. |
| MAR04 | Implementado | Fonte/testes | Quatro fontes mantidas e testadas nos cinco templates em 390 px. |
| END01 | Implementado | Fonte/testes | Slug participa do mesmo salvar/versionamento da página. |
| END02 | Implementado | Fonte/testes | Intenções de domínio/preparação/desconexão integram a publicação transacional. |
| END03 | Implementado | Fonte/testes | Desconectar exige confirmação e só aplica ao publicar. |
| END04 | Implementado | Fonte/testes | Carregando/erro/ativo/pendente/ausente são estados distintos. |
| END05 | Implementado | Fonte/testes | Resumo ativo primeiro e procedimento DNS progressivo. |
| END06 | Implementado | Fonte/testes | Atalho de prévia usa resolvedor público comum. |
| HIS01 | Implementado | Fonte/testes | Histórico servidor com dez versões por página. |
| HIS02 | Implementado | Fonte/testes | Somente versão publicada corrente recebe Atual. |
| HIS03 | Implementado | Fonte/testes | Lista e comparação usam o mesmo painel com retorno. |
| HIS04 | Implementado | Fonte/testes | Diff percorre configuração versionada completa com textos, cores, imagens e endereço. |
| HIS05 | Implementado | Fonte/testes | Revisar esta versão prepara rascunho; publicação é explícita e gera nova versão. |
| P01 | Implementado | Fonte/testes | Busca, filtros e vazio publicados respeitam configuração. |
| P02 | Implementado | Fonte/testes | Título e descrição públicos identificam a empresa. |
| P03 | Implementado | Fonte/testes | Lista/Blocos e busca normalizada por acentos. |
| P04 | Implementado | Fonte/testes | Resumo respeita palavras; múltiplas filiais têm síntese e detalhe. |
| P05 | Implementado | Fonte/testes | Links publicados para administração são suprimidos; editor exige destino público. Nenhum telefone/WhatsApp foi inventado ou substituído sem fonte. |
| P06 | Implementado | Fonte/testes | Página canônica de vaga e compatibilidade com hash antigo. |
| P07 | Implementado | Fonte/testes | Renderizador/projeção pública incluem campos destinados ao candidato; classificação descrita no relatório. |
| P08 | Implementado | Fonte/testes | Tema e marca herdados do portal no anúncio individual. |
| P09 | Implementado | Fonte/testes | Cabeçalho compacto da empresa, retorno e candidatura no contexto. |
| CA01 | Implementado | Fonte/testes | Labels legais legíveis; ação principal alinhada à direita. |
| CA02 | Implementado | Fonte/testes | Modos preservam e-mail e protegem cadastro; segredos não persistidos. |
| CA03 | Implementado | Fonte/testes | Credenciais usam mesma linguagem e feedback do painel empresarial. |
| CA04 | Implementado | Fonte/testes | Candidato altera e-mail/senha imediatamente mediante senha atual no contrato próprio. |
| CA05 | Implementado | Fonte/testes | Perfil e credenciais têm guard; currículo informa persistência imediata. |
| CA06 | Implementado | Fonte/testes | Minhas candidaturas tem busca, etapa, paginação e Lista/Blocos. |
| CA07 | Implementado | Fonte/testes | Etapa legível e link canônico à vaga com situação real. |
| CA08 | Implementado | Fonte/testes | Retirada tem Cancelar e logout usa perigo. |
| AP01 | Implementado | Fonte/testes | Login integrado retorna à mesma vaga sem ação atrás de modal. |
| AP02 | Implementado | Fonte/testes | Sessão ausente e erro de rede têm estados/continuidade distintos. |
| AP03 | Implementado | Fonte/testes | Arquivo salvo é separado do envio efetivo da candidatura. |
| AP04 | Implementado | Fonte/testes | Situação anterior é reconhecida sem prometer reenvio não suportado. |
| BO01 | Implementado | Visual isolado + fonte | Identidade fica no shell; cabeçalhos focam tarefa. |
| BO02 | Implementado | Visual isolado + fonte | Filtros, resultados e vazio no mesmo contêiner. |
| BO03 | Implementado | Visual isolado + fonte | Entidades usam alternância e paginação compartilhadas; auditoria mantém tabela. |
| BO04 | Implementado | Visual isolado + fonte | Filtro de empresa validado é enviado ao servidor; busca/status/autor/alvo/datas são aplicados juntos. |
| BO05 | Implementado | Visual isolado + fonte | Escopo de rascunho protege editores e atualização; motivo mantido. |
| BO06 | Revisado existente | Visual isolado + fonte | Placeholders finais seguem normalização do componente; exemplos em fonte não são tratados como bug visual sem evidência. |
| BOV01 | Implementado | Visual isolado + fonte | Corrigido estado ausente e tamanho textual do fallback; resposta parcial testada visualmente. |
| BOV02 | Implementado | Visual isolado + fonte | Vocabulário de pessoas/empresas/convites e escopo explícito. |
| BOV03 | Implementado | Visual isolado + fonte | Acompanhar agora usa contagens reais de convites e suspensão, com links filtrados. |
| BOE01 | Implementado | Visual isolado + fonte | CNPJ/telefone usam máscaras compartilhadas; plano/contrato/estado operacional separados. |
| BOE02 | Implementado | Visual isolado + fonte | Coleção de empresas integrada com Lista/Blocos. |
| BOE03 | Implementado | Visual isolado + fonte | Situação operacional e situação do plano separadas. |
| BOD01 | Implementado | Visual isolado + fonte | Equipe limitada a 10 e convites a 5, com links que efetivamente filtram a empresa. |
| BOD02 | Implementado | Visual isolado + fonte | Detalhe em Dados, Equipe, Convites e Gestão. Plano e acesso têm valores separados. |
| BOD03 | Implementado | Visual isolado + fonte | Suspensão e exclusão na Gestão, com revisão de impacto, motivo, confirmação nominal e MFA preservados. |
| BOU01 | Implementado | Visual isolado + fonte | Nome e empresa substituem IDs no conteúdo principal. |
| BOU02 | Implementado | Visual isolado + fonte | Avatar compacto e dados pessoais progressivos; largura mínima legível na tabela e blocos no móvel. |
| BOU03 | Implementado | Visual isolado + fonte | Editor informa pessoa, empresa e que apenas o vínculo muda; conta global preservada. |
| BOC01 | Implementado | Visual isolado + fonte | Datas em Brasília e destinatário/empresa na confirmação; ações dependem do estado. |
| BOC02 | Implementado | Visual isolado + fonte | Formulário protegido e feedback não promete entrega de e-mail comprovada. |
| BOC03 | Implementado | Visual isolado + fonte | Blocos mantêm destinatário, situação e prazo, com paginação. |
| COM01 | Implementado | Visual isolado + fonte | Carregamento não mostra resultado antigo ao trocar busca; paginação ocupada e vazio distinguem busca e coleção. |
| COM02 | Implementado | Visual isolado + fonte | Matriz de canais corresponde ao suporte existente; cadastro do candidato não é negado. |
| COM03 | Implementado | Visual isolado + fonte | Conteúdo, Imagens e Destino/exibição organizados. |
| COM04 | Implementado | Visual isolado + fonte | Banner recuperável por sete dias no mesmo navegador/conta, sem publicar; upload concluído distinto de salvar. Cancelar/descartar remove rascunho local. Sem apagar assets registrados. |
| COM05 | Implementado | Visual isolado + fonte | Revisão de público/destino antes de enviar; servidor também revalida drafts antigos. |
| COM06 | Implementado | Visual isolado + fonte | Verbos de envio/publicação substituem Confirmar genérico. |
| BOS01 | Implementado | Visual isolado + fonte | Valores ausentes não exibem undefined. |
| BOS02 | Implementado | Visual isolado + fonte | Suporte público primeiro, informações técnicas progressivas. |
| BOS03 | Implementado | Visual isolado + fonte | Motivo, dirty e ações comuns preservados. |
| BOA01 | Implementado | Visual isolado + fonte | Evento mostra autor, ação, empresa, motivo; JSON em detalhe técnico. |
| BOA02 | Implementado | Visual isolado + fonte | Datas exibidas no mesmo fuso dos filtros; grade extensa evita campo isolado com largura total. |
| BOA03 | Implementado | Visual isolado + fonte | Dicionário de ações e fallback legível mantêm código original no detalhe. |
| BSEC01 | Implementado | Visual isolado + fonte | Estado do MFA primeiro; solução de problemas recolhível. |
| BSEC02 | Implementado | Visual isolado + fonte | Suporte usa destino configurado. |
| BSEC03 | Implementado | Visual isolado + fonte | Estado de sessão deriva do mesmo requisito de MFA recente do servidor. Expira automaticamente e atualiza ao retornar à aba; permite nova confirmação mesmo com aal2. |
| INT01 | Implementado | Visual isolado + fonte | Busca examina nomes e configurações reais. |
| INT02 | Implementado | Visual isolado + fonte | Sem resultado apresenta vazio e limpar busca. |
| INT03 | Implementado | Visual isolado + fonte | Coleção integrada, paginada e com alternância. |
| INT04 | Implementado | Visual isolado + fonte | Editor com guard, Cancelar e preservação em erro. |
| INT05 | Implementado | Visual isolado + fonte | Erro aponta a linha original, incluindo linhas vazias; salvar indisponível enquanto inválida. |
| DEL01 | Implementado | Visual isolado + fonte | Fila servidor paginada com empresa, solicitante e horários. |
| DEL02 | Implementado | Visual isolado + fonte | Texto corresponde à cópia cifrada automática; não exige computador ligado. |
| DEL03 | Implementado | Visual isolado + fonte | Cancelar antes da ação de perigo; confirmação nominal/MFA preservados. |
| AU01 | Implementado | Fonte/testes | Contrato numérico existente verificado; filial agora usa a mesma máscara/validação. Alfanumérico não é anunciado como suportado pelo cadastro. |
| AU02 | Implementado | Fonte/testes | Cadastro agrupado em empresa/responsável, acesso e confirmação. |
| AU03 | Implementado | Fonte/testes | Resultado de confirmação/recuperação não é duplicado e não promete entrega. |
| IV01 | Implementado | Fonte/testes | Sessão identificada; contexto do convite é validado antes de permitir aceite. |
| IV02 | Implementado | Fonte/testes | Entrar/Criar conta são modos claros, com empresa/função após autenticar destinatário. |
| IV03 | Implementado | Fonte/testes | Convite inválido/expirado/revogado/aceito tem estado e continuidade. |
| IV04 | Implementado | Fonte/testes | Após aceite, orientação e link para completar perfil. |
| EM01 | Implementado | Fonte/testes | Estados legados de confirmação têm resultado específico. |
| EM02 | Implementado | Fonte/testes | Resultado persistente evita toast duplicado. |
| ST01 | Implementado | Fonte/testes | 403 distingue empresa de administração da plataforma. |
| ST02 | Implementado | Fonte/testes | Voltar ao espaço autorizado é prioridade; troca de conta é secundária. |
| ST03 | Implementado | Fonte/testes | Links contextuais sem recomendar backoffice a visitante. |
| ST04 | Implementado | Fonte/testes | Orientação decorativa genérica removida. |
| ST05 | Implementado | Fonte/testes | FAQ rotulado como Central de ajuda; suporte mantém resolvedor configurado. |
| ST06 | Implementado | Fonte/testes | Detalhes de atualização ficam recolhidos, horário e estado permanecem. |
| DS01 | Implementado | Fonte/testes | Demonstração viva de edição, guarda de navegação e diálogo. |
| DS02 | Implementado | Fonte/testes | Demonstração 0/1/2/11 registros, busca, paginação e modos. |
| DS03 | Implementado | Fonte/testes | Escala legível compartilhada e demonstrações atualizadas. |
| DS04 | Implementado | Fonte/testes | Densidade/ajuda/erro demonstrados nos componentes reais. |
| DS05 | Implementado | Fonte/testes | FormActions demonstrado e consumido nos editores operacionais. |
| DS06 | Implementado | Fonte/testes | Contrato diagnóstico/rascunho/publicação documentado e demonstrado. |
| DS07 | Revisado existente | Fonte/testes | Primitivo de camadas mantido; testes de borda/foco na galeria sem criar implementações por página. |

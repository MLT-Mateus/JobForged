# Etapa 2.5 — padronização visual em Test

Data: 19/10/2026. Ambiente: `https://test.jobforged.com`.

## Base e escopo

Checkout confirmado: `C:\Users\suporte01\Documents\JobForged`, remoto oficial `MLT-Mateus/JobForged`. A pasta do OneDrive contém os documentos de planejamento, não o checkout. Os dois documentos de continuidade/planejamento e o `AGENTS.md` foram lidos. Não há `AGENTS.md` adicional sob as áreas alteradas.

Árvore inicialmente limpa em `develop`. A base foi atualizada de `15d7a36` (PR #71) para `2e7aee052ee821b250e0fa4eb9c05a0fe38f458f`, preservando a atualização posterior dos sons padrão. Branch desta etapa: `feat/test-workspace-layout-25`.

Somente apresentação e comportamento de UI existente. Nenhum endpoint, autorização, migration, dado empresarial, arquivo de áudio ou workflow foi alterado. A etapa 2.6 e as Frentes 3/4 não foram iniciadas.

## Inventário das rotas

| Rota | Estado preservado | Revisão e aplicação |
|---|---|---|
| `/app/home` | Beta; contexto demonstrativo | Cabeçalho e títulos dos painéis compartilhados, espaçamento e cartões; ação de histórico sem fluxo marcada indisponível. O alias `/home` usa o mesmo componente. |
| `/app/dashboards` | Em breve; conteúdo inerte | Shell, cabeçalho, superfícies, tipografia e estados herdados da biblioteca. Gráficos/números continuam sendo exemplos. |
| `/app/vagas` | Beta; armazenamento no navegador | Toolbar, menu de ações acessível, confirmação de exclusão, grade e estados vazios preservados. |
| `/app/vagas/nova` | Beta; armazenamento no navegador | Cabeçalho com retorno/metadados, etapas sem rolagem lateral obrigatória, campos compartilhados, calendário, confirmação de limpeza e janela de prévia ampla. |
| `/app/vagas/[jobId]/editar` | Beta; mesmo wizard | Mesma implementação e mesmas mudanças da criação; rascunhos e dados locais preservados. |
| `/app/vagas/[jobId]` | Beta | Cabeçalho, abas, carregamento distinto de registro ausente, erro de leitura, drawer e confirmações compartilhados. As seções futuras continuam inertes. |
| `/app/vagas/[jobId]/preview` | Beta; reutiliza o detalhe | Recebe os ajustes do detalhe. Esta rota ainda não é uma página de candidato independente; pendência funcional registrada abaixo. |
| `/app/candidaturas` | Em breve; conteúdo inerte | Estrutura e apresentação compartilhadas; nenhuma candidatura real foi implementada. |
| `/app/agenda` | Em breve; conteúdo inerte | Estrutura, espaçamento, botões e superfícies preservando a indisponibilidade. |
| `/app/personalizacao` | Beta; prévia local | Cabeçalho, sete abas, dropdowns/calendários, espaçamentos dos grupos, histórico/diferenças/confirmações e ampliação da prévia pelo mesmo `WidgetDialog`. |
| `/app/administradores` | Beta; API real da empresa | Seletor de função aprovado, mesmos limites de papéis, estados de carregamento/erro e formulário de convite; sem mudança de autorização. |
| `/app/financeiro` | Em breve; conteúdo inerte | Superfícies, cabeçalho e apresentação compartilhados; nenhum pagamento implementado. |
| `/app/configuracoes` | Beta; API real da empresa | Grade, formulários, cabeçalhos de painéis, estados e rótulos legíveis do histórico. |
| `/app/minha-conta` | Beta; API real da conta | Grade, formulário, cabeçalhos, rótulo de função e estado de carregamento. Validação nativa do campo obrigatório preservada. |
| `/backoffice` | Visão administrativa existente | Cabeçalho, métricas, lista real de empresas, estado de carregamento/erro e rótulos de plano. Só existe esta rota de backoffice; nenhuma nova gestão foi criada. |

## Divergências corrigidas

- Cabeçalhos próprios de Home, personalização e vagas divergiam em ordem, dimensões, retorno e ações: agora usam `WorkspacePageHeader`.
- A ausência de personalização também aplicava Montserrat ao texto corrido do painel. O padrão volta a herdar Montserrat/Open Sans dos tokens; uma escolha local já existente continua sendo respeitada.
- Regras repetidas de acabamento em `admin.css`, cabeçalhos antigos e estilos próprios de modal/menu foram removidos ou substituídos pela biblioteca.
- As abas de personalização e detalhe e o seletor de etapas deixam de exigir uma faixa horizontal para terminar a navegação em telas pequenas.
- O seletor nativo de função da equipe e os seletores/calendários das prévias passam a usar os controles aprovados.
- Confirmações do navegador e overlays próprios passam a usar `WidgetDialog`, inclusive histórico, comparação, drawer e prévia ampla. O bloqueio da rolagem é contado entre janelas sobrepostas e só é liberado ao fechar a última.
- A leitura inicial de uma vaga não mostra mais o estado de registro ausente enquanto o carregamento ainda está em andamento.
- Códigos conhecidos de plano, função e auditoria recebem rótulos de apresentação em português; os valores persistidos permanecem iguais.

## Fontes compartilhadas

- `app/components/ui/AdminPrimitives.tsx`: `WorkspacePageHeader`, `Panel`, `PanelHeading`, `MetricCard`, `StatusBadge`.
- `app/components/ui/WorkspacePatterns.tsx`: `WorkspaceState`, `WorkspaceTabs`, `WorkspaceActionMenu`.
- `app/components/ui/Widgets.tsx`: `WidgetDialog`, tamanho amplo e coordenação da rolagem de janelas sobrepostas.
- `app/components/ui/ui.css`: pilhas, grades, toolbar, cabeçalhos, estados, abas e menus com tokens oficiais.
- `/design-system/componentes`: demonstrações dos mesmos componentes, incluindo janela ampla e confirmação sobreposta.
- `WorkspaceShell`: continua sendo a estrutura comum, com menu e logout no cabeçalho. O backoffice continua usando o mesmo shell.

## Validação

- TypeScript e lint locais executados; resultados finais registrados na entrega e no CI do PR.
- No navegador local, os componentes reais do catálogo foram usados para testar janela ampla, janela sobreposta, Escape, foco de retorno e liberação da rolagem. Não foi criado bypass de autenticação nem uma cópia das telas com dados falsos.
- A sessão de plataforma disponível em Test permite a conferência do backoffice. A sessão empresarial é uma cobertura separada; sua ausência não será apresentada como teste ponta a ponta concluído.
- CI obrigatório: lint, tipos, build, testes existentes, validação de páginas/assets e Docker. Integração em `develop` somente após aprovação desses checks; imagem e deploy de Test pelo workflow existente.
- SHA publicado, resultado do healthcheck e cobertura visual final são apresentados na entrega desta etapa.

## Limitações existentes fora deste escopo

1. Home, indicadores, candidaturas, agenda e financeiro continuam demonstrativos ou Em breve conforme os marcadores existentes.
2. Vagas e personalização continuam locais ao navegador. A persistência empresarial, a publicação pública e o White Label completo pertencem às Frentes 3/4.
3. `/app/vagas/[jobId]/preview` já reutilizava `JobDetailClient`; a prévia visual de candidato está no wizard. A implementação de uma rota pública independente não foi iniciada nesta revisão.
4. `AdminShell` já lê a prévia visual publicada de uma chave local global (`jobforged.customization.published.v2`), sem separação dessa chave por companhia. Isso pode reaplicar uma aparência local ao trocar de empresa no mesmo navegador; não representa isolamento de dados do servidor. Deve ser resolvido na personalização persistente por empresa.
5. Não foram exercidas operações reais de convite, suspensão, alteração cadastral ou recuperação para produzir evidências visuais. Os endpoints e as verificações de papéis não foram modificados.

## Roteiro de auditoria do usuário

1. Em Test, entre como empresa e confira Home, Vagas, Personalização, Administradores, Configurações e Minha Conta nos dois temas.
2. Em uma prévia de vaga descartável, confira etapas, dropdowns, calendário e Modo candidato; feche com Escape e confirme o retorno do foco. Cancelar a limpeza/exclusão deve preservar os dados.
3. Em Personalização, abra histórico, diferenças e confirmação; feche as janelas e confirme que a página volta a rolar. Não é preciso aplicar uma alteração para auditar o layout.
4. Confira os marcadores Beta/Em breve e que os módulos futuros continuam sem interação com dados.
5. Na conta administrativa da plataforma, confira `/backoffice` em desktop e celular. Valide a etapa 2.5 antes de autorizar a 2.6.

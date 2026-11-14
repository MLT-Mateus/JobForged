# Revisão visual do painel empresarial — 14/11/2026

Referências: Design System (Empty States e biblioteca UI), Administradores e Aparência aprovados.

## Inspeção no Test antes da correção
- Home: banner antes do título dominava a primeira tela; setup continha mensagens antigas de fluxo indisponível.
- Candidaturas: filtros com pesos iguais, alternador invertido em relação à referência, paginação e exportação sem resultados.
- Agenda: filtros desproporcionais, calendário desalinhado ao padding dos cartões, datas em uma única coluna no modal largo.
- Dashboards: funil quebrava em sete cartões e um cartão isolado.
- Financeiro: busca e situação tinham pesos iguais; estado vazio não compacto.
- Filiais, Vagas, Minha conta, Configurações e Aparência: inspecionadas as telas principais; composição existente preservada. Ajustados resumo singular e paginação vazia de Filiais e cabeçalho duplicado de preferências em Configurações.

## Correção compartilhada
- Filtros e resumo aprovados de Administradores promovidos para `jf-directory__*` na biblioteca UI, usados também por Filiais, Candidaturas, Agenda e Financeiro.
- `MetricGrid`, `EmptyState compact`, `Panel`, `PanelHeading`, `CollectionViewSwitch` e tokens `--jf-ui-*` reutilizados.
- Banner compacto no catálogo de Widgets; filtro/resumo/estado vazio no catálogo de Dashboards.
- Banner da Home após título e indicadores, com imagem inteira e altura máxima de 240px.
- Funil em quatro colunas, duas em telas menores; espaçamentos internos alinhados ao cartão.
- Nenhuma mudança em registros de clientes, pagamentos, permissões ou envios de e-mail durante a revisão.

## Limites da inspeção
A sessão autenticada expirou após a inspeção inicial. A revisão pós-publicação das telas protegidas depende da renovação dessa sessão. Não foram exercitados estados com candidaturas reais, convites ou decisões sobre candidatos. As verificações automatizadas e o SHA publicado são conferidos no fluxo de PR/deploy.

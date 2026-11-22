# Estrutura do painel e Agenda — 14/11/2026

- Cabeçalho externo com título, descrição e ação principal. Listagens de Administradores, Filiais, Vagas e Candidaturas começam pelos filtros, seguidos de resumo/visualização e resultados. Faturas e histórico seguem filtros → resumo → dados.
- Agenda: filtros por entrevista, candidato ou cargo, período inclusivo com duas datas e horário de Brasília. Calendário mensal com eventos, navegação, hoje, seleção de dia e lista do período. Entrevistas sem data permanecem acessíveis na lista sem filtro de período.
- Dashboards: gráficos de distribuição por etapa, volume mensal, vagas mais procuradas e situação das vagas. Dados reais por padrão; demonstração opcional identificada, sem persistir dados fictícios.
- AuthShell compartilhado por login, registro, recuperação/redefinição, confirmação de e-mail, convite e fallback de conta do candidato. Páginas de erro continuam com o SystemPage existente e cabeçalho/tema.
- Perfil: resumo de identidade e vínculo, segurança agrupada e confirmação por senha por último na troca de e-mail.
- Biblioteca compartilhada: RecruitmentCalendar, RecruitmentBarChart, Panel, MetricGrid, EmptyState, WorkspacePageHeader, filtros/resumo e tokens jf-ui. Exemplos atualizados em CommunicationsDemo do Design System.

## Verificação
Lint dos arquivos alterados e três testes do filtro da agenda aprovados. Checagem de tipos local apontou apenas erro preexistente em outputs/review/main.tsx (arquivo ignorado); a compilação limpa é validada pelo CI. Testes de HTML público cobrem o cabeçalho e tema nas rotas de autenticação. Não foram enviados e-mails nem alterados registros de clientes.

A conferência visual foi interrompida pelo usuário e a alternativa de navegador isolado não está disponível. Por solicitação do usuário, não utilizar janelas em primeiro plano. Conferência visual autenticada após publicação permanece pendente; não confundir validação automática com aprovação visual.

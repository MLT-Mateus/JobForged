# Painel empresarial integrado — Test

## Fluxos implementados

- Home e Dashboards usam indicadores e atividades da empresa.
- Vagas preservam as filiais selecionadas, recebem contagens reais de candidaturas e oferecem configurações de recebimento, currículo e alertas.
- Candidatos autenticados enviam candidatura com consentimento, compartilham uma versão do currículo e acompanham seus processos. A desistência afeta somente a vaga selecionada.
- Candidaturas têm etapa, observações, motivo da decisão e histórico próprios. Mover para Entrevista gera um compromisso a agendar.
- Agenda mensal reúne entrevistas e compromissos, responsável, horário de Brasília e link de reunião. Impede sobreposição para o mesmo responsável; permite reagendar, concluir e cancelar.
- Convite por e-mail usa a marca publicada da empresa e Powered by JobForged. O envio exige ação explícita. O endereço padrão do Meet é ilustrativo, não cria uma reunião. O serviço de e-mail precisa estar configurado no ambiente; falhas são informadas.
- Alertas internos consultados pelo aplicativo incluem candidatura, mudança de etapa, entrevista no dia e a dez minutos. Não são notificações push quando o navegador está fechado.
- Administradores têm permissões por ação, verificadas nos procedimentos do banco e na interface. Titular não pode ser alterado pelo gerenciamento de administradores. Convites não concedem acesso superior ao do remetente.
- Financeiro é a única área operacional com dados fictícios: plano Básico de R$ 288/mês, cartões mascarados, faturas e regularização simulada. Acesso do titular ou permissão finance.view. Nenhuma transação financeira é executada.
- Limitações comerciais não são aplicadas nesta etapa. Limites técnicos de segurança e upload já existentes continuam ativos.

## Design System

Reutilizados Panel, PanelHeading, campos com label, SelectField, WidgetDialog, StatusBadge, EmptyState, CollectionView, WorkspacePagination, MetricCard e AppToast. Calendário mensal compartilhado incluído na biblioteca e no catálogo do Design System. Modelo de convite também disponível no catálogo. Cores, tipografia e espaçamentos herdam os tokens da empresa.

## Validação

Os testes SQL usam empresas sintéticas em banco descartável: isolamento, consentimento, candidatura duplicada, decisão independente por vaga, concorrência, agenda, lembretes e restrições de permissão. Testes de interface de servidor verificam sessão, origem, empresa, versão e candidatura em domínio personalizado. Nenhum e-mail real é enviado pelos testes.

A publicação segue PR para develop, verificações obrigatórias e deploy Test com gate de backup/restauração e migrations. Live não integra este escopo. A navegação visual local esteve indisponível durante esta execução; não apresentar os testes automatizados como revisão visual manual.

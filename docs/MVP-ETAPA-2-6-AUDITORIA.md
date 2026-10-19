# Etapa 2.6 — Backoffice JobForged (Test)

## Base e inventário

Base: etapa 2.5, PR #73, SHA Test `fb429d4df3ec0826176a8fa4775e500f8750471b`, saúde confirmada antes da implementação. Checkout oficial `C:\Users\suporte01\Documents\JobForged`, origin `MLT-Mateus/JobForged`, árvore limpa; branch `feat/test-backoffice-management-26`. Instruções do repositório e documentos de continuidade/planejamento consultados. Nenhuma mudança em Live ou nas Frentes 3/4.

Existia apenas `/backoffice`, com contagem de empresas/vínculos e últimas 20 empresas. Já existiam autenticação verificada, papel persistido `platform_admin`, cadastro empresarial, membros, convites com hash e uso único, RLS e auditoria empresarial. Não existiam gestão administrativa global, suspensão empresarial ou configurações persistidas da plataforma.

## Páginas e operações implementadas

| Página | Funcionalidade |
|---|---|
| `/backoffice` | Empresas totais/ativas/suspensas, identidades distintas vinculadas, vínculos totais, convites pendentes/expirados. Definição de cada indicador na interface. Link para atividades reais. |
| `/backoffice/empresas` | Busca por nome/CNPJ, situação, paginação de 25, detalhes. |
| `/backoffice/empresas/[id]` | Dados cadastrais, plano registrado sem cobrança/edição de assinatura, membros, últimos 25 convites, histórico, edição cadastral, suspensão/reativação com motivo. |
| `/backoffice/usuarios` | Busca por pessoa/e-mail/empresa; identidade, verificação de e-mail, papel e vínculo. Edição de papel/estado com motivo, mantendo responsável ativo. |
| `/backoffice/convites` | Busca, situação, filtro por empresa via detalhes, paginação; reenvio com novo token e revogação. Criação pelo detalhe da empresa. |
| `/backoffice/configuracoes` | Nome da plataforma, e-mail de contato e URL HTTPS de suporte. Motivo obrigatório e auditoria. |
| `/backoffice/auditoria` | Busca por ação/motivo/empresa, filtro por empresa via detalhes, paginação e detalhes com autor identificado, alvo e antes/depois disponíveis. |

Listagens são ordenadas por data e ID. Estados de carregamento, vazio, erro, atualização e paginação usam os componentes compartilhados. O shell, tabelas, campos, dropdowns, notificações/sons, confirmações e foco são os aprovados na 2.5; não há logout no menu lateral.

## Permissões e efeitos

| Identidade | Consultar gestão global | Alterar gestão | Configuração pública |
|---|---|---|---|
| Visitante | Não | Não | Apenas nome/contato/URL de suporte |
| Conta empresarial | Não; mantém seu contexto e RLS | Apenas operações empresariais previamente autorizadas | Mesmos três campos públicos |
| Administrador verificado com papel concedido no banco | Sim | Operações permitidas, com motivo e auditoria | Sim |

Nenhum novo administrador foi criado. Não existe atribuição de papel de plataforma pela interface ou cadastro público. APIs e RPCs exigem o papel; mutations também exigem mesma origem. O ator vem de `auth.uid()`, não do corpo da requisição. Nenhuma service-role key no cliente ou nas APIs da aplicação.

- Suspender empresa bloqueia consultas RLS, contexto empresarial, operações autorizadas por papel e aceitação/validação de convites, inclusive chamadas diretas ao banco. Preserva contas/dados e não modifica plano nem identidade global. Reativar restaura os vínculos ainda ativos.
- Inativar vínculo afeta só aquela empresa. A restrição existente de uma empresa ativa por identidade permanece. O último titular ativo não pode ser removido; trigger serializa alterações por empresa, inclusive fora da API do backoffice.
- Convites usam hash SHA-256, destinatário confirmado, validade de 24h e uso único. Reenvio invalida links anteriores. Falha de entrega provoca tentativa de revogação e informa seu resultado. Token nunca é devolvido pela API à UI nem incluído na auditoria.
- Não existe exclusão definitiva, impersonação, bloqueio global de identidade, cobrança ou editor de segredos/SQL.

## Configurações e consumidores

`platform_settings` possui uma linha, valores padrão e data de alteração. Nome aparece no shell do backoffice; e-mail e URL alimentam o botão de suporte do cabeçalho dos painéis empresarial e administrativo. O Design System não recebe esse botão. Valores são relidos ao abrir os painéis; configurações salvas atualizam imediatamente o título do backoffice. O remetente Brevo/SMTP permanece independente.

O endpoint público `/api/platform/settings` só retorna esses três campos, sem dados de contas, infraestrutura ou segredos. URL validada como HTTPS; nenhum fetch do servidor é feito para esse endereço.

## Arquivos e banco

- `supabase/migrations/0007_platform_management.sql`: estado operacional, configurações, auditoria global, funções protegidas, proteções de vínculo e suspensão. Migrations anteriores preservadas.
- `app/api/backoffice/route.ts`: leituras/mutations administrativas, validação e entrega compensada de convites.
- `app/api/platform/settings/route.ts`: apenas configurações públicas permitidas.
- `app/backoffice/page.tsx`, `app/backoffice/[...path]/page.tsx`: proteção no servidor e rotas.
- `app/components/admin/BackofficeManagementClient.tsx`, `backoffice-model.ts`: apresentação e gestão. Substitui o antigo `BackofficeClient`.
- `app/components/ui/WorkspaceShell.tsx`, `admin/AdminModuleClient.tsx`: consumo opt-in do canal de suporte; `admin.css`: detalhes e auditoria com tokens compartilhados.
- `tests/backoffice-security.sql`: testes reais transacionais, sempre rollback; `tests/backoffice-api.test.mjs`: API com Auth/Brevo simulados exclusivamente no processo de teste; `package.json`: inclui esse teste no CI.

Backup Test verificado: `/opt/jbfd/backups/supabase/test-20261019T165120Z`, com dump, Storage, checksums e verificação de gzip/tar. A migration deve ser registrada pelo runner versionado, com checksum, e conferida com `--check` antes do deploy. A aplicação em Live depende de autorização/backup próprios e não foi realizada.

## Verificações

Testes SQL executados contra o banco Test em transação com rollback: isolamento entre duas empresas, negação de RPC administrativa, proteção de auditoria, validações, último titular, edição, configurações, criação/reenvio/revogação/aceitação única/expiração de convites, suspensão/RLS/perfil e reativação. Nenhum e-mail foi enviado; fixtures usam `example.invalid` e foram revertidas.

Build e 12 testes locais passaram, incluindo API sem sessão/conta empresarial, origem externa, campos inválidos, retorno sem token e falha de entrega com revogação. Lint/tipos e resultados finais do CI/deploy são confirmados na entrega, assim como SHA/healthcheck.

## Limites e auditoria manual

- A sessão de plataforma disponível anteriormente expirou. Não criar sessão por bypass nem usar credenciais de Live. A conferência visual autenticada, entrega real de convite e persistência em uma nova sessão humana devem ser distinguidas dos testes automatizados e registradas como pendentes se não houver sessão disponível.
- Usuários são apresentados pelos vínculos empresariais; identidades sem qualquer vínculo não são administradas globalmente. Não há edição de identidade Auth, reset administrativo de senha nem exportação.
- No detalhe, convites mostram os últimos 25; a listagem completa possui paginação. Histórico anterior preserva os detalhes existentes, que não continham antes/depois em todas as ações.
- Nome da plataforma não altera automaticamente textos institucionais/legais ou a marca personalizada de clientes. Não há White Label persistente nesta etapa.

Roteiro: entrar com a conta administrativa em Test; revisar indicadores e cada listagem; buscar/filtrar/paginar; abrir empresa; conferir formulários e cancelar sem alterar clientes reais; usar apenas empresa de teste autorizada para edição/suspensão/reativação e convites; verificar auditoria; conferir temas claro/escuro e celular. Validar a 2.6 antes de qualquer frente seguinte.

# MVP Test — Frente 1: disponibilidade dos módulos

Data da auditoria: 15/10/2026. Escopo: `test.jobforged.com`, branch `develop`. Este inventário descreve o código e as verificações públicas de Test; não substitui uma auditoria com uma conta empresarial autenticada.

## Critério

- **Pronto:** fluxo confirmado de ponta a ponta, incluindo autorização, API e persistência apropriada.
- **Beta:** há interação utilizável, com limite explícito na interface.
- **Em breve:** a tela é demonstração ou não há fluxo real. A prévia fica visível, mas seus controles internos não podem ser acionados.

## Inventário do aplicativo

| Módulo e rota | Estado | Evidência e limite |
| --- | --- | --- |
| Home `/app/home` | Beta | `app/home/service.ts` usa `mockHomeByOrganization`, `mockOrganization` e `mockUser`. Indicadores, atividades e organização não vêm da conta autenticada. |
| Dashboards `/app/dashboards` | Em breve | `AdminModuleClient.tsx` usa dados fixos de `admin-data.ts`; não há API de indicadores nem persistência de filtros. |
| Vagas `/app/vagas`, `/nova`, `/:id`, `/:id/editar`, `/:id/preview` | Beta | `job-service.ts` mantém vagas e rascunhos em `localStorage`. Busca, cadastro, edição, duplicação e estados podem ser experimentados no mesmo navegador. Não há API/banco de vagas ou rota pública funcional para candidatura. “Publicada” é somente um estado local. |
| Subtelas da vaga: candidaturas, automações e configurações | Em breve | Há dados e controles simulados no detalhe da vaga; essas prévias têm marcador próprio e controles inertes. Visibilidade pública, SEO e recebimento de candidaturas não operam. |
| Candidaturas `/app/candidaturas` | Em breve | Candidatos fixos em `admin-data.ts`; sem API, recebimento ou persistência de candidaturas. |
| Agenda `/app/agenda` | Em breve | Eventos e calendário de exemplo em `AdminModuleClient.tsx`; sem agendamento persistido. |
| Personalização `/app/personalizacao` | Beta | `personalization-service.ts` salva tema, ativos e histórico em `localStorage`. A prévia funciona no navegador, mas não publica para a equipe nem para portal público. Domínio/SSL mostrados no painel são simulados. |
| Administradores `/app/administradores` | Em breve | Equipe fixa em `admin-data.ts`; sem convites, permissões editáveis ou API de gestão. |
| Financeiro `/app/financeiro` | Em breve | Plano, consumo e faturas fixos em `admin-data.ts`; sem integração de cobrança ou API financeira. |
| Configurações `/app/configuracoes` | Em breve | Dados e ações de exemplo em `AdminModuleClient.tsx`; sem gravação na organização real. |
| Minha conta `/app/minha-conta` | Em breve | Perfil de exemplo em `admin-data.ts`; edição de perfil e segurança sem API. O botão **Sair** do shell é separado e usa a API de autenticação. |
| Notificações no cabeçalho | Em breve | Sino sem caixa de notificações/API; fica desativado e identificado. |

Nenhum dos dez módulos do painel atende hoje ao critério **Pronto**. Os itens sem marcador normal são apenas os controles do shell cuja ação é implementada, como navegação e saída da conta; a saída ainda carece de verificação com sessão empresarial real nesta auditoria.

## Entrada, autenticação e persistência

| Fluxo | Constatação |
| --- | --- |
| Site público `/` | Página respondeu HTTP 200 em Test. Conteúdo estático e navegação pública não foram classificados como módulos do painel. |
| Cadastro e login | Existem endpoints `/api/auth/*`, sessão em cookie HttpOnly e consulta de vínculo empresarial no backend. `/api/auth/config` em Test reportou `enabled: true`; `/api/auth/session` sem sessão retornou 401. Cadastro/login completos, confirmação de e-mail e isolamento de dados com duas contas não foram exercitados aqui; não há evidência suficiente para declarar **Pronto**. |
| Proteção do painel | `useCompanyAuthSession` valida a sessão no cliente antes de mostrar as páginas. A API de sessão exige autenticação, mas o conteúdo operacional de muitos módulos ainda vem de mocks ou `localStorage`, sem vínculo persistido no servidor. |
| APIs de produto | A árvore `app/api` contém autenticação e healthcheck. Não há endpoints do app para vagas, candidaturas, personalização, indicadores ou gestão de empresa. |
| Banco | O Supabase self-hosted serve à autenticação/vínculos empresariais. Dados de vagas e personalização auditados nesta frente não são persistidos nele. |

## Mudança de apresentação nesta frente

O menu e o topo de cada módulo usam o mesmo mapa de disponibilidade e o `StatusBadge` compartilhado. Módulos e subtelas **Em breve** continuam como prévia visual, com ações internas inertes. Módulos **Beta** trazem o limite concreto do armazenamento local ou dos dados de exemplo. Textos de publicação de vaga e personalização passaram a indicar prévia local; o botão fictício de candidatura na prévia foi desativado. Nenhuma funcionalidade de negócio ou schema de banco foi criada.

## Pendências para próxima auditoria

- Testar cadastro/login com uma conta empresarial autorizada, incluindo confirmação de e-mail, RLS e saída.
- Verificar visualmente menu e avisos dentro de uma sessão autenticada em Test após o deploy. A verificação pública não atravessa o login.
- Frentes 2–4 seguem fora do escopo desta entrega.

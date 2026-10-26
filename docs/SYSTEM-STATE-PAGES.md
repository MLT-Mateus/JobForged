# Telas de estado da aplicação

Implementação de 26/10/2026, exclusivamente para Test pelo fluxo de PR e CI.

## Inventário e comportamento

- A 404 já existia. Sua composição visual foi preservada e extraída para `app/components/system/SystemPage.tsx`, compartilhada pelos cinco estados.
- `/401`, `/403`, `/404`, `/500` e `/503` são endereços públicos de consulta e retornam os respectivos códigos HTTP. Abertura dessas páginas não causa erro real, manutenção, alteração de permissão ou encerramento automático da sessão.
- `not-found.tsx` cobre endereços inexistentes. `unauthorized.tsx` e `forbidden.tsx` cobrem interrupções de autenticação e autorização. Os guards de páginas do backoffice agora distinguem visitante (401) de conta empresarial sem acesso administrativo (403).
- `error.tsx` e `global-error.tsx` oferecem recuperação de falhas inesperadas, sem exibir stack, tokens ou mensagens internas. O botão usa `reset` no boundary e recarrega nas rotas de consulta.
- O guard empresarial existente continua validando a sessão via API. Após perda da sessão, leva a `/401?next=...`; conta incompatível leva a 403. Não foram alteradas regras de autorização de APIs, banco, MFA ou permissões empresariais.
- A 401 leva ao login com retorno interno validado. Destinos externos, protocolos, escapes e parâmetros sensíveis são rejeitados; o retorno é apenas um caminho empresarial/backoffice. As permissões continuam sendo verificadas no destino. Cadastro permanece no fluxo empresarial existente, incluindo confirmação de e-mail.
- Na 403, trocar de conta exige clique e confirmação do endpoint de logout. Falha de revogação é mostrada sem afirmar que a sessão foi encerrada. A orientação para pedir permissão não cria convites nem eleva privilégios.
- A busca da 404 filtra um catálogo local de páginas públicas por título e termos; não consulta dados de empresas, vagas ou candidatos.
- A 500 e a 503 consultam uma vez as configurações públicas existentes para oferecer o canal real de suporte (HTTPS ou e-mail), com timeout de cinco segundos e fallback para o FAQ. Não há polling.
- A 503 informa previsão “a confirmar”, pois não existe previsão operacional configurada. O link de status abre o healthcheck real. Não foi agendada manutenção nem simulada uma indisponibilidade da infraestrutura. Se o próprio servidor/proxy estiver indisponível, uma tela React depende de fallback no proxy; esta mudança não altera Traefik nem cria essa garantia.
- Design System → Aplicação (`/design-system/aplicacao`) documenta e abre as cinco rotas. A seção foi reintroduzida por solicitação explícita neste pedido, sem recuperar o conteúdo antigo removido.

## Fonte visual compartilhada

`ActionButton` / `.jf-action`, `TextField`, `EmptyState`, `Panel`, `ThemeSelector`, ativos oficiais e tokens `--jf-ui-*`. Temas claro/escuro, links e controles acessíveis e composição em uma coluna no celular. Não há nova biblioteca visual ou migration.

## Auditoria curta

1. Abrir as cinco rotas e conferir ações e respectivos status HTTP.
2. Abrir endereço inexistente e buscar “vagas” e um termo sem resultado na 404.
3. Como visitante, abrir o backoffice: 401. Entrar a partir da tela e conferir retorno autorizado.
4. Com conta empresarial sem acesso ao backoffice, conferir 403; trocar de conta apenas quando desejar encerrar sua sessão.
5. Alternar tema e reduzir a largura para celular. Conferir Design System → Aplicação.
6. Na 503, consultar o healthcheck; a simples abertura da rota não altera a disponibilidade do serviço.

Resultados de CI, PR e SHA publicado ficam no registro de entrega; não confundir testes locais/isolados com execução usando contas reais.

# Estados vazios e painel de notificações compartilhados

- EmptyState da aplicação incorporado ao catálogo Empty States e ícone Inbox
  registrado na biblioteca de ícones. Variações standard, compact e inline usam
  o mesmo componente/tokens; o catálogo ilustrado anteriormente aprovado permanece.
- WorkspaceState vazio delega ao EmptyState, evitando uma segunda implementação.
- Ícones semânticos: sino em alertas; imagem em banners; megafone em comunicados;
  empresa/busca, pessoas, convite, histórico, vagas e versões nos contextos respectivos.
- NotificationPanel compartilhado entre NotificationBell (Home, demais páginas
  empresariais e backoffice) e demonstração do Design System. Nenhuma cópia de
  layout por página. Estados vazio, carregando, erro e conteúdo usam os componentes
  compartilhados; demonstração mock não consulta nem envia comunicações reais.
- Caixa vazia com sino, título e descrição centralizados. Sem paginação quando
  não há conteúdo na primeira página. Cabeçalho, cards, metadados, mensagens e
  ações usam alinhamentos e espaçamentos dos tokens; controles de leitura e links
  preservados. Nenhuma alteração de autorização, destinatários ou banco.

A publicação segue PR/CI/develop/Test. Verificações e evidências finais são
registradas no PR e nos documentos externos de continuidade. Live preservado.

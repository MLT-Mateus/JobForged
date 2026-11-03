# Acesso empresarial e estrutura pública — 03/11/2026

Complementa o PR144 antes de sua integração. Somente Test; LP mantém rotas e formulário de acesso próprios.

- PublicPortalAccount: acesso anônimo em WidgetDialog modal, com login como estado inicial a cada abertura; cadastro e recuperação por links de texto, sem abas. A recuperação usa a API existente, com limites e resposta genérica preservados. Drawer permanece apenas para notificações e perfil autenticado. Demonstrações não enviam solicitações reais.
- ProportionalImage: primeiro plano usa contain, preservando a imagem integral; cópia decorativa da mesma fonte, inacessível ao leitor de tela, recebe blur estático e camada de vidro. Sem canvas, geração de cópias, animação contínua ou requisição periódica. Aplica-se a imagem padrão e uploads autorizados, no hero e banners; não expõe rascunhos nem muda permissões de Storage.
- Panorama mantém texto à direita em telas largas; em telas estreitas organiza imagem e texto em sequência. A opção legada fit permanece no dado/histórico, mas o editor deixa de oferecer enquadramento que cortaria a imagem.
- Tokens públicos refletem LP: cabeçalho78px/70px, largura máxima1180px, margem24px/16px, logos184px/155px/142px conforme breakpoint; rodapé SiteFooter compartilhado com padding70px (40px estreito) e24px, grade mínima198px. São mínimos, não alturas que cortem conteúdo dinâmico. Cores empresariais permanecem próprias; fluxo LP não alterado.
- Widgets documenta cabeçalho, navegação lateral e compacta, rodapé, painel contextual, modal, Bottom Sheet, aviso temporário e ajuda contextual. Componentes e tokens aprovados continuam como fonte única.

Não alterar clientes reais nem enviar cadastro/recuperação para produzir evidências. CI, SHA, saúde e limitações são registrados na continuidade após publicação.

CI: o runner passou a selecionar Python sem wheel aprovado para PyYAML6.0.2 e recusou corretamente o pacote-fonte. O job SQL agora fixa Python3.12 via actions/setup-python oficial pinado e exige instalação binária, preservando todos os hashes existentes. O hash cp312/manylinux foi conferido na metadata oficial PyPI; nenhum hash de pacote-fonte foi adicionado.

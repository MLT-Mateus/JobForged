# Home e Comunicação interna — Test

## Escopo e base
Checkout oficial `MLT-Mateus/JobForged`, branch `feat/test-internal-communications`, base develop/Test `8786452764be30a2d8a00c62b47983d7cb8f675b`, árvore inicialmente limpa. AGENTS e continuidade consultados. Apenas Test.

## Home
- Aviso e indicador Beta removidos da Home e de seu item de navegação.
- Indicadores, configuração e atividades fictícios identificados como **mock**; saudação não utiliza mais nome de usuário demonstrativo.
- Até quatro KPIs. `MetricGrid` compartilhado: quatro colunas, duas no tablet, uma no celular estreito, tokens oficiais.
- Um único carrossel, alimentado por banners persistidos pelo backoffice. Não depende de localStorage nem dos banners empresariais.
- Imagens em 3:1, recomendado **1500 × 500 px**, com `object-fit: contain` para preservar o conteúdo sem deformar/cortar. Área visual e legenda têm medidas estáveis entre slides. Navegação manual, sem rotação automática. Até dez ativos, ordem configurável.
- Nenhum banner fictício é publicado automaticamente. Sem banners ativos, a seção não é exibida. Os dados empresariais antigos de personalização foram preservados e sinalizados como prévias; não alteram a Home.

## Backoffice
`/backoffice/comunicacao-interna`, protegido pelo papel administrativo já existente. Duas seções:
1. Banners: adicionar imagem, título, descrição, link HTTPS, ordem, situação ativa/inativa, edição com versão e prévia do componente real. Desativar preserva imagem/dados.
2. Notificações: criar/editar rascunho, consultar público elegível, confirmar publicação e acompanhar destinatários/lotes.

Públicos: todos os membros de empresas ativas; titulares/administradores dessas empresas; administradores JobForged. Destinatários deduplicados por identidade, e-mail verificado e situação ativa. Contas sem confirmação e empresas suspensas são excluídas. Candidatos permanecem **Em breve**, pois não existe cadastro autenticado funcional de candidatos; não se inferem candidatos a partir de contatos nem se implementa a Frente4.

Canais: alerta pessoal no aplicativo; e-mail; ambos. Após publicar, conteúdo/público são imutáveis. Alertas são disponibilizados para as contas selecionadas, com leitura persistida. Sino funciona no painel empresarial e no backoffice; atualização ao abrir/retomar foco e a cada minuto. Paginação de20.

E-mail: publicação prepara fila; envio exige ação explícita em lotes de até5. Cada tentativa é reivindicada atomicamente antes da chamada Brevo; não há repetição automática de resultados incertos. Falhas e tentativas sem confirmação ficam a conferir; pendentes podem ser processados em novos lotes. “Aceito” significa aceitação pelo provedor, não entrega/leitura comprovada. Não há worker permanente, webhook ou retentativa automática. Nenhum e-mail real foi enviado durante a implementação.

## Segurança e persistência
Migration nova imutável `0011_internal_communications.sql`. Quatro tabelas com RLS, sem acesso direto de anon/authenticated. RPCs conferem identidade e papel no servidor/banco. Empresa não administra comunicações nem acessa a caixa de outra identidade. Suspensão preservada. Alterações sensíveis e resultados de envio registrados na auditoria com autor do servidor.

Upload reaproveita o pipeline raster seguro: PNG/JPEG/WebP estático, até5MB/16MP, normalizado a PNG sem metadados; SVG/HTML/animações recusados. Bucket privado já existente e credencial restrita de servidor; metadados e prefixos de plataforma separados. Imagens inativas/rascunho só para administrador; empresas ativas acessam apenas imagens de banners ativos. Não há exclusão automática nem nova credencial.

Links são HTTPS validados; textos escapados. Template de e-mail `platform-communication` incorporado ao catálogo do Design System e consumido pelo envio real, com logo pública HTTPS, HTML compatível e texto alternativo. Segredos nunca enviados ao navegador.

## Arquivos e componentes
- `app/components/ui/CommunicationBanner.tsx`, `MetricGrid.tsx`, `communications.css`: componentes/tokens compartilhados, demonstrados em `/design-system/dashboards`.
- `app/components/admin/CommunicationsClient.tsx`, `NotificationBell.tsx`, `PlatformHomeBanners.tsx`, shells/modelos administrativos.
- `app/api/backoffice/communications/`, `app/api/communications/`: APIs autenticadas, gestão, imagens e lotes.
- `app/lib/communication-types.ts`, `communications-server.ts`, `platform-communication-email.ts`.
- `app/design-system/email-template-catalog.ts`, `CommunicationsDemo.tsx`, `DesignSystemClient.tsx`.
- `app/home/HomeClient.tsx`, `home.css`, aviso do editor empresarial.

## Operação e verificações
Backup verificado antes da aplicação: `/opt/jbfd/backups/supabase/test-20261019T190156Z`. Runner confirmou as onze migrations e checksums; nenhuma anterior foi editada.
Validação SQL real em transação revertida: administrador existente autorizado; membro empresarial negado na gestão; banner ativo legível; conflito de versão; seleção de titular e exclusão do membro no público de administradores; publicação idempotente; reivindicação única de e-mail com resultado incerto sem repetição; alerta individual e marcação de leitura; empresa suspensa negada. Contas/objetos de verificação revertidos, nenhum disparo externo.
Resultados de lint/types/build, CI, SHA e healthcheck são confirmados na entrega. Validação visual autenticada requer sessão empresarial/backoffice; não confundir demonstração pública com essa cobertura.

## Auditoria sugerida
1. Backoffice → Comunicação interna → adicionar dois banners diferentes; ativar e ordenar. Conferir o mesmo tamanho ao navegar na Home, desktop/mobile.
2. Home: quatro KPIs no máximo, marcações mock e ausência de Beta.
3. Criar comunicado de alerta para conta de teste autorizada; revisar público, publicar e conferir o sino e leitura após nova sessão.
4. Para e-mail, preparar comunicado apenas ao público autorizado; conferir mensagem e confirmar lote. Consultar resultados antes de qualquer nova campanha em caso de resultado incerto.
5. Confirmar membro sem acesso administrativo e dados preservados após desativar banner.

Live não alterado; Frente4 não iniciada.

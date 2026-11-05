# Status público e páginas do sistema

Implementação de 05/11/2026, destinada primeiro a Test.

- `/status` apresenta disponibilidade real, sem nomes de servidores, versões, erros ou credenciais. `/api/health` permanece o contrato técnico existente.
- `/api/status` usa verificações de Auth, banco/PostgREST e Storage pelo gateway privado. Apenas o processo BFF autorizado por rede acessa a sonda interna. Consultas são consolidadas por 15 segundos; a tela atualiza a cada minuto somente quando visível. Falhas são instabilidade, nunca sucesso fictício.
- O gate de manutenção responde diretamente com estado `maintenance`. Fora dele, a plataforma só é anunciada ativa se todas as verificações passarem. Não existe previsão de retorno inventada. A página depende da aplicação estar acessível; não substitui monitoramento independente de infraestrutura nem mede entregabilidade de e-mail.
- O catálogo em Design System → Aplicação é gerado de todos os `page.tsx` e seções do Design System no build; inclui padrões dinâmicos e informa autenticação. Não enfraquece as permissões. `/candidato` exige sessão de candidato e abre sua conta na empresa de origem, sem criar um novo painel de recrutamento.
- A migration 0042 reserva `status` e `candidato` em JS e banco; falha diante de endereço empresarial preexistente, preservando dados. Não modifica migrations anteriores.
- As janelas ilustrativas usam `WindowControls`: fechar vermelho #ff5f57, minimizar amarelo #febc2e e ampliar verde #28c840 nos dois temas.
- O ícone da aba usa somente o favicon 1:1 da empresa, validado e convertido para PNG 64×64. Ausente ou inválido: ícone 1:1 JobForged. Nunca converte uma marca horizontal para favicon. O original não é alterado.
- Banners públicos compartilham `CommunicationBanner` com Home: uma única área, ativos ordenados, setas laterais, sem legendas acrescentando altura. Padrão de 8 segundos, após carregamento da página/imagem; pausa fora da tela ou aba oculta. Não altera configurações nem arquivos de clientes.

## Verificação

Lint, TypeScript e 53 testes de aplicação/contratos; testes de sondas e gate de manutenção. CI acrescenta banco isolado com migrations/RLS, Auth/Storage reais e imagem Node. Verificações simuladas não substituem sondas reais de Test após deploy. Alterações em Live não autorizadas neste trabalho.

## Ajuste de dimensionamento dos banners

A seção empresarial usa as mesmas margens laterais do conteúdo de vagas, sem ocupar a largura do hero. O componente compartilhado CommunicationBanner usa ProportionalImage: imagem inteira com contain e extensão decorativa desfocada nas sobras; caixa com proporção fixa e slides posicionados em toda a área. As regras genéricas de miniaturas de marca não limitam a imagem do banner. Originais e arquivos de clientes não são alterados. Exemplo interativo em Widgets do Design System, com duas proporções.

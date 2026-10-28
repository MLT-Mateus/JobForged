# Alertas compartilhados — Backoffice e painel empresarial

Atualização de 28/10/2026, escopo exclusivo Test.

## Diagnóstico e correção

Resultados de ações apareciam como parágrafos sem apresentação, blocos inline duplicados com toast e erros repetidos dentro/fora de diálogos. O portal no body também não podia cobrir a camada nativa de `dialog.showModal()`.

`AppToast` é agora um produtor compatível com as chamadas existentes. Um único `AppToastHost` no layout apresenta o aviso mais recente com os ícones, tokens, cores e sons aprovados. O canal protege contra timers antigos, desmontagem de outro produtor e callbacks obsoletos. O host acompanha o diálogo ativo e utiliza popover manual na camada superior, com posição fixa e foco acessível no contexto modal.

Sucesso/informação duram 6 segundos; atenção/erro, 10. Hover, foco e aba oculta interrompem o temporizador. Avisos com ação necessária permanecem até fechamento. Nenhuma consulta adicional ao servidor é necessária para apresentar ou fechar alertas.

Aplicado a gestão empresarial, perfil, configurações administrativas, comunicação interna, MFA, falhas de leitura de notificações, uploads de identidade, confirmação/convites e troca de conta. Erros de campo permanecem nos campos; orientações persistentes e falhas de carregamento usam os componentes contextuais aprovados.

A Biblioteca do Design System demonstra o componente real e oferece simulação sobre janela ampla. Foram removidos temporizador próprio da demonstração e CSS dos blocos duplicados.

## Validação

- TypeScript e ESLint sem erros.
- Build e 18 testes existentes aprovados.
- Três testes do canal: substituição entre produtores, temporizador obsoleto, cleanup de callbacks e assinaturas. Integrados ao CI.
- Navegador local: aviso acessível na camada superior e posição fixa, inclusive em viewport estreito e janela modal. Nenhum envio de comunicação, alteração de conta, fator MFA ou dado de cliente para produzir evidências.
- CI, SHA e healthcheck final de Test são registrados nos documentos de continuidade após a implantação.

Sem migrations ou alterações de infraestrutura, sessões, dados e permissões. Live fora do escopo.

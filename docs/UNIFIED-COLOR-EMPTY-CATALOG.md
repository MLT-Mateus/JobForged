# Campo de cor unificado e catálogo de estados vazios

- Removido Meu perfil do backoffice e a seção profile. O catch-all passa a retornar404 para /backoffice/minha-conta; perfil empresarial e Auth permanecem. Nenhuma conta/dado excluído.
- Removido somente o controle Imagem de compartilhamento da interface de Aparência; assets legados e histórico preservados.
- ColorField integra textoHEX, amostra/picker e restauração dentro do mesmo TextField, sem toolbar/botão separado abaixo. Usa FocusPopover quiet, HSL/HEX sincronizados e ancoragem inferior. TextField usa contêinerdiv apropriado aos adornos, com os mesmos tokens de borda/foco.
- MultilineInput registrado como alias da implementação TextAreaField existente e demonstrado com esse nome em Formulários. Não há uma segunda implementação ou contorno interno.
- Removidos os exemplos antigos de pesquisas/filtros em linha do topo do catálogo e as entradas coleções/notificações associadas à seção antiga do print. Painel demonstrativo de notificações já não existia.
- Adicionados Banner vazio (FileImage/círculo), Imagem não definida (ImagePlus/bloco) e Caixa de entrada (Inbox/bloco compacto). EmptyStateVisual é compartilhado com a base EmptyState; ícones do catálogo existente, sem novos SVGs duplicados.
- Sem migrations, mudança de permissões ou Live. Publicar somente Test após CI.

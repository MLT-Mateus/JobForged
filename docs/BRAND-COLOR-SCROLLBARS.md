# Cor principal e barras de rolagem

- ColorField separa código hexadecimal do botão Escolher cor, com amostra e restauração explícita. Usa TextField/ActionButton compartilhados; mantém o último tom válido enquanto o usuário digita um código incompleto. Seletor nativo, sem dependências ou bibliotecas de cor.
- brandingScrollbarStyle deriva os tokens da cor principal geral da empresa, nos dois temas. O tom é ajustado até contraste3:1 contra fundo/superfície; hover reforça o contraste. A identidade padrão mantém as barras aprovadas atuais.
- Tokens de scrollbar globais legados e da UI são definidos dentro do mesmo escopo brandingStyle. Afeta rolagem do painel, prévias, listas e editores desse contexto; sem alterar documentElement ou cores de outras empresas/backoffice/DS/institucional.
- Rascunho altera somente prévia; publicação usa fluxo persistente existente e aplica nas páginas empresariais. Sem polling, timers adicionais, migrations ou dados modificados.
- Exemplo interativo em Design System/Aplicação usa ColorField e o mesmo brandingStyle/PreviewContent. Formulários usa o mesmo ColorField.

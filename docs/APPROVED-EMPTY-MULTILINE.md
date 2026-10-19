# Estados vazios e texto multilinha

- Uma base `EmptyState` com ilustração circular e aro tracejado aprovada no catálogo; variantes padrão, compacta e em linha compartilham a mesma estrutura. `WorkspaceState` vazio também a utiliza.
- Catálogo e aplicativo usam o mesmo componente. Apenas um exemplo de notificações com Bell; removido o painel de demonstração. Pesquisa e filtros têm exemplos em linha separados.
- Home, banners empresariais e pesquisa de ícones perderam implementações paralelas. Resultados administrativos filtrados usam a variante em linha e ícone contextual.
- TextAreaField demonstrado separadamente como Texto multilinha (Textarea). O contorno e foco pertencem ao shell; textarea e superfície RichText não desenham caixas internas. A regra compartilhada também cobre FieldControl dos editores existentes.
- Não há mudanças de banco, dados, autenticação ou notificações reais.

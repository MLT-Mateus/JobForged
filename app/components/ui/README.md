# Biblioteca de interface JobForged

Esta pasta é a fonte oficial dos controles usados no produto. Telas novas devem importar os componentes por `@/app/components/ui`, sem recriar campos ou copiar a marcação do manual.

## Regras

- Use componentes controlados para Dropdown, MultiDropdown, calendários, Toggle e uploads.
- Preserve labels, ajuda, erros e atributos acessíveis fornecidos pela API.
- Não altere altura, foco, raio ou cores por página. Ajustes definitivos devem ser feitos em `ui.css`.
- Os tokens `--jf-ui-*` mantêm os temas claro e escuro coerentes.
- Menus flutuantes são absolutos e nunca podem deslocar a grade da tela.
- Todos os controles ocupam 100% da largura do container por padrão.
- Dropdown e MultiDropdown aceitam a variação `allowCreate` para cadastrar opções sem duplicar o componente.
- `DateField` usa o calendário próprio da JobForged e não depende do seletor visual do navegador.
- `DateRangeField` reutiliza o mesmo calendário para selecionar início e fim, destacando visualmente todo o período.
- `MultiFileUploadField` aceita documentos ou imagens, adiciona novos itens sem apagar os anteriores e permite remoção individual.
- Todo `TextField` com `type="password"` inclui automaticamente o controle acessível de mostrar e ocultar a senha.
- Use `TextAreaField` para texto multilinha e `FieldControl` apenas quando o controle nativo precisar de comportamento específico. Ambos compartilham o mesmo rótulo, borda, foco, erro e estado desabilitado.
- O foco pertence ao container `.jf-control`; inputs internos nunca recebem um segundo contorno.
- `--jf-ui-focus` é o token único para foco dos campos e `--jf-ui-focus-ring` deriva dele. O Design System e todas as telas devem consumir esses tokens.

## Importação

```tsx
import { DateRangeField, FieldControl, MultiFileUploadField, MultiSelectField, TextAreaField, TextField } from "@/app/components/ui";
```

O manual em `/design-system` renderiza estes mesmos componentes. Portanto, qualquer refinamento aprovado ali passa automaticamente a ser o padrão das futuras telas do aplicativo.

## Painel empresarial

- `AdminShell` é a estrutura única das rotas empresariais, inclusive Home; a organização ativa substitui tokens, sem criar outro tema por tela.
- `Panel` fornece superfície, borda e raio compartilhados. Cada módulo define apenas a disposição do conteúdo com os tokens de espaçamento.
- `MetricCard` é o indicador comum da Home, Dashboard e Vagas. O Design System renderiza a mesma implementação.
- Buscas e filtros usam `TextField` e `SelectField`; controles nativos específicos usam `FieldControl` sem estilos descendentes próprios.
- Notificações usam `AppToast`, na posição global. Telas não implementam notificações locais.
- O popup de `AppToast` e os sons de `status-sound.ts` são demonstrados em `/design-system/componentes`. Os arquivos padrão ficam em `public/sounds/` e seguem o mapeamento sucesso, informação, atenção e erro. Páginas de autenticação e gestão usam a mesma camada de áudio para resultados e erros; mensagens persistentes podem permanecer inline para contexto.
- Títulos de páginas seguem a hierarquia compartilhada em `ui.css`. Os módulos consomem as famílias, cores, raios e espaçamentos de `ui.css`.
- `WorkspacePageHeader`, `PanelHeading` e `InlineNotice` definem a hierarquia das páginas internas, títulos dos cartões e mensagens de estado. O catálogo em `/design-system/componentes` renderiza esses mesmos componentes.

- `WorkspacePageHeader` concentra seção, retorno, título, metadados e ações. As ações quebram em linhas sem exigir rolagem lateral.
- `jf-workspace-stack`, `jf-workspace-grid` e `jf-workspace-toolbar` organizam módulos e formulários com a escala oficial; mantenha estilos de domínio apenas para a composição específica.
- `WorkspaceTabs`, `WorkspaceActionMenu` e `WorkspaceState` são demonstrados no catálogo e usados nas páginas. Estados de erro persistentes emitem um único sinal, sem duplicar um toast.
- `WidgetDialog` atende confirmações, histórico, prévia ampla e drawer. O tamanho `wide` e janelas sobrepostas preservam foco, Escape e a liberação da rolagem ao fechar a última janela.

## Feedback de ações

- Publique resultados de salvar, enviar, excluir e falhas de ação com `AppToast` e `createToastNotice`. O `AppToastHost` único do layout mantém apenas o alerta mais recente, inclusive sobre `WidgetDialog` e drawers. Não duplique o mesmo resultado com parágrafos ou `InlineNotice`.
- Sucesso/informação duram 6 segundos; atenção/erro, 10. Hover, foco e aba oculta pausam a leitura. Alertas com link de ação exigida permanecem até fechamento.
- Validação de campo permanece junto ao campo. Orientações persistentes usam `InlineNotice`; falhas que impedem carregar um módulo usam `WorkspaceState` com nova tentativa.
- Preserve os ícones, tokens e sons aprovados. O Design System demonstra a mesma implementação, sem temporizador próprio.

- A divisória da marca lateral e a base do menu superior compartilham `--jf-ui-workspace-header-height` (80px). A área da marca desconta o padding superior da sidebar; não definir alturas independentes por página. O mesmo shell atende Design System, Backoffice e painel empresarial, inclusive menu recolhido e drawer móvel.

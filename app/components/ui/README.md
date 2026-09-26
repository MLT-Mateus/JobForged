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

- `AdminShell` é a estrutura única de todas as dez rotas, inclusive Home; a organização ativa substitui tokens, sem criar outro tema por tela.
- `Panel` fornece superfície, borda e raio compartilhados. Cada módulo define apenas a disposição do conteúdo com os tokens de espaçamento.
- `MetricCard` é o indicador comum da Home, Dashboard e Vagas. O Design System renderiza a mesma implementação.
- Buscas e filtros usam `TextField` e `SelectField`; controles nativos específicos usam `FieldControl` sem estilos descendentes próprios.
- Notificações usam `AppToast`, na posição global. Telas não implementam notificações locais.
- Títulos de páginas seguem a mesma hierarquia em `admin.css`. Os módulos consomem as famílias, cores, raios e espaçamentos de `ui.css`.

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
- O foco pertence ao container `.jf-control`; inputs internos nunca recebem um segundo contorno.

## Importação

```tsx
import { DateRangeField, MultiFileUploadField, MultiSelectField, TextField } from "@/app/components/ui";
```

O manual em `/design-system` renderiza estes mesmos componentes. Portanto, qualquer refinamento aprovado ali passa automaticamente a ser o padrão das futuras telas do aplicativo.

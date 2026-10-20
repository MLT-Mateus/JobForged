# Aparência: controles do Design System

- Menu Domínio usa Globe2 da biblioteca aprovada no lugar do texto .com.
- Vinte campos nativos passam a TextField/TextAreaField com placeholders contextuais e os mesmos handlers e valores. Sobreposição usa campo numérico aprovado (0–80%).
- Upload empresarial usa FileUploadField/picture, com prévia separada e ActionButton destrutivo para remover. Preserva upload privado, limites por tipo e callbacks do serviço. FileUploadField ganha disabled durante envio e permite selecionar o mesmo arquivo novamente.
- Fontes e densidade usam SelectField; links do cabeçalho/rodapé usam MultiSelectField com criação e limites anteriores, sem chips próprios. Banners usam ToggleSwitch para estado.
- ColorField centralizado na biblioteca e demonstrado em Formulários; mantém validação hexadecimal, seletor nativo e restauração. Não há estilos próprios de input na página.
- Botões reais passam por ActionButton; removidos tamanhos locais de prévia, banner, upload e seletores. Grades de cores e controles permitem reorganização conforme largura.
- Sem migrações, alteração de permissões, edição de dados existentes ou Live. Domínios continuam desabilitados Em breve.

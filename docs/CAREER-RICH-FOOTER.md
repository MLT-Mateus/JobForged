# Rodapé e conteúdo formatado de carreiras

- SiteFooter é compartilhado com a landing page e a página de carreiras. Preserva grupos de marca/descrição/legal, chamada e contatos, navegação e redes. Até seis links empresariais, além das redes existentes; a landing possui quatro.
- Personalização oferece RichTextField em título, apresentação, botão, institucional, estados vazios, banners, textos das seções e conteúdo/nomes de links do rodapé. Identificadores, contatos, URLs, números e configuração de infraestrutura mantêm controles próprios.
- Conteúdo de Rich Text usa allowlist de tags inline e cores HEX; renderização e entrada no servidor passam pela mesma função. Atributos, scripts, iframes, imagens e CSS arbitrário não entram no conteúdo empresarial. Colagem e arraste são restringidos no editor de texto empresarial. O RichTextField geral mantém os recursos anteriores e recebe cor hexadecimal/paleta, demonstrada em Formulários.
- Valores controlados sincronizam restauração/recarga externa sem reescrever a seleção a cada digitação. A seleção é restaurada ao aplicar a cor.
- portal.footer e portal.content são opcionais. A migration0016 amplia a validação de JSON de forma aditiva, mantendo snapshots antigos e limites de empresa, URLs, tamanho e contraste. Não altera registros existentes. Aplicar com backup verificado e runner antes de publicar o código dependente.
- O portal público JobForged usa o rodapé institucional real da landing e destaques azul/verde. O ícone isolado do convite foi removido. Permanece uma demonstração mock, sem candidatura real.

Resultado de CI, migration e conferência visual: registrado nos documentos de continuidade ao concluir a publicação Test.

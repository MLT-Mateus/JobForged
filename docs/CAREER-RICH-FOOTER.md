# Rodapé e conteúdo formatado de carreiras

- SiteFooter é compartilhado com a landing page e a página de carreiras. Preserva grupos de marca/descrição/legal, chamada e contatos, navegação e redes. Até seis links empresariais, além das redes existentes; a landing possui quatro.
- Personalização oferece RichTextField em título, apresentação, botão, institucional, estados vazios, banners, textos das seções e conteúdo/nomes de links do rodapé. Identificadores, contatos, URLs, números e configuração de infraestrutura mantêm controles próprios.
- Conteúdo de Rich Text usa allowlist de tags inline e cores HEX; renderização e entrada no servidor passam pela mesma função. Atributos, scripts, iframes, imagens e CSS arbitrário não entram no conteúdo empresarial. Colagem e arraste são restringidos no editor de texto empresarial. O RichTextField geral mantém os recursos anteriores e recebe cor hexadecimal/paleta, demonstrada em Formulários.
- Valores controlados sincronizam restauração/recarga externa sem reescrever a seleção a cada digitação. A seleção é restaurada ao aplicar a cor.
- portal.footer e portal.content são opcionais. A migration0016 amplia a validação de JSON de forma aditiva, mantendo snapshots antigos e limites de empresa, URLs, tamanho e contraste. Não altera registros existentes. Aplicar com backup verificado e runner antes de publicar o código dependente.
- O portal público JobForged usa o rodapé institucional real da landing e destaques azul/verde. O ícone isolado do convite foi removido. Permanece uma demonstração mock, sem candidatura real.

Resultado de CI, migration e conferência visual: registrado nos documentos de continuidade ao concluir a publicação Test.


## Ajuste de parâmetros — 23/10/2026
- A edição empresarial usa fonte com parâmetros BBCode: [color=#RRGGBB]trecho[/color], [b], [i], [u], [size=16|18|24|32] e [br]. A toolbar não possui seletor de cor. Um balão documenta a sintaxe; Formulários demonstra a edição e a saída ao vivo. Os botões de formato envolvem a seleção preservando o restante do texto.
- A API canonicaliza os parâmetros para o mesmo HTML restrito já aceito pela migration0016. Assim, título continua limitado por caracteres visíveis e não há nova migration para BBCode. O editor converte HTML legado de volta para fonte legível, sem regravar históricos. Parâmetros inválidos são literais; CSS e atributos livres continuam bloqueados.
- SiteFooter e site-footer.css passam a ser a única composição e apresentação; removidas sobrescritas do portal. Mesmo conteúdo, contatos, links, logo temática e medidas em LP e /jobforged.
- Nova foto Pexels7495493 otimizada para139KB, com crédito em public/careers/PHOTO-CREDIT.md.

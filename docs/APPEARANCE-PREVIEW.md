# Personalização empresarial e publicação por endereço

A Personalização em `/app/personalizacao` usa três grupos: Página, Identidade e Endereço. A referência de Aparência foi estudada por leitura: hierarquia curta, cinco composições, conteúdo preservado na troca de template, ações no topo e viewport real na prévia. Não há uma empresa JobForged fictícia ou tratamento especial para `/jobforged`.

## Prévia e publicação

- O editor mostra os campos atuais em um iframe sem scripts e sem envio de formulários. Desktop, tablet e celular usam viewports reais escalados, com rolagem interna. Links externos ficam inativos.
- A prévia externa privada `/app/personalizacao/previa` mostra o último rascunho salvo para titular/administrador; membros veem a identidade publicada. Exige sessão e vínculo empresarial no servidor.
- Salvar rascunho não publica. Publicar exige confirmação e grava a identidade, histórico e habilitação pública atomicamente, verificando as duas versões concorrentes.
- `/<slug>` mostra somente a configuração publicada. Slug não é autorização. Páginas inexistentes, suspensas ou retiradas do ar retornam 404. Configurações antigas recebem endereço, mas permanecem privadas até publicação explícita.
- Alterar endereço mantém a publicação e desativa o link anterior. Retirar do ar mantém identidade, histórico e arquivos privados.

## Componentes e consumidores

EditorSection e ViewportPreview são compartilhados e demonstrados em Widgets do Design System. CareerPortalPreview compõe editor, prévia externa e página pública: as faixas ocupam a largura disponível e o conteúdo conserva medidas de leitura. Os cinco templates existentes, quatro pares tipográficos, Rich Text, cores, uploads e histórico são preservados. Há controles aditivos para imagem, texto alternativo, balões, destaques, cultura, convite e cartões/lista.

Na versão pública, não são exibidas vagas fictícias, contagens ou ações de candidatura. Vagas reais dependem da Frente 4. As oportunidades do editor continuam explicitamente mock. Domínios e subdomínios seguem Em breve.

## Dados e permissões

Migration nova e aditiva `0031_company_portals.sql`: company_portals, alocação única de slug, RPCs privados de edição e projeções públicas explícitas. Nenhuma migration anterior é alterada. O titular e administrador empresarial podem editar/publicar; membro pode consultar; administrador de plataforma não recebe edição empresarial.

A leitura pública exclui rascunho, autores, histórico, nomes originais de arquivos e fundos internos do painel/login. Campos e imagens de seções ocultas são omitidos quando aplicável. Somente imagens referenciadas na projeção pública atual podem ser lidas anonimamente; o bucket permanece privado. A rota pública usa chave anônima, confere escopo, tamanho, assinatura PNG e SHA-256. Suspensão e retirada da publicação revogam novas leituras, com no-store. Imagens que alguém já tenha baixado não podem ser recuperadas remotamente.

O favicon empresarial é limitado ao contexto da empresa; ao sair, o ícone da plataforma retorna. A marca da empresa não altera o editor, backoffice ou Design System.

## Validação

Testes versionados: company-portals-security.sql (PostgreSQL real isolado, autorização, concorrência, projeção, suspensão, retirada, RLS de imagem), company-portal-api.test.mjs (BFF com provedor simulado), test-native-auth.py (Auth/Storage reais descartáveis, publicação e revogação de PNG), branding-model e theme-preference. O pipeline executa os testes antes de integrar/publicar. Resultados do deploy e limitações de validação autenticada constam do relatório da entrega.

Publicação somente em Test. Live não é alterado.

## Refinamento de cabeçalho, rodapé e padrão (29/10/2026)

Cabeçalho, cores e links fica em Página, com cinco nomes/endereços (60/2048 caracteres), HTTPS, caminhos internos e âncoras reconhecidas. Links externos abrem outra aba com noopener/noreferrer; na prévia embutida seguem bloqueados. Rodapé usa SiteFooter da LP, marca completa, descrição/direitos/chamada e quatro nomes de links predefinidos sem URLs inventadas. E-mail/telefone ficam vazios até configuração; URLs vazias viram texto, sem âncoras falsas. Contatos: 254/64 caracteres; URLs editáveis até2048; nomes formatados do rodapé até240 na fonte. RichTextField compartilha teto de4000 por padrão e preserva os comandos existentes. Há limites de5/6 links de cabeçalho/rodapé e20 banners; contratos SQL legados continuam válidos.

Cores próprias de cabeçalho/rodapé em claro e escuro são opcionais; sem configuração usam superfícies/textos da paleta empresarial, sem inversão. Servidor e banco verificam HEX e contraste4,5:1. ThemeSelector aprovado funciona na página, preview e publicação, respeitando a permissão de alternância. Imagem padrão retangular sem arco; asset local team-jobforged-v2.webp gerado por IA, otimizado e ilustrativo. Imagens personalizadas permanecem.

Prévia externa tem identificação flutuante PreviewDock e Continuar editando; a faixa superior foi retirada. O widget está demonstrado no DS. Restauração fica desativada se os valores efetivos já forem os padrões da empresa; a API também devolve a versão atual sem gravar revisão/auditoria desnecessária. A comparação ignora metadados, ordem das chaves e diferenças de serialização do Rich Text. Nome de comparação vem do contrato autenticado, não do nome editável ou do mock do shell.

Migration0032 acrescenta validação dos campos opcionais chrome/navigation e sua projeção pública. Não atualiza documentos existentes nem publica clientes. Campos de menus ocultos não são expostos. Fazer backup restaurado/cópia cifrada antes da aplicação, conforme gate do projeto.

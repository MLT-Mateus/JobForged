# Ícone da marca nos resultados de busca

O pequeno ícone ao lado do domínio no Google é o favicon. O Live inspecionado
em 08/11/2026 declarava apenas SVG e retornava 404 em `/favicon.ico`.
A documentação atual do Google lista formatos raster e ICO, recomenda uma
imagem quadrada maior que 48 px e exige URLs estáveis e acessíveis aos robôs:
https://developers.google.com/search/docs/appearance/favicon-in-search

Os assets derivados do símbolo oficial são:

- `/favicon-96x96.png`: PNG quadrado de 96 px declarado no HTML do servidor.
- `/favicon.ico`: fallback convencional, com frames 16, 32 e 48 px.
- `/apple-touch-icon.png`: PNG quadrado de 180 px para dispositivos Apple.
- `/favicon.svg`: ícone do navegador, preservado com variação claro/escuro.

Regenerar com `node scripts/generate-favicons.mjs`. Não usar uma nova marca,
imagem de IA ou logo horizontal no favicon. O script de tema altera somente
o link marcado `data-jf-browser-icon`; PNG, ICO e touch icon mantêm suas URLs,
tipos e tamanhos. A troca do favicon de uma empresa no navegador não altera
as declarações raster institucionais para os buscadores.

## Validação e publicação

1. Conferir PNGs, frames ICO, HTML do servidor e integridade após trocar tema.
2. Validar acesso HTTP 200 aos assets com User-Agent Googlebot-Image.
3. Manter Test com noindex; não solicitar indexação de Test.
4. Promover o SHA validado para Live somente com aprovação explícita e gates.
5. Em Live, conferir novamente home, robots e assets. Pelo Search Console,
   o proprietário pode solicitar nova indexação da home `https://jobforged.com/`.

O favicon não é garantido nos resultados. Após a promoção, o Google precisa
rastrear e processar a home novamente; isso pode levar dias ou semanas.
Não prometer mudança imediata, nem dizer que o Google foi atualizado apenas
porque o deploy Test passou.

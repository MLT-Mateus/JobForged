# Descoberta da JobForged no Google

## Política implementada

Somente APP_ENV=live com origem oficial HTTPS jobforged.com habilita indexação das páginas institucionais. Test, prévias, ambientes desconhecidos e configuração inválida permanecem noindex. APP_PUBLIC_URL sozinho não habilita indexação.

Home: título ATS/recrutamento e seleção, descrição, marca alternativa Job Forged, Open Graph, WebSite e Organization JSON-LD. Os dados estruturados ficam somente na home; não há avaliações, clientes, preços ou funcionalidades fictícias no schema. A landing conserva componentes e estilos aprovados, com uma explicação visível de ATS/JobForged no FAQ.

Canônicos: home e cada documento legal apontam para seu próprio endereço no ambiente. O root deixou de atribuir o canônico da home a todas as páginas. Login, painéis, APIs, Design System e páginas de estado recebem noindex por padrão e/ou X-Robots-Tag. Isso não substitui autenticação.

Sitemap: em Live, somente home e documentos legais institucionais; sem painel, Design System, slugs de clientes ou datas de alteração inventadas. Em Test, sitemap vazio e robots sem anunciar sitemap. Robots permite rastreamento para que o Google consiga ler noindex e remover páginas de Test anteriormente descobertas. Disallow sozinho não garante remoção do índice e impediria ler noindex.

## Promoção futura a Live

Esta entrega publica somente em Test. Promover a mesma imagem após validação e aprovação pelo fluxo protegido. Não é necessário mudar código para habilitar a política Live; a decisão é feita em runtime com os valores próprios do ambiente.

Após a promoção: conferir home HTTP200, ausência de noindex na home, canonical https://jobforged.com/, robots e sitemap oficiais, redirecionamentos HTTP/www e imagens acessíveis. Conferir login/painéis com noindex e Test ainda excluído. Não adicionar sites de clientes ao sitemap institucional nesta etapa.

## Search Console (etapa externa)

1. Usar uma conta Google legítima da empresa e abrir https://search.google.com/search-console.
2. Verificar a propriedade de domínio jobforged.com via TXT DNS ou a propriedade de prefixo https://jobforged.com/ via meta tag. Não criar valores de verificação fictícios.
3. Para meta tag, configurar o token público fornecido pelo Google em GOOGLE_SITE_VERIFICATION no ambiente Live e republicar pelo fluxo aprovado. O token só é emitido na home Live indexável; não é uma credencial de API.
4. Enviar https://jobforged.com/sitemap.xml e usar Inspeção de URL para testar a home e solicitar indexação. Fazer isso somente depois da promoção; não enviar Test.
5. Acompanhar relatório de indexação e consultas JobForged, Job Forged e ATS. Prazo e inclusão dependem do Google, sem garantia de posição. Anúncios são separados dos resultados orgânicos.

Não usar a Indexing API para a landing: ela se destina a JobPosting ou transmissões elegíveis, não a uma home institucional.

## Evidências e testes

search-seo.test.mjs verifica HTML/header/robots/sitemap/canônicos em Test e Live simulados pelo runtime compilado, além de configuração inválida e nome alternativo. Docker testa os dois perfis e deve manter a mesma imagem para promoção. Conferir o resultado efetivo dos checks antes de declarar publicação concluída.

Inspeção inicial de 29/10/2026: ambos os ambientes respondiam200, robots permitia tudo, sitemap incluía DS e inventava lastmod por acesso, Test não enviava noindex e raiz herdava canonical em todas as páginas. Isso confirma lacunas técnicas; não demonstra a razão exata pela qual o Google ainda não exibe a marca. Sem Search Console verificado, situação do índice/manual actions não foi confirmada.

Fontes oficiais:
- https://developers.google.com/search/docs/appearance/site-names
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- https://developers.google.com/search/docs/monitor-debug/search-console-start
- https://developers.google.com/search/docs/fundamentals/how-search-works

## Canonicalização na borda

Leitura da VPS confirmou entradas Traefik web=:80 e websecure=:443. HTTP Live retornava404 e www HTTPS200; a expressão do middleware estava duplamente escapada e não correspondia ao hostname. Compose corrige a expressão usando [.] e inclui router HTTP por ambiente com redirecionamento HTTPS permanente. Somente labels da aplicação do ambiente implantado mudam; não há alteração global do Traefik. Em Test validar http://test.jobforged.com antes de promover a mesma configuração com os valores próprios de Live. Live permanece com o comportamento anterior até promoção aprovada.

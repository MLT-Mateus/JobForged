# Aparência: seções, banners e entrega de imagens

## Superfícies da página
`sectionColors` deriva dois tons neutros suaves (4% e7%) do fundo já escolhido. Mantém contraste mínimo4,5:1 do texto normal. Highlights/vagas/cultura alternam esses tons com o fundo base; cabeçalho/rodapé mantêm as cores escolhidas. Não acrescenta inputs. Mesma aplicação em prévia e página pública, em claro/escuro. Textos e cartões continuam usando os tokens aprovados.

## Gestão dos banners
A regra genérica de summary expandia todos os spans, inclusive o selo. EditorAccordion agora distingue título flexível de selo compacto. Banners têm índice, nome e Visível/Oculto com ícone. Campo Posição na sequência permite ir diretamente a qualquer posição; setas têm rótulos e limites. Reordenação reinsere o item, preserva ordem relativa dos demais e normaliza os índices, sem modificar snapshots anteriores. Mantidos Salvar, histórico, validação de empresa e revisão concorrente. Ativação é independente da ordem. Demonstração interativa do mesmo componente em DS→Widgets. Nada é publicado apenas por interagir com a demonstração.

## WebP de exibição
Uploads continuam validados/normalizados no servidor como PNG seguro, mantendo o contrato de Storage, hashes, quotas e histórico. Após autorização e verificação da integridade, os endpoints de imagens empresariais públicas/privadas e de comunicação geram uma rendição WebP para navegadores que a aceitam. Abrange banner, hero e demais assets dinâmicos. Assets estáticos padrão já são WebP.

Qualidade86, alpha100, logos pequenos sem perdas; máximo2560px por lado, sem ampliar, deformar ou cortar. Só entrega WebP se for menor; PNG permanece alternativa para incompatibilidade, erro, processamento ocupado ou ausência de ganho. Ícones de aba continuam no caminho PNG64/fallback existente, sem compressão com perdas.

Conversão no servidor, nunca a cada frame do navegador. Limites:2 conversões simultâneas, timeout3s, limite de pixels16.777.216, entrada até5MiB, single-flight por conteúdo, cache de até64 entradas/32MiB e TTL10min. O cache é de cálculo, não de autorização: RPC e leitura autorizada continuam em cada requisição antes do helper. Vary inclui Accept e preserva Cookie/Cache-Control. Não habilita cache público de rascunhos ou documentos. Não otimiza currículos nem expõe arquivos privados.

Originais não são sobrescritos/apagados, nem registros de clientes alterados em lote. Assim o tráfego entregue diminui, mas a quota de armazenamento dos originais não diminui. Primeiro acesso/reinício pode converter novamente; em saturação, a imagem original é entregue imediatamente. Sem novo serviço, custo ou migration.

## Evidências e limites
62 testes locais de aplicação: rendição menor, proporção, alpha, formato negociado/q=0, preservação de bytes originais, cache, Vary/privacidade, reordenação sem perdas e tons com contraste. TypeScript/build/lint devem passar no fluxo de PR/CI/deploy Test. Testes de permissões/Storage/SQL isolados do pipeline permanecem obrigatórios.

Arquivo1600×540 fornecido pelo usuário: medição local27.290→9.338 bytes em WebP, redução66%. Resultado varia por imagem; não é promessa de ganho em todo arquivo. Navegador local validou mover1→3 mantendo outros itens, selo compacto e tela390px sem overflow. Validação autenticada de gravação da identidade empresarial real não foi realizada para gerar evidência. Publicação/SHA/healthcheck e confirmação da entrega WebP real devem ser registrados nos documentos de continuidade.

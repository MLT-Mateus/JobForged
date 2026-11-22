# Configuração de domínio e portais responsivos

O provedor da VPS não determina onde o cliente edita DNS. O editor pergunta quem
gerencia a zona e oferece Cloudflare, Registro.br, Hostinger, HostGator, Locaweb,
GoDaddy e instruções genéricas. Essa seleção orienta o usuário; não altera DNS
nem detecta automaticamente o provedor. Os links oficiais ficam no catálogo
`app/components/personalization/domain-providers.ts`.

Fluxo: escolher principal/subdomínio → informar endereço e zona → vincular →
escolher provedor e copiar TXT + A/CNAME → testar → acompanhar HTTPS. A zona
de subdomínios é confirmada pelo usuário: remover o primeiro segmento não é
uma forma segura de descobri-la. Cloudflare usa Somente DNS neste fluxo, pois a
verificação existente compara o destino público com o servidor JobForged.

O principal substitui o destino do site atual; o subdomínio preserva o site.
Não sugerir troca de nameservers, alteração de e-mail ou duplicação de registros.
TTL permanece o padrão do provedor. O teste existente continua sendo a fonte
do diagnóstico, e nenhum registro é criado automaticamente pelo editor.

`AdaptiveNavigation` mede os links e o espaço disponível, recolhendo os menus
do cabeçalho e rodapé. Textos completos quebram apenas dentro da lista rolável.
Escape fecha e devolve foco; links e clique fora também fecham. O componente
usa o documento do próprio elemento, inclusive na prévia em iframe.

Panorama: até 680 px, capa 3:2 em área 3:2; entre 681 e 1100 px, banner 3:1
em área 3:1. Assim a troca da imagem coincide com a proporção do layout, sem
faixas desfocadas acima/abaixo. A composição desktop continua sobre o panorama.

Senha: retirar o indicador técnico em bytes e `maxLength` dos campos. O limite
do algoritmo de autenticação permanece protegido no servidor e na política
compartilhada; não truncar nem transformar senhas, o que quebraria a compatibilidade
das contas existentes. Rejeições de comprimento usam linguagem comum.

# Estabilidade da personalização — 30/10/2026

## Evidência e limites

Base Test: bbb3f64b9d709b2bdc75b5661e483fdcaca47cc1. A página autenticada funcionou ao alternar Portal, Login, Painel e tema da prévia; não foi reproduzida a exceção exata da captura do usuário. Logs recentes do container não apresentaram stack de erro. Não atribuir automaticamente todo HTTP 500 à mesma causa.

Confirmado: chunks de uma versão anterior, como `/assets/AppearancePreviewPanel-Cyg1YnXJ.js` e `/assets/AdminModuleClient-IJfnDhkp.js` da imagem 51c7152effda96fc8c0d996b98ce1bb467e87afa, retornam 404 no servidor BBB. Isso pode quebrar imports de abas abertas antes do deploy. O boundary anterior descartava a informação da categoria e tentava apenas o reset React, que não invalida import rejeitado.

## Correção

- Preservar quatro builds de arquivos públicos com hash em volume separado por ambiente. Antes de substituir o app, copiar assets da imagem atual e da nova, conferindo o label do SHA; bootstrap de Test usa apenas ancestrais já presentes localmente.
- Fallback GET `/assets/:asset`: lista restrita de extensões e nomes, somente arquivos regulares, sem symlinks, mapas de fonte, `.env`, dados empresariais ou credenciais. Volume montado somente para leitura no app. Limite individual de 32 MiB; coleta por quatro versões. Proteção finita: abas de versões anteriores à retenção podem precisar recarregar.
- Falha reconhecida de carregamento de módulo: Tentar novamente recarrega o documento; sem recarga automática ou loop. Outras falhas preservam reset existente. Console registra apenas categoria fixa, sem mensagem, URL ou conteúdo de campos. Não constitui monitoramento persistente de erros.
- Boundary local na prévia usa WorkspaceState e ActionButton aprovados, preservando o editor em caso de exceção no conteúdo React da prévia. Não captura falhas de rede ou handlers que não passam pelo boundary React.
- Sincronização incremental dos estilos do iframe, coalescida por animation frame. Nós inalterados não são recriados por mudanças de favicon. Sandbox e CSP preservados.

## Verificações anteriores ao PR

Lint, TypeScript e build completos aprovados. 33 testes locais aprovados, incluindo retenção, repetição idempotente, imutabilidade e bloqueio de nomes indevidos. O CI também valida chunks históricos sintéticos por HTTP nos containers Test e Live isolados, sem acesso aos ambientes reais.

Backup Test novo, restauração isolada e cópia cifrada no computador: recibo 2026-10-30T13:18:36Z, restorationVerified=true. Nenhuma migration nova ou alteração de dados de clientes. Publicação, SHA e evidências posteriores ao deploy devem ser registrados na continuidade operacional; não inferir publicação apenas pela existência deste documento.

Live não alterado nesta tarefa. A mesma imagem validada em Test e o procedimento versionado ficam disponíveis para futura promoção aprovada.

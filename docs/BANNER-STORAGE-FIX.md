# Correção do armazenamento de banners — Test

## Causa e correção

O upload enviava `platform/<uuid>.png`, mas a política INSERT da migration 0008
permitia somente `<company-uuid>/<asset-uuid>.png`. Storage rejeitava o arquivo
antes de registrar seus metadados. Não era uma indisponibilidade do serviço.

A migration nova 0013 acrescenta exclusivamente `platform/<uuid>.png` ao mesmo
token técnico restrito. Bucket privado, PNG, limite de 5 MiB após normalização,
ausência de UPDATE/DELETE e autorização administrativa da API preservados.
Nenhuma migration anterior foi alterada.

O broker registra apenas operação e status HTTP em falhas, sem credenciais,
arquivos ou corpo de respostas. O diagnóstico usa as variáveis do contêiner
realmente em execução e cobre os namespaces empresarial e da plataforma.

## Evidências reais

- Antes: empresa upload/read 200; plataforma upload/read 400.
- Backup verificado: `/opt/jbfd/backups/supabase/test-20261019T201922Z`.
- Migration 0013 aplicada pelo runner; checksums das 13 migrations confirmados.
- Depois: empresa e plataforma upload/read 200, bytes recebidos iguais aos enviados.
- Leitura anônima negada; token técnico sem acesso ao RPC empresarial; namespace
  não autorizado continua negado.
- Probes são imagens técnicas privadas sem publicação de banners ou envio de e-mail.

A verificação real de Storage não equivale à validação da interface autenticada.
O navegador integrado estava no login; solicitada sessão ao usuário para conferir
o fluxo visual, sem solicitar ou manipular sua senha.

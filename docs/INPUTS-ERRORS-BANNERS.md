# Inputs, erros e banners — Test, 06/11/2026

## Inventário e contratos
`node scripts/audit-inputs.mjs` gera `docs/input-inventory.json`: declarações JSX, incluindo campos compartilhados, exemplos DS e telas demonstrativas; não é uma contagem de controles simultaneamente renderizados. Atributos dinâmicos exigem leitura do consumidor. Nenhum dado preenchido ou segredo é coletado.

| Família | Política preservada / corrigida | Autoridade |
| --- | --- | --- |
| CNPJ/CPF | Máscaras compartilhadas, colagem sem pontuação, limite de dígitos; validação de verificadores permanece separada da máscara | auth-validation + APIs de cadastro/empresa/backoffice + RPCs existentes |
| Telefone cadastral | Brasil, 10/11 dígitos com DDD; empresa/backoffice agora exibem máscara; banco recebe dígitos | API company e cadastro |
| Telefone editorial | Texto público pode conter formato internacional; não aplicar silenciosamente máscara brasileira | branding/editor e contratos existentes |
| E-mail | type=email, limite compartilhado de 254, sem máscara destrutiva | Auth/APIs |
| Link/domínio/slug | HTTPS ou caminhos conforme contrato de cada consumidor; hostname sem protocolo/caminho, slug normalizado; não converter link inválido em válido silenciosamente | branding-model, company-domain, company-portal e APIs |
| Senha | Nunca remover espaços ou pontuação nem aplicar máscara de dados; requisitos compartilhados existentes | Auth + gateway + política do banco |
| MFA | 6 dígitos, teclado numérico e preenchimento one-time-code; validação real do fator no servidor | SecurityClient/Auth/RPC |
| Número/data/seleção | min/max/step e opções; scores demonstrativos limitados a 0–100; data usa seletor aprovado, não máscara manual | consumidores e APIs existentes |
| Texto/Rich Text/cor | Limites existentes, conteúdo sanitizado, cor hexadecimal validada; texto livre não recebe máscara | componentes compartilhados e branding-model/RPC |
| Arquivo | accept e limites no componente; validação real de conteúdo, tamanho, autorização e quota no servidor mantida | pipeline de imagem/currículo/Storage |

Exemplos e regra em DS → Formulários. Máscara não prova validade nem substitui autorização/validação de banco. Campos de demonstração continuam demonstrações. Esta revisão não declara que todos os 197 controles foram submetidos manualmente com conta real.

## Falha temporária ao navegar
Origem textual de `Service busy` confirmada em services/security-gateway/server.mjs: gate de concorrência global/por IP/uploads. Isso não demonstra DNS inválido nem permite afirmar saturação permanente sem telemetria do instante. Limites de segurança foram preservados.

O gateway cancela a requisição upstream ao desconectar o cliente, liberando trabalho abandonado em vez de esperar até 30 segundos. O contador continua sendo decrementado em finally. Retry-After em 503: 1 segundo. Consultas GET de domínio/identidade/endereço repetem uma única vez em 502/503/504, com espera limitada e jitter; navegação cancela a consulta de domínio. Sem repetição automática de POST, envio, upload ou 429.

`apiResponse` traduz estados HTTP e mensagens conhecidas; descarta HTML, parser, detalhes técnicos e texto upstream não revisado. Alertas globais de erro usam o mesmo contrato. Administração, comunicação, exclusão, personalização e popup da conta usam parsing seguro nos caminhos revisados. Mensagens de sucesso não são transformadas. Erros de perfil empresarial agora especificam nome, CNPJ ou telefone.

## Banners empresariais
Arquivo anexado: 1600×540, sem alpha. O componente exibia 820/312, gerando sobra vertical. CommunicationBanner agora tem formato company de 1600/540 (80:27), também no celular. Home/Backoffice mantêm seus contratos desktop 820/312 e mobile 640/360. A imagem inteira continua contain; extensão desfocada só quando a origem difere da caixa. Não cortar, distorcer ou regravar arquivos. Não prometer eliminar espaços que já façam parte do arquivo enviado.

Editor empresarial: nome interno obrigatório (até 100), imagem, link opcional, ativação/ordem/duplicação/exclusão existentes. Removidos Mensagem e Texto do link. Campos legados permanecem no snapshot para compatibilidade e histórico, sem legendas públicas. Nenhum arquivo ou registro existente excluído.

## Validação
59 testes de aplicação e 7 de gateway passaram localmente; TypeScript/lint aprovados. Inclui máscaras/colagem/patterns, tradução/JSON inválido, retry limitado/cancelamento/429 sem retry e proxy HTTP com desconexão real do cliente. CI e publicação devem ser registrados na continuidade após execução. Testes de API/busy utilizam fixtures; não provocam saturação no ambiente compartilhado. Não alterados schema/migrations, dados de clientes, credenciais, DNS ou Live.

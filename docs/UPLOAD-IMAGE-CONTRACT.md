# Upload compartilhado — 04/11/2026

## Interface e transporte

`FileUploadField` e `MultiFileUploadField` usam a mesma validação para seleção e drop. Drop não navega para o arquivo; destaca a área; respeita desabilitado, quantidade, extensão e tamanho; não apaga a seleção anterior em cancelamento/erro. Arquivos repetidos não são duplicados. Erros ficam associados ao campo. O Design System/Formulários demonstra os mesmos componentes.

Imagens empresariais e de comunicação usam corpo binário com nome e contexto em headers. A mudança evita a interpretação de multipart como Server Action pelo vinext, que rejeitava o Origin público diante do Host interno e devolvia texto Forbidden. Não se amplia allowedOrigins nem se retira CSRF. O servidor continua validando Origin, sessão, vínculo/papel, suspensão e quotas. Identificador empresarial nunca é prova de autorização. Multipart legado continua aceito pelo parser quando alcança a rota; abas antigas devem ser recarregadas.

Respostas de upload não JSON recebem mensagem clara conforme status, sem SyntaxError ou conteúdo bruto do proxy. O parser também atende upload de currículo PDF, sem ampliar seus formatos.

## Formatos e limites

PNG, JPEG, WebP, AVIF estático e SVG simples. Assinatura/decoder devem corresponder ao MIME e extensão. SVG: XML reconstruído por allowlist, até 1 MB, profundidade32 e 5000 elementos; sem scripts, eventos, DTD/entities, imagens, links, fontes externas, stylesheets ou recursos remotos. SVG original nunca é servido/armazenado. Preview local de SVG usa ícone até conversão segura. HEIC/HEIF e HVIF não são aceitos: exportar para um dos formatos indicados. AVIF usa AV1; decoder HEVC não está instalado.

Marca empresarial: até5MB/16MP; logo, favicon e avatar até2MB. Comunicação: até10MB/32MP na entrada. Saída PNG estática, metadados removidos, até4096×4096 e5MB. Timeout de processamento8s. Panorama mantém validação3:1. Storage, políticas, quotas e autenticação existentes preservados; sem migration.

## Verificações

`tests/image-upload.test.mjs`: cinco formatos, SVG malicioso, MIME falso, arquivo inválido, limites e respostas não JSON. `tests/branding-api.test.mjs`: envio binário autenticado com fixtures, isolamento e papel, SVG/AVIF convertidos, rejeição antes de Storage. `scripts/test-node-runtime.mjs`: HTTP nativo com Host interno e Origin público, visitante e origem externa negados em JSON. Esses testes não equivalem a upload autenticado no navegador nem a uso do Storage real em produção.


## Falhas e reservas de processamento

Migration0041 adiciona release_company_image(uuid), autorizada por identidade, empresa, papel e sessão. Em falha de conversão, proporção, Storage ou registro, a API expira a reserva no finally. Nenhum arquivo é apagado. O recibo fica no banco para manter o limite durável de cinco tentativas por minuto; a quota de200 imagens/1GB e dois processamentos simultâneos permanece. Se a liberação falhar por indisponibilidade, a expiração de cinco minutos continua como fallback.

Alertas distinguem quota de armazenamento, concorrência e frequência. Retry-After informa60s para frequência e300s para reserva concorrente interrompida. O teste nativo isolado verifica liberação pela sessão correta, negativa entre empresas e conservação do recibo. Teste BFF verifica finally e mensagens específicas. Não executar liberação manual de reservas ativas dos clientes.

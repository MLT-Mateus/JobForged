# Vagas com filiais e criação assistida — Test

- A identificação da vaga aceita várias filiais ativas da empresa. As filiais inativas já vinculadas podem ser removidas, mas não adicionadas a novas vagas.
- Vaga e vínculos são salvos na mesma transação. Versões de vagas e filiais impedem sobrescrita por edições antigas. O cadastro da filial também pode vincular várias vagas.
- A página pública apresenta nomes e endereços das filiais ativas. Os campos gerais de cidade/UF continuam sendo a referência principal da oportunidade.
- O painel “Criar com IA” usa o formulário atual e até 12 mensagens da conversa. A conversa permanece somente na sessão de edição; ao recarregar, ela é reiniciada. As sugestões podem ser selecionadas individualmente e são aplicadas ao formulário antes de salvar/publicar.
- Workflow n8n: `NTb1OmXykFRnRETw`, **JobForged Test · Assistente de vagas**, projeto pessoal de Mateus Batista Santos. Usa a credencial Gemini existente do projeto. O workflow Mantevida não foi alterado.
- Entrada: `POST https://n8n.jobforged.com/webhook/jbfd-test-job-authoring`, corpo `{token}`. O token aleatório de 256 bits é emitido pelo servidor autenticado, armazenado apenas como SHA-256 e consumido uma vez no endpoint fixo de contexto. Expira em dois minutos. O contexto não contém tokens de sessão nem credenciais de serviços.
- Limite de 30 solicitações por empresa/hora; acesso de titular/administrador; ambiente Test; proteção de origem. A consulta de contexto revalida o vínculo ativo do solicitante. O n8n não salva dados de execução de sucesso ou erro.
- O modelo não tem ferramentas de escrita, publicação, consulta de candidatos ou envio de mensagens. Retorna `{reply,patch}`. O servidor valida tipos, tamanhos, campos e IDs das filiais. Consentimento LGPD, identidade, status e permissões não são campos editáveis pela IA.
- Falhas preservam o formulário e permitem tentar novamente. O assistente não substitui a revisão humana dos requisitos e condições de contratação.

## Verificação

`tests/job-assistant.test.mjs`: contrato de saída, campos proibidos, filiais estranhas, tipos e tamanhos.
`tests/security-foundation.sql`: vínculos múltiplos, concorrência, isolamento e autorização de uso único.
O pipeline executa as migrations e testes em PostgreSQL descartável antes do deploy. Test só recebe migrations após o gate de backup.

## Chat, anexos e áudio (14/11/2026)

- Conversa lateral com componentes compartilhados `ChatBubble`, `ChatComposer` e `ChatProcessing`, demonstrados no Design System. Três aberturas fixas alternadas; logo original e loader aprovado.
- Respostas progressivas via NDJSON. Somente o texto de conversa aparece durante a geração; a proposta completa passa pela validação antes de ser oferecida para revisão/aplicação. Falhas preservam o formulário e permitem reenviar.
- Contexto inclui empresa autorizada, filiais ativas, formulário, últimas 12 mensagens e lacunas obrigatórias. O agente pergunta uma informação crítica por vez; não publica nem confirma consentimento.
- Microfone: MediaRecorder em formato nativo WebM/Opus, M4A ou OGG, 32 kbps, até 90 segundos/2 MB. Não converter para MP3. O usuário pode ouvir, transcrever, revisar e enviar o texto. Microfone e URLs temporárias são liberados ao fechar/desmontar.
- Anexos: PDF, TXT, MD e áudio; até dois documentos e 16 mil caracteres por mensagem. PDF/áudio são lidos pelo n8n; o conteúdo é referência, nunca instrução de sistema. O binário não é persistido pelo aplicativo.
- `/api/company/jobs/assistant/media` exige sessão owner/admin, mesma origem e empresa ativa, valida limite e assinatura do arquivo. Emite autorização de uso único para a leitura, compartilhando o limite empresarial de 30 solicitações/hora. Credenciais de IA continuam apenas no n8n.
- Workflow `NTb1OmXykFRnRETw`: novas entradas `jbfd-test-job-authoring-stream` e `jbfd-test-job-media`, mantendo a entrada anterior. Versão publicada `8f2b6b31-01ab-4e4f-bb1b-ecf6288fd573`. Histórico de execução com conteúdo desativado. Fluxo temporário de teste removido antes da publicação.
- Verificação real do provedor: extração de PDF sintético (execução 1748) e transcrição de voz sintetizada (1749). Testes locais cobrem fragmentação do stream, revisão segura, isolamento empresarial, tipos/tamanho de arquivo e rejeição de campos não autorizados.

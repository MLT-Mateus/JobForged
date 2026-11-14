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

# Assistente de vagas: promoção Test → Live

Revisão de 22/11/2026, necessária à promoção autorizada pelo usuário.

## Problema corrigido

As rotas de conversa, arquivos e consumo de contexto recusavam Live e utilizavam webhooks fixos do Test. A promoção da imagem anterior deixaria o assistente indisponível em produção.

## Separação dos ambientes

- `APP_ENV=test` utiliza exclusivamente os webhooks `jbfd-test-job-*`.
- `APP_ENV=live` utiliza exclusivamente os webhooks `jbfd-live-job-*`.
- Ambiente ausente ou desconhecido recebe 404, sem acionar o provedor.
- Destinos são definidos no servidor. Nenhum parâmetro do cliente escolhe ambiente ou URL.
- Conversa, streaming, reparo de formato e leitura de arquivos usam a mesma política.
- O contexto temporário é consumido pelo banco configurado no próprio ambiente; sessão, empresa, função, origem, uso único, limites e revisão humana continuam obrigatórios.
- O assistente propõe alterações; ele não salva nem publica uma vaga.

## n8n

- Test: `NTb1OmXykFRnRETw` (preservado).
- Live: `0J1Jj67E6jeWxOWc`, projeto pessoal de Mateus, sem pasta.
- Mesmo modelo, prompt e 14 nós da versão validada em Test; somente os destinos/contextos e nomes específicos do ambiente foram ajustados.
- Live consulta `https://jobforged.com/api/company/jobs/assistant/context`.
- Histórico de dados de execução, incluindo erros e execuções manuais, desabilitado; timeout de 25 segundos.
- Credencial de modelo já existente na VPS, selecionada explicitamente. Sem cópia de usuários, arquivos, sessões ou credenciais de banco entre ambientes.

## Evidência de validação

Build, TypeScript e lint aprovados. Dezessete testes direcionados passaram, incluindo sessão, origem, organização, papel, proposta, streaming, reparo, arquivo, contexto, rejeição de ambiente desconhecido e contratos de recrutamento. As mesmas verificações de API rodam separadamente em Test e Live, com serviços isolados. Isso valida o código; a publicação e a saúde dos ambientes devem ser conferidas pelo SHA efetivamente implantado.

O webhook Live publicado recusou um pedido com token inválido antes de chamar o modelo. A validação autenticada em Live depende da promoção da aplicação e das migrations pelo fluxo protegido.

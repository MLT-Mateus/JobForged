# Logout e exclusão administrativa de empresas

## Escopo
Entrega exclusiva de Test. Nenhum cadastro real é excluído ao instalar código, migration, cron ou tarefa. Uma exclusão exige solicitação explícita na página de detalhes da empresa, nome exato, motivo e MFA recente real no servidor e no banco. Flags do navegador não provam MFA. Não há comando de limpeza global.

## Logout
Botão Sair da conta no cabeçalho de todas as páginas do Backoffice, inclusive Segurança e estados anteriores ao MFA. Usa /api/auth/sign-out, revoga a sessão e limpa cookies HttpOnly/recuperação. A revogação não exige MFA. Se o provedor falhar, o endpoint limpa cookies e informa que não confirmou revogação; a interface permite voltar ao login. Falha de rede sem resposta mantém erro/repetição.

## Exclusão
Empresas > Ver empresa > Excluir empresa > Revisar exclusão. Mostra vínculos, candidatos, imagens, histórico e relações removidas. Nome exato e motivo obrigatórios. Opção desmarcada por padrão permite apagar também contas Auth exclusivas sem dados independentes. Administradores e identidades compartilhadas são preservados. Guardas/advisory locks evitam vincular uma identidade enquanto ela é removida.

Solicitação suspende empresa, oculta página e desativa domínio; dados permanecem até backup. A fila privada é persistente, limitada e idempotente. Não é possível reativar/editar empresa pendente. Worker processa até 20 arquivos por lote, via Storage API com JWT curto restrito ao manifesto; não apaga apenas storage.objects nem usa service_role no aplicativo. O recurso de excluir empresa inteira é uma autorização diferente da limpeza de uploads órfãos: inclui versões publicadas e histórico, conforme confirmação explícita.

Após arquivos verificados como removidos, uma transação elimina configurações, versões, registros de imagem, reservas, quarentena, página, domínio, convites, vínculos, candidatos originados nesta empresa e seus PDFs, comunicações exclusivas e auditoria empresarial. Chaves estrangeiras desconhecidas bloqueiam, sem cascade genérico para tabelas novas. Contas exclusivas opcionais passam novamente por verificação das referências restantes e são excluídas via Auth nativo. Inbox próprio dessas contas é removido. Plataformas, outros vínculos, arquivos de outra empresa e dados independentes bloqueiam exclusão da identidade.

Mantém tombstone mínimo de segurança (UUIDs, responsável administrativo, horário, contadores e motivo) e backup protegido conforme retenção. Backup não é apagado como parte da operação. Não afirmar que zero registros pessoais globais permanecem quando o operador escolhe preservar contas ou quando há referências legítimas de outra empresa.

## Backup e operação
Antes de iniciar remoção, o worker exige backup de Test posterior à solicitação, checksums íntegros, restauração isolada e recibo de cópia criptografada externa. Nenhuma exclusão é liberada apenas por um booleano do navegador. Retentativa continua com o backup original verificado do mesmo job; não admite outro job com backup antigo.

Worker versionado scripts/security/process-test-company-deletions.py, instalado em /opt/jbfd/security-work; cron exclusivo Test a cada minuto, sem alterações em Live/Traefik. Não aceita parâmetro Live. Modo de teste exige três providers disposable sem portas e rede interna; só fixtures.

scripts/security/company-deletion-backup.ps1 usa o SSH/DPAPI existentes neste computador para consultar somente a contagem de pedidos e executar o coletor já aprovado quando necessário. Tarefa JobForged-Test-Deletion-Backup verifica a cada cinco minutos, sem backup quando não há pedido. Computador deve estar ligado, usuário conectado e SSH disponível; caso contrário a operação aguarda com mensagem clara. Não há novo serviço pago ou credencial. Instalação: install-test-deletion-backup-task.ps1.

## Validação
CI executa providers reais isolados para recusa de proprietário, visitante, administrador sem MFA; confirmação errada; logout antes do fator; suspensão/rejeição de reativação; proteção de arquivos até backup; remoção física via Storage, Auth exclusivo, preservação de outra empresa/identidade compartilhada, idempotência e auditoria mínima. BFF mocks verificam origem, sessão, payload, MFA e cookies. Não executar uma exclusão real para produzir evidências.

Live não recebeu migration, worker, tarefa nem deploy. Promoção futura requer aprovação explícita e preparação específica do worker/backup para Live; não copiar dados ou credenciais.

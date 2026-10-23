# Contratos de leitura — etapa aditiva de compatibilidade

Esta etapa prepara o aplicativo para a reorganização de segurança do PR #112.
Não representa conclusão das dez medidas de segurança.

- Migration nova 0017: `session_context_v1` e `company_read_v1`, com campos explícitos e contexto derivado da identidade autenticada.
- O aplicativo deixa de consultar diretamente empresas, equipe e auditoria no carregamento da sessão/empresa.
- Os grants anteriores permanecem disponíveis durante esta etapa, para preservar a imagem anterior enquanto os consumidores migram.
- Usuários comuns recebem da nova RPC os nomes e papéis ativos; e-mails e auditoria ficam restritos a owner/admin.
- A próxima etapa endurece os contratos e revoga os grants anteriores, após validar a publicação desta imagem.
- Novo check de PostgreSQL valida migrations, isolamento e projeções. Passa a bloquear publicação em conjunto com os checks existentes.
- Dependências MCP corrigidas para os advisories observados no CI: Zod 4.6.7 e transitivos compatíveis, sem relaxar a auditoria.

Ordem: backup/recuperação verificados → CI → integração em develop → aplicar 0017 pelo runner → deploy Test → conferir SHA/healthcheck e consumidores → continuar PR #112.

Limite de recuperação: esta imagem serve de base compatível para os contratos de leitura. Após ativar as demais garantias de segurança, não usar uma imagem sem essas garantias como rollback de segurança. A entrega final deve registrar o procedimento adequado ao estágio alcançado.

Live permanece sem autorização de alterações.

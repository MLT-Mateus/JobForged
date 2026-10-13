# Guia de promoção: Test → Live

## Objetivo

Manter o aplicativo e o schema do Supabase em paridade entre Test e Live. Live recebe somente uma versão já validada em Test, após aprovação explícita. O banco de dados permanece isolado por ambiente: promoção leva migrations, não contas nem dados.

## Regra de release

O artefato de aplicação é imutável e identificado pelo SHA completo do commit. A imagem publicada em Live deve ser exatamente a imagem validada em Test; não fazer novo build para Live. A promoção também deve aplicar as migrations incluídas naquele mesmo SHA.

### 1. Desenvolver

1. Criar branch de tarefa e Pull Request para `develop`.
2. Para qualquer mudança de schema, adicionar uma nova migration numerada em `supabase/migrations/`. Incluir tabelas, colunas, índices, RLS, funções e triggers no mesmo arquivo ou em migrations ordenadas.
3. Nunca alterar uma migration que já foi aplicada. Criar outra migration corretiva.
4. Preferir mudanças compatíveis com a versão anterior do app: adicionar antes de remover, migrar dados em etapas e remover elementos obsoletos em release posterior.
5. Passar CI. Se o PR contém migrations, antes de integrá-lo faça backup verificado de Test, disponibilize somente as migrations desse SHA em diretório temporário protegido na VPS, confira os checksums e aplique-as em Test. Se alguma falhar, não integre o PR.
6. Integrar em `develop`. O workflow publica automaticamente o SHA em Test.

### 2. Validar Test

1. Confirmar que o Test está saudável e identifica o SHA esperado em `/api/health`.
2. Depois do deploy em Test, confirmar que `/api/health` mostra o SHA esperado e que `public.jbfd_schema_migrations` contém os nomes/checksums esperados.
3. Testar o fluxo completo no navegador e os efeitos no Supabase: Auth, dados da empresa, RLS, funções, Storage e integrações afetadas.
4. Só aprovar a promoção depois de validar conjuntamente app e banco. Se não houver migration nova, registrar que o schema não mudou.

### 3. Promover para Live

1. Abrir Pull Request de promoção para `main`, preservando o commit validado em Test. Não usar squash/rebase que altere o SHA promovido.
2. Após integração em `main`, iniciar o workflow protegido `Promover versão para Live` com o SHA completo que está saudável em Test.
3. A aprovação no GitHub Environment `jbfd-live` é obrigatória. O workflow verifica que o SHA informado pertence a `main`, que a imagem existe e que o mesmo SHA continua ativo em Test.
4. Depois da aprovação do release, antes de iniciar o deploy da imagem, gerar e verificar backup de Live com `scripts/supabase-backup.sh live`.
5. Disponibilizar na VPS exatamente as migrations daquele SHA, conferir seus checksums e aplicá-las em Live. Confirmar que o ledger de migrations corresponde ao candidato validado em Test.
6. Somente depois da migration e das verificações de saúde, executar o workflow para implantar em Live a mesma imagem/SHA aprovada em Test. Conferir `/api/health` e validar o fluxo publicado.
7. Se backup, migration, checksum, aprovação ou healthcheck falhar, parar a promoção. Não contornar o bloqueio com edição manual no banco ou uma imagem diferente.

## O que acompanha a promoção

- Código frontend e backend, dependências travadas e imagem Docker do mesmo SHA.
- Migrations SQL do mesmo SHA, aplicadas separadamente em cada banco e verificadas por checksum.
- Alterações de configuração versionadas que pertençam ao app, revisadas por ambiente.

## O que não é copiado

- Dados de usuário/empresa, sessões, Storage e conteúdo do banco.
- `.env`, chaves, senhas, URLs privadas ou outras credenciais. Cada ambiente conserva seus próprios valores.
- DNS, serviços da automação ou serviços MCP que não façam parte da release do app.

## Estado da automação e bloqueio atual

Hoje, GitHub Actions automatiza CI, build e deploy da imagem em Test. O workflow de Live também publica uma imagem identificada por SHA, e agora valida que esse mesmo SHA está ativo em Test. **A aplicação de migrations ainda não faz parte desses workflows.** O script `scripts/supabase-migrate.sh` existe, mas a execução exige acesso operacional controlado ao banco e backup prévio.

Até existir um job/gateway de migrations integrado e validado nos dois ambientes, não considerar automática uma promoção que contenha mudança de schema. A mudança de app pode ser automatizada em Test, mas uma migration continua sendo uma etapa operacional explícita; em Live, nenhuma migration deve rodar fora do fluxo protegido e da aprovação do release.

## Rollback

O deploy pode restaurar a imagem anterior se o healthcheck do app falhar. Isso não desfaz migrations. Por isso, migrations devem ser compatíveis com a imagem anterior e o backup do banco deve ser verificado antes da execução. Restaurar dados é uma operação separada, com análise de impacto e decisão explícita; nunca fazer rollback de banco automaticamente.

# JobForged: GitHub, Live e Test

## Origem oficial do código

- O repositório `MLT-Mateus/JobForged` é a origem oficial do código e do histórico.
- `develop` representa o ambiente Test (`https://test.jobforged.com`). `main` representa Live (`https://jobforged.com`).
- A VPS executa as imagens; não editar código diretamente dentro do container ou release implantado.
- Trabalhar em branch de tarefa e Pull Request. O CI deve passar antes de integrar em `develop` ou `main`.
- Test recebe a versão de `develop` após CI aprovado e configuração explícita do deploy automático.
- Live é promovido manualmente a partir de um SHA já integrado em `main` e que tenha sido validado em Test. Exigir aprovação do ambiente protegido `jbfd-live`.
- Nunca iniciar deploy Live, alterar DNS ou alterar a configuração de produção sem instrução explícita do usuário na conversa.
- Nunca guardar, imprimir, copiar para Git ou solicitar que o usuário cole aqui valores de `.env`, tokens, chaves SSH ou senhas. `.env` reais vivem apenas na VPS; GitHub Actions usa secrets e variables protegidos.
- Não usar Vercel nem Sites como origem da implementação deste projeto.
- Não reescrever histórico nem fazer force push.

## Regra permanente de paridade Test → Live

- `develop` é a área de validação. Nenhuma mudança de produto deve ser feita diretamente em Live ou apenas na branch `main`.
- Uma publicação Live só pode usar o mesmo SHA de aplicação que está atualmente saudável em Test e foi aprovado pelo usuário. Não reconstruir uma imagem diferente para Live.
- Mudanças de banco devem vir em uma migration SQL numerada, nova e imutável em `supabase/migrations/`. Nunca editar migrations já aplicadas nem fazer alteração de schema manual no Studio.
- Aplicar e validar migrations em Test com backup verificado antes de considerar a funcionalidade pronta. Aplicar em Live exatamente as migrations do SHA aprovado, após backup Live e autorização do ambiente protegido. Se uma migration ou verificação falhar, interromper a publicação do app.
- Migrations de produção devem ser compatíveis com a imagem Live anterior para permitir rollback do app sem rollback improvisado do banco.
- A mesma promoção deve incluir frontend, backend, dependências e migrations do SHA Test. Segredos, DNS, configurações específicas de ambiente, usuários e dados de clientes não são copiados entre ambientes.
- Nunca copiar o banco ou dados pessoais de Live para Test como parte de deploy. Refresh de dados é operação separada, manual e sanitizada.
- O deploy atual aplica automaticamente a imagem em Test; não aplica migrations automaticamente. Até a automação de migrations ser concluída e verificada, uma publicação que dependa de alteração de schema fica bloqueada até a migration ter sido aplicada e confirmada em Test e existir um passo controlado equivalente para Live.

## Estado atual do produto

Test possui cadastro empresarial freemium e login Supabase self-hosted, com sessões em cookies HttpOnly e isolamento empresarial por RLS. O banco de Live deve permanecer separado e só pode receber cadastros públicos com SMTP configurado e confirmação de e-mail ativa. Asaas/pagamentos e integração funcional do aplicativo com n8n ainda não estão implementados. Não afirmar que esses recursos existem até verificar o código e a configuração do ambiente.

## Regra permanente do Design System

O Design System e a biblioteca compartilhada de UI são a única fonte de verdade para tokens visuais e componentes reutilizáveis. Para cada criação ou atualização:

1. Inspecionar o Design System, tokens compartilhados e componentes existentes antes de editar telas.
2. Reutilizar tokens e componentes aprovados antes de criar elementos visuais.
3. Não duplicar implementações de componentes nem estilos de cor, tamanho ou estado no nível da página quando já existir definição compartilhada.
4. Incluir componentes ou estados ausentes na biblioteca compartilhada e no Design System, usando a mesma implementação nas telas afetadas.
5. Validar as páginas afetadas depois de cada mudança e confirmar que continuam usando as definições compartilhadas.
6. Relatar tokens e componentes reutilizados ou alterados e corrigir definições duplicadas relacionadas.

## Badge de triagem

A correção vertical adicional aprovada de 34px está em `app/globals.css`: `.phone-quality` usa `top: 420px` por padrão e `top: 450px` na regra responsiva existente. Manter uma única fonte de verdade. Não reintroduzir `app/phone-layout-overrides.css` nem regra `!important` de sobrescrita.

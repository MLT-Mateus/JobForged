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

## Limites atuais do produto

A base 0.00 contém a landing page, Design System, biblioteca compartilhada e telas existentes com dados demonstrativos. Não afirmar que autenticação real, banco de produção, Supabase, Asaas ou integração de n8n já estejam implementados.

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

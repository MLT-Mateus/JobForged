# Ícone do remetente em caixas de e-mail

O ícone ao lado de `JobForged <suporte@jobforged.com>` é escolhido pelo provedor da caixa de entrada. A imagem no corpo dos e-mails transacionais já é independente desse ícone.

## Estado observado em 15/10/2026

- O domínio publica `_dmarc.jobforged.com` com `p=none`; o Gmail exige `quarantine` ou `reject` e `pct=100` para BIMI.
- Não foi encontrado registro `default._bimi.jobforged.com`.
- O símbolo já está disponível em `public/brand/jobforged-symbol.png` e `public/brand/jobforged-symbol.svg`, mas o SVG atual não foi preparado nem certificado para BIMI.
- O avatar quadrado para cadastro de perfil foi preparado em `public/brand/jobforged-avatar.png` (512 × 512). Ele não altera a foto do remetente até ser configurado no serviço que a caixa destinatária consulta.
- O remetente transacional configurado no projeto é `suporte@jobforged.com` via Brevo. A Brevo não controla diretamente a foto que Gmail ou Titan mostram ao destinatário.

## Passos para publicar BIMI

1. Inventariar todos os serviços que enviam mensagens como `@jobforged.com`, inclusive Brevo e Titan. Conferir alinhamento SPF/DKIM/DMARC nos cabeçalhos de mensagens reais de cada serviço.
2. Corrigir os remetentes que falharem. Depois, elevar a política DMARC de forma controlada até `quarantine` ou `reject` com `pct=100`. Alterar essa política antes do inventário pode prejudicar a entrega de mensagens legítimas.
3. Preparar uma versão quadrada do símbolo em SVG Tiny PS, conforme os requisitos do Gmail, e contratar um certificado de marca VMC ou CMC de uma autoridade aceita. A compra e a validação da marca dependem de decisão e documentação do titular.
4. Hospedar o certificado PEM em HTTPS e publicar o registro TXT `default._bimi.jobforged.com` com a URL do PEM. Verificar propagação, autenticação dos e-mails e exibição em caixas compatíveis. O provedor destinatário ainda decide se mostrará o ícone.

O Titan informa que sua foto de perfil é configurada na própria caixa Titan e tem visibilidade limitada aos clientes que a suportam. Isso não define a foto de e-mails transacionais enviados pela Brevo. Para a marca do remetente em caixas externas, usar BIMI e confirmar o suporte de cada cliente.

## Alternativa rápida específica para Gmail

A Titan documenta associar o endereço corporativo a uma Conta Google e configurar a foto dessa Conta Google para que destinatários no Gmail vejam o avatar. A verificação chega na caixa corporativa e a senha da Conta Google deve ser definida pelo titular. Essa alternativa não substitui BIMI, não funciona em todas as caixas e precisa ser validada com um e-mail transacional real enviado pela Brevo.

Use `public/brand/jobforged-avatar.png` como foto de perfil. A Conta Google deve estar associada especificamente a `suporte@jobforged.com`, o endereço que aparece como remetente das mensagens transacionais. Após salvar, o Gmail pode levar algum tempo para atualizar a imagem.

Fontes: [Google: configurar BIMI](https://support.google.com/a/answer/10911320), [Brevo: implementar BIMI](https://help.brevo.com/hc/en-us/articles/27769318543506-Implement-BIMI-to-display-your-logo-next-to-your-emails), [Titan: foto de perfil](https://support.titan.email/hc/en-us/articles/12499761435545-Profile-picture-for-your-Titan-account), [Titan: foto para destinatários Gmail](https://support.titan.email/hc/en-us/articles/900005426463-Add-a-profile-image-for-recipients-on-Gmail).

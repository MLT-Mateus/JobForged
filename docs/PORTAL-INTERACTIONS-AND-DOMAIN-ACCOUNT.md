# Interações legíveis e conta no domínio empresarial

Destino inicial: Test. Sem migrations ou alteração de identidade de clientes.

## Cores

A regra genérica de links do portal exclui `.jf-action`, preservando o foreground calculado do botão sólido. Textos Rich Text dentro de controles herdam o foreground acessível, inclusive quando conteúdo legado contém cor explícita. O utilitário compartilhado color-contrast.ts centraliza contraste, mistura, foreground e interação de navegação. Foreground prioriza contraste forte; bordas de botão buscam3:1 com a superfície.

Cabeçalho e rodapé usam jf-nav-link: cor e fundo de interação próprios, calculados para o fundo real de cada região, e estados hover/foco/ativo. O rodapé lê uma propriedade de estado em vez de sobrepor cores por especificidade; links de navegação são texto simples. Formatos, alturas e foco reutilizam tokens UI. DS→Cores demonstra navegação e rodapé nos dois temas. Não remove cores semânticas.

## Conta no domínio atual

Entrar abre o modal da página empresarial, inclusive em hostname próprio verificado. Cadastro e solicitação de recuperação ficam nesse modal; alertas/perfil/currículo continuam no painel contextual. Não encaminha para o domínio central para abrir a conta. Cookies são HttpOnly, Secure em produção, SameSite=Lax e host-only: não copiados entre domínios; login no domínio central não autentica automaticamente no domínio empresarial.

O proxy exige resolução pública do hostname verificado/ativo antes de liberar a lista exata de métodos e endpoints de conta. Painéis/app/backoffice, gestão de empresa, APIs nativas e endpoints não listados continuam bloqueados. POST conserva verificação Same-Origin e gateway/quotas existentes. Cadastro em domínio próprio valida no servidor que o slug fornecido corresponde à empresa resolvida; não confia somente no navegador.

A solicitação de recuperação abre no modal. Links de confirmação/redefinição enviados por e-mail continuam usando o fluxo central aprovado do Auth; não altera allowlists de redirect, SMTP, mecanismos de recuperação ou segredos. O acesso direto ao antigo caminho /recuperar-senha em hostname empresarial mantém seu encaminhamento seguro existente; não é mais usado pelo botão do perfil.

## Validação

Contraste extremo de ação, foreground e bordas; navegação contra fundos claro, escuro, amarelo e azul; UI real de botão âncora, header/footer e foco. BFF isolado testa conta no domínio conhecido, CSRF, domínio desconhecido, cadastro com empresa divergente e bloqueio dos painéis. Nenhum envio de e-mail, cadastro ou alteração de senha real para gerar evidência.

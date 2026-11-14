# Destinatários transacionais — auditoria Test

| Ação | Fonte autorizada do destinatário |
|---|---|
| Cadastro empresarial / boas-vindas | E-mail validado usado no cadastro |
| Cadastro de candidato / convidado | E-mail do cadastro; convidado precisa corresponder ao token |
| Recuperação / reenvio de confirmação | Endereço solicitado; existência não é revelada |
| Troca de e-mail | Novo endereço repetido e confirmado, após reautenticar o usuário da sessão |
| Convite pela empresa | E-mail validado do convite da empresa ativa |
| Convite/reenvio pelo backoffice | Endereço retornado pelo convite persistido; reenvio preserva o destinatário original |
| Entrevista | E-mail atual da conta do candidato vinculado à candidatura do agendamento |
| Comunicado | E-mail atual da conta selecionada; público e permissões são reconferidos no banco |

Todos os transportes de e-mail da aplicação rejeitam endereço ausente, lista de caixas, nome com endereço e caracteres de cabeçalho. Não há fallback para titular, operador ou suporte; não há CC/BCC implícitos.

## Verificação sem entrega
- Testes de transporte usam exclusivamente `example.invalid` e interceptam toda chamada externa.
- Testes da aplicação compilada rodam com `APP_ENV=test`, Auth/banco simulados e transporte Brevo interceptado. Qualquer destino de rede inesperado falha.
- A consulta real de destinatário da entrevista é exercitada no banco isolado do CI com fixtures sintéticas e rollback.
- Nenhum cadastro, recuperação, convite ou campanha real foi disparado para validar esta mudança.
- Os modelos de candidatura recebida/nova candidatura estão no catálogo, mas não há disparo de e-mail conectado a esses modelos atualmente. Não são apresentados como fluxos de entrega existentes.

A auditoria verifica regras e isolamento; sem assunto/endereço do incidente anterior, não atribui uma causa específica àquela mensagem.

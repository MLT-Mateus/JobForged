# Banners compactos, duração individual e campos do backoffice

## Implementação

- `CommunicationBanner` compartilhado entre Home, prévia e Design System: somente
  imagem com borda e setas laterais sobrepostas; sem legenda, CTA ou contador.
  O link opcional usa a imagem inteira, com título como nome acessível.
- Mesmas proporções aprovadas: desktop 820×312; mobile 640×360.
- `duration_seconds` por banner: padrão 8, inteiro entre 5 e 120; input compartilhado,
  validação HTTP e SQL, persistência e auditoria. Edições por versões anteriores
  preservam a duração quando o campo não é enviado. Controle de versão preservado.
- Um único setTimeout por carrossel com mais de uma imagem. Sem polling ou contador
  atualizado por segundo. Pausa em hover/foco, fora da área visível, aba oculta e
  preferência por movimento reduzido; limpeza do timer e listeners ao desmontar.
- Placeholders contextuais nos campos de busca, edição cadastral, configurações,
  convite, motivo administrativo, perfil, banners e notificações. Componentes
  TextField/TextAreaField/SelectField aprovados preservados, sem inputs paralelos.
- Design System demonstra a mesma implementação com tempos de 8 e 12 segundos.

## Banco e verificações

Migration nova e imutável 0014. Backup Test verificado antes da aplicação:
`/opt/jbfd/backups/supabase/test-20261019T210213Z`. Runner confirma 14 migrations.

Verificação real SQL em transação revertida: criação com 5s, edição para 120s,
leitura, rejeição de 0/4/121/null/string/fracionário, conflito de versão, ausência
de autorização, auditoria e compatibilidade com requisições sem duração.
TypeScript sem erros. Validação completa do CI e conferência publicada acompanhadas
no PR e nos documentos externos de continuidade.

Live não alterado. Imagens e banners existentes preservados.

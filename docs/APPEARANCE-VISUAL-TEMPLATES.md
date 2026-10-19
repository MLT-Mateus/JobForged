# Aparência visual por empresa — Test

Referência consultada, sem alteração: Mantevida `/painel/aparencia`.
Nenhuma credencial armazenada no código ou nos documentos.

- Cartões visuais Clássico, Equipe, Panorama, Foco nas vagas e Essencial.
  Seleção preserva textos, imagens, cores e tipografia; altera a composição da
  prévia de carreiras. Modelo e renderer compartilhados com o Design System,
  página Aplicação. Logo e capa reutilizam upload privado validado existente.
- Página inicial de Aparência com templates em largura completa, edição de logo,
  capa e mensagem junto à prévia. Abas de marca, cores, tipografia, estrutura,
  banners, conteúdo e domínio preservadas. Descrições repetidas removidas.
- Salvar e publicar somente no cabeçalho. Histórico, descarte, restauração e
  recarga ficam em Mais opções. Barra inferior e progressos duplicados removidos.
- Sem Beta no menu/página de personalização, conforme pedido explícito.
  Campos indisponíveis continuam desabilitados com estado neutro Em breve.
  Páginas públicas e login mantêm indicação discreta de prévia: não foi criada
  publicação pública, domínio ou cadastro de vagas nesta atualização.
- `portal.layout` opcional, validado no cliente/servidor/banco. Migration0015
  nova adiciona validação por enum sem atualizar documentos existentes.
  Snapshots antigos continuam válidos e exibem Clássico como padrão.
  Permissões, isolamento, contraste, histórico e controle de versão preservados.

Backup Test verificado: `/opt/jbfd/backups/supabase/test-20261019T215450Z`.
Runner confirma15migrations. Verificação SQL com rollback: cinco templates,
salvamento, publicação, leitura, histórico/restauração, rejeição de valores
inválidos/null e documento legado. Sem alteração persistente de empresas reais.
TypeScript local aprovado. Resultados finais de CI/publicação e evidências
registrados no PR e documentos externos de continuidade. Live preservado.

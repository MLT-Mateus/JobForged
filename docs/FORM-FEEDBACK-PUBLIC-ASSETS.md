# Formulários, balões e imagens públicas — Test

## Fonte compartilhada

- FocusPopover abre abaixo se couber; caso contrário, acima ou no lado com mais espaço. Usa a camada superior nativa, limita largura/altura à viewport, permite rolagem interna e recalcula em rolagem/redimensionamento com requestAnimationFrame. Escape/clique fora fecham; foco e tokens são preservados, inclusive em dialogs. Sem polling.
- FieldFeedback associa erro ao name estável do campo. revealField ativa a aba, expande details ancestrais, rola e foca após renderização. Preserva valores; reduz movimento conforme preferência. TextField, ColorField e RichTextField usam erro associado/aria-invalid/aria-describedby. AppToast e som existentes são preservados com as preferências do usuário. Demonstrado em Formulários e aplicado à Personalização.
- Linhas de links têm separadores apenas entre registros, sem traço final.
- NotificationTrigger distingue Entrar/LogIn de Minhas notificações/Bell. Contador flutuante vermelho não altera dimensões; limite visual99+. Contagem própria vem do servidor, sem obter dados de terceiros. Atualização inicial, ao reabrir e ao retomar a página; sem polling contínuo.

## Imagens: causa confirmada e proteção

Em30/10/2026, /jobforged referenciava imagens pela projeção pública autorizada /api/portals/jobforged/assets/:id. Ambas retornavam503; logs do BFF registraram Storage read401. O gateway negava todo Storage sem session_id, mesmo para anon JWT e imagens cuja leitura era permitida pela RLS existente.

Correção permite encaminhar somente GET de PNG empresarial com hint de JWT anon; o provedor ainda verifica assinatura e aplica RLS de publicação ativa. Hint não concede autorização. Sem upload, listagem, assinatura de URL, documentos privados, imagens administrativas ou rascunhos públicos. Buckets permanecem privados e credencial pública de privilégio mínimo. Sem cópia/remoção de arquivos ou credencial service_role. Testes nativos percorrem agora gateway + Auth/PostgREST/Storage reais em ambiente descartável, com publicação, suspensão, retirada, outro tenant, JWT inválido e upload anônimo negado.

Migration nova0036 preserva operação/grants de candidate_account e acrescenta contador próprio de notificações não lidas em todas as páginas. Nenhum dado de terceiros retornado. Aplicar pelo runner somente após backup/restauração isolada/cópia cifrada verificados.

Live não autorizado para alterações nesta tarefa. SHA, CI, publicação e resultados finais são registrados na continuidade operacional após execução.

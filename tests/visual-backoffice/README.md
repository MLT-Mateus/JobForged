# Conferência visual isolada do backoffice

Na raiz do checkout: `node tests/visual-backoffice/server.mjs`.
Abrir `http://127.0.0.1:5184/backoffice` no navegador.

Usa os componentes/CSS reais e somente dados sintéticos. O servidor escuta em 127.0.0.1, não usa contas, chaves ou bancos de Test/Live e não encaminha requisições. Todas as mutações são recusadas com 503 para conferir preservação dos dados e feedback. Não remova essa restrição para testar operações reais.

Rotas: visão geral, empresas/detalhe, usuários, convites, comunicação interna, configurações, auditoria, segurança e integrações. As coleções possuem mais de uma página, nomes longos e estados diferentes.

Use `?scenario=empty`, `?scenario=error` e `?scenario=mfa` nas coleções. Segurança usa por padrão `aal2` expirado; `?scenario=security-fresh` inicia com 12 segundos de confirmação para verificar a expiração visual. Nenhum desses cenários pertence à aplicação publicada.

Confira 1280 px, 390 px e 320 px, claro/escuro, Lista/Blocos, paginação, retorno de filtros, diálogos com valores modificados, falhas e cancelamento. O rascunho de banner é local ao navegador e usa a conta fictícia; descarte-o pelo editor ao terminar.

Resultados e limites: [revalidação](../../docs/UX-AUDIT-REVALIDATION-2026-11-22.md). Isso não substitui autorização/servidor: SQL, Auth/Storage e API são verificados pelo CI, e a conferência autenticada do BO publicado exige uma conta com esse papel.

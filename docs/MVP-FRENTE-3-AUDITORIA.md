# Frente 3 — identidade empresarial persistente (Test)

## Base e preservação

Checkout oficial verificado: `C:\Users\suporte01\Documents\JobForged`, remoto `MLT-Mateus/JobForged`. Árvore limpa em `develop`, SHA Test `2f28b785b8fdd829f4c349c863a11e214905bc6e`, saúde confirmada antes de editar. Branch `feat/test-company-branding-3`. Instruções AGENTS, contexto, plano e relatórios 2.5/2.6 lidos. Não houve alteração de Live ou início da Frente 4.

Existiam sete seções visuais, uploads como data URLs, rascunho/publicação/histórico no localStorage e contexto demonstrativo. O shell lia uma chave global sem conferir a empresa. Os três seletores de fonte antigos não representavam os quatro pares aprovados. Não foi encontrado portal empresarial público funcional; vagas continuam locais/demonstrativas conforme o inventário anterior.

## Implementação

| Controle | Persistência e consumidor |
|---|---|
| Nome, nome curto, slogan | Dados por empresa; shell empresarial e prévias. Não altera o nome cadastral/legal da empresa. |
| Logo principal/alternativa/claro/escuro | PNG privado persistente; seleção pelo tema no shell e nas prévias. |
| Ícone/favicon e avatar | Favicon restrito à navegação empresarial, restaurado ao sair; ícone no menu e avatar no rodapé. |
| Cores | Mesmo modelo/tokens no shell, Home e visualizações de vagas; prévia clara/escura. Cores semânticas de status preservadas. |
| Tipografia | Catálogo único do DS: Montserrat/Open Sans; Poppins/Inter; Manrope/Open Sans; Lora/Inter. Títulos e leitura separados. Fontes já declaradas no projeto; navegador busca as famílias utilizadas. |
| Tema e densidade | Preferência existente do usuário respeitada quando permitida; padrão empresarial aplicado sem mudar o tema institucional global. Densidade controla entrelinha. |
| Carregamento | Animação aprovada da JobForged opcional nos estados internos. Nenhum upload de animação/código. O portão de autenticação inicial mantém a identidade institucional. |
| Imagens de fundo | Painel/textura decorativos com superfícies de leitura opacas; login/portal/capa apenas nas prévias correspondentes. |
| Banners | Persistidos por empresa; ordem, situação, texto/link/imagem; ativos da Home são consumidos pelo componente real. Portal apenas em prévia. Agendamento desabilitado e marcado Em breve. |
| Textos, navegação e blocos do portal | Salvos e apresentados nas prévias existentes; não criam página pública ou publicação de vagas. |
| Domínios | Desabilitados/Em breve; sem DNS, subdomínio ou domínio personalizado. |
| Imagem de compartilhamento | Armazenada como preparação; nenhum metadado público é anunciado como aplicado. |

`branding-model.ts`, `font-pairs.ts` e `company-branding.css` concentram modelo, padrões, seleção de tema, fontes, cores e aplicação de tokens. `CompanyPanelPreview` é a mesma implementação demonstrada no DS e no editor. DS, backoffice e páginas institucionais não recebem identidade de clientes. A seção Tipografia do DS ganhou uma demonstração interativa isolada; a identidade institucional permanece igual.

## Rascunho, publicação e concorrência

- Salvar rascunho é explícito. Alterações locais não salvas e diferenças em relação à versão publicada são indicadas separadamente.
- Publicar exige confirmação e troca a versão consumida pelo painel; não publica um portal ou uma vaga.
- Cada mutation exige a versão esperada, bloqueia a linha e incrementa a versão. Conflito retorna HTTP 409 e preserva os campos locais. Recarregar dados exige confirmação quando há campos não salvos.
- Descartar substitui o rascunho pela versão publicada, incluindo alterações já salvas no rascunho. Restaurar padrões usa nome da empresa autenticada e valores padrão JobForged.
- Restaurar uma publicação cria um novo estado de rascunho. A versão publicada só muda após nova publicação.
- Publicações geram snapshots imutáveis. A interface mostra as últimas 50; todo o histórico continua no banco. Autor e datas vêm do servidor, não de nomes demonstrativos do cliente.
- Nenhuma chave local legada é lida como identidade. Não há importação automática porque sua origem empresarial não é comprovável.

## Segurança e armazenamento

Migrations novas `0008_company_branding.sql`, `0009_branding_surface_contrast.sql` e `0010_branding_published_asset_visibility.sql`, sem editar as anteriores: tabelas de estado/histórico/ativos com RLS e sem acesso direto de clientes; RPCs derivam empresa da identidade verificada e ativa, respeitando suspensão. Titular/administrador editam; membro consulta somente a publicada, sem rascunho ou histórico. Administrador de plataforma não ganha acesso empresarial nesta frente.

Bucket `company-branding` privado. Sessões comuns não podem acessar objetos brutos nem contornar o processamento pela API Storage. Credencial dedicada de servidor usa papel `authenticated`, assunto técnico sem conta e claim restrita, autorizados somente para leitura/inserção imutável nesse bucket. Não é uma service-role key e não acessa empresas/RPCs empresariais. Seu valor nunca foi exibido, enviado ao navegador ou versionado. Configuração Test em arquivo protegido; renovação em até 365 dias pelo script root-only. Live não foi configurado.

Uploads: autenticação/permissão e mesma origem, limite do stream e do arquivo, assinatura/mime, PNG/JPEG/WebP estático, até 5 MB/16 milhões de pixels; reencode para PNG e remoção de metadados com sharp. SVG/HTML/código/animações rejeitados. Objetos possuem caminhos UUID imutáveis; referências exigem registro e objeto da empresa correta. Membros só acessam imagens referenciadas na identidade publicada; editores podem pré-visualizar os ativos de rascunho. A API de imagem verifica sessão/empresa/hash/tamanho e responde PNG, `nosniff`, política restrita e sem cache compartilhado. URLs da aplicação usam HTTPS em Test.

Substituir/remover uma referência não apaga o arquivo nem versões anteriores. Se houver falha entre upload e registro, pode restar objeto não referenciado; não há coleta destrutiva automática. A verificação operacional usou uma pequena imagem técnica não pessoal sem registro empresarial, mantida privada como probe.

Backup verificado antes da migration: `/opt/jbfd/backups/supabase/test-20261019T174003Z` (dump, Storage, checksums, gzip/tar). Migrations aplicadas em Test pelo runner com checksum. A 0009 completa a proteção de contraste de texto/links em todas as superfícies; a 0010 restringe imagens de rascunho aos editores. Nenhuma migration já aplicada foi modificada. Backups adicionais verificados: `/opt/jbfd/backups/supabase/test-20261019T180157Z` e `/opt/jbfd/backups/supabase/test-20261019T180409Z`. Configuração da credencial: `scripts/configure-test-branding-storage.py`; verificação privada: `scripts/verify-test-branding-storage.py`. Nenhuma nova conta ou papel administrativo foi criado.

## Arquivos principais

- `app/api/company/branding/`: leitura, escrita, upload, leitura privada e transporte Storage.
- `app/components/personalization/`: serviço HTTP, modelo compartilhado, editor, contextos/consumidores, prévia e demonstração DS.
- `app/components/admin/AdminModuleClient.tsx`, `ui/WorkspaceShell.tsx`, `ui/WorkspacePatterns.tsx`, `admin/feature-availability.ts`: aplicação empresarial e disponibilidade correta.
- `app/home/HomeClient.tsx`, `app/components/jobs/JobWizardClient.tsx`: identidade e banners publicados, sem implementar persistência de vagas.
- `app/lib/branding-image.ts`, `package.json`, `package-lock.json`, `vite.config.ts`: processamento nativo seguro e carregamento Node correto.
- `tests/branding-model.test.mjs`, `branding-api.test.mjs`, `branding-security.sql`, `branding-fixture.mjs`; `scripts/test-node-runtime.mjs`: cobertura de modelo/API/banco/runtime Docker.

## Verificações e limites

- Banco Test real, transação com rollback: duas empresas, titular/membro/plataforma, rascunho distinto da publicada, quatro fontes, conflito de versão, contraste, estruturas e URLs inválidas, histórico/restauração/descarte, imutabilidade, suspensão, bloqueio de acesso bruto ao Storage e ausência de acesso empresarial pela credencial técnica. Fixtures revertidas.
- API com Auth/Storage simulados: visitantes/papéis/origem, HTTP 409, upload processado, leitura privada, hash adulterado e SVG disfarçado. Estes testes não são login humano nem upload autenticado real de cliente.
- Modelos/processador locais: padrões isolados, pares tipográficos, contraste automático dos botões, conversão de raster e rejeição de formatos/tamanhos inválidos.
- Storage Test real: upload 200, leitura 200, integridade verdadeira, anônimo negado (400 do Storage), RPC empresarial negada (403) para credencial técnica.
- Demonstração compartilhada conferida no navegador local nos dois temas e larguras 390/820/1280, sem rolagem horizontal da página/menu. Capturas guardadas fora do repositório, com rótulo local ou publicado conforme a origem.
- Lint, TypeScript, build, testes, CI, SHA e healthcheck finais são confirmados na entrega. Docker smoke inclui a rota nativa de upload para verificar dependências na imagem standalone.

Pendências: não houve sessão empresarial autenticada disponível no navegador; login real, edição/upload/publicação visual por usuário e persistência em outro dispositivo humano devem ser auditados sem confundir os testes acima com essa cobertura. As pendências autenticadas da 2.6 não foram declaradas resolvidas.

Portal público, persistência de vagas, candidaturas e aplicação pública da identidade dependem da Frente 4. “Tempo/formato da página” continua indefinido; não foi criado agendamento. Não foram inventados novos layouts, fontes, importação legada, domínios, cobrança ou edição de identidade pelo backoffice.

## Roteiro curto de auditoria

1. Entrar em Test como empresa autorizada e abrir Personalização; confirmar que nome e dados não vêm de outra empresa ou de armazenamento local antigo.
2. Alterar nome/cores/fonte e enviar uma imagem PNG/JPEG/WebP. Conferir prévias móvel/desktop, salvar rascunho, sair/entrar e verificar a persistência.
3. Confirmar que rascunho não mudou o painel de outra sessão; publicar e recarregar essa sessão. Conferir shell, Home, favicon e Modo candidato.
4. Abrir duas sessões de edição; salvar em uma e tentar salvar a versão antiga na outra. Deve informar conflito e manter seus campos.
5. Conferir histórico e restaurar como rascunho; publicar apenas após revisão. Testar membro sem edição e empresa suspensa sem acesso. Validar antes de autorizar a Frente 4 ou qualquer promoção Live.

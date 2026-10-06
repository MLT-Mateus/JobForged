# Inspeção da JBFD — base 0.00

Versão técnica: `0.0.0`. Data da revisão: 2026-10-06.

## Melhorias incluídas nesta base

- Imports, variáveis e diretivas ESLint sem uso removidos.
- Dependências dos efeitos de vagas corrigidas com callbacks estáveis.
- Imagens de marca centralizadas em `BrandAsset`, com `next/image`, dimensões
  explícitas e SVG sem processamento desnecessário. Tokens e estilos compartilhados preservados.
- Checagem TypeScript incluída; tipos do runtime atual declarados sem ativar D1.
- ESLint exige zero avisos; build, artefato e testes continuam obrigatórios.
- Actions oficiais atualizadas e fixadas por SHA; permissões de leitura no CI.
- Execuções antigas do CI canceladas quando uma nova versão chega à mesma branch.
- Node 22 documentado; versão e lockfile alinhados em `0.0.0`.
- Cache TypeScript e chaves locais ignorados; finais de linha padronizados.
- README atualizado para refletir o sistema atual e as integrações futuras.
- Histórico preservado para recuperação; sem force push e sem ocultar falhas antigas.

## Verificações de aceitação

O resultado efetivo de cada execução é registrado no CI do commit, não neste
arquivo. Para aceitar a base, verificar:

- [ ] `npm ci` instala o lockfile sem conflito de dependências.
- [ ] `npm run lint` termina com zero erros e zero avisos.
- [ ] `npm run typecheck` termina sem erros.
- [ ] `npm test` constrói e valida o artefato e passa os testes.
- [ ] Sites publica a fonte aprovada com sucesso.
- [ ] GitHub contém a mesma árvore Git da versão publicada.
- [ ] CI do novo commit termina com sucesso, sem novos checks Vercel.
- [ ] Inspeção dos arquivos rastreados não encontra credenciais evidentes.

Os checks antigos da Vercel permanecem como histórico. Não bloqueiam o build
atual por si só. Configuração de proteção de branches e alertas privados de
segurança exige inspeção das configurações do GitHub; não presumir que estejam
ativos ou resolvidos a partir de um CI verde.

## Próxima etapa: VPS (ainda pendente)

- [ ] Validar o runtime atual em Node/Docker e ajustar dependências do Sites.
- [ ] Empacotar todas as rotas e assets existentes na mesma imagem.
- [ ] Configurar homologação e produção com domínios, credenciais e dados separados.
- [ ] Testar rotas, formulários, arquivos, tema e persistência em homologação.
- [ ] Definir backups, restauração e rollback antes da troca do domínio.
- [ ] Adicionar Supabase, autenticação real, n8n e Asaas em etapas próprias.
- [ ] Implementar o MCP de desenvolvimento com acesso limitado ao necessário.
- [ ] Promover a imagem aprovada para produção e validar o domínio.
- [ ] Atualizar a regra de origem/publicação em `AGENTS.md` após a migração.

Esta base organiza o código e suas verificações. Ela não certifica a execução na
VPS e não implementa as integrações futuras.

## Auditoria de dependências em 2026-10-06

A auditoria npm inicial encontrou 32 alertas (1 crítico, 24 altos, 6 moderados e
1 baixo). Foram atualizados Next, React/RSC, Vite, ESLint Next, ferramentas
Cloudflare e dependências transitivas compatíveis. O lockfile registra as versões.

Dois overrides direcionados evitam atualizações maiores desnecessárias do runtime:
`vinext > image-size` usa `2.0.4`; `@esbuild-kit/core-utils > esbuild` usa `0.25.12`.
Reavaliar e remover esses overrides quando as dependências principais incorporarem
as correções. Build, HTML renderizado e geração Drizzle devem ser verificados.

Resultado: **8 alertas altos, zero críticos, zero moderados e zero baixos**.
Os oito decorrem de uma única vulnerabilidade raiz de `braces` e de sua cadeia
`micromatch`/`fast-glob`, presente nas ferramentas ESLint e Vinext.
Não foram suprimidos nem declarados resolvidos.

Referência: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
A base pública informa que não existe versão corrigida de `braces` até a revisão.
Forçar a sugestão npm de downgrade do ESLint Next não é uma correção compatível
com este projeto. Dependabot foi configurado para propor atualizações revisáveis;
não há merge automático.

Antes de expor a VPS, reavaliar essa dependência no runtime Docker e garantir que
padrões de busca fornecidos por usuários não cheguem a esse parser. Um CI verde
certifica as verificações de código/build, não a ausência de vulnerabilidades.

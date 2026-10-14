# JobForged (JBFD) — versão 0.00

O GitHub guarda o código e o histórico. A VPS executa a aplicação em dois ambientes: Test e Live.

| Ambiente | Branch | Endereço | Uso |
| --- | --- | --- | --- |
| Test | `develop` | <https://test.jobforged.com> | Validar mudanças antes de produção |
| Live | `main` | <https://jobforged.com> | Versão oficial |

## O que existe hoje

Landing page, Design System, biblioteca compartilhada, cadastro empresarial freemium e autenticação Supabase em Test, além de Home, telas administrativas e módulos demonstrativos de vagas e candidaturas. Test e Live têm stacks Supabase self-hosted separadas, bancos e volumes independentes. Live ainda executa uma versão do aplicativo sem a integração de autenticação e mantém cadastros públicos desabilitados até a promoção do código e a configuração de SMTP. Asaas/pagamentos e integração funcional da aplicação com n8n ainda não estão implementados.

## Como desenvolver

Use Node.js 22 (arquivo `.nvmrc`) e o lockfile:

```bash
npm ci
npm run dev
```

Antes de abrir um Pull Request:

```bash
npm run check
```

O GitHub Actions também executa lint, TypeScript, testes de HTML renderizado e builds Docker isolados para Live e Test. A configuração de desenvolvimento e deploy contínuo está em [`docs/OPERACAO-GITHUB-VPS.md`](docs/OPERACAO-GITHUB-VPS.md).

## Caminho da mudança

1. Criar uma branch de trabalho e abrir Pull Request para `develop`.
2. Esperar o CI passar e revisar a mudança em Test.
3. Promover a mesma imagem/commit validado para `main` por Pull Request.
4. Executar a publicação Live pelo workflow manual, com aprovação do ambiente `jbfd-live`.

O deploy automático de Test está habilitado e validado. A publicação Live continua protegida: o Environment `jbfd-live`, sua aprovação obrigatória e as credenciais próprias ainda precisam ser preparados antes de habilitar a variável de proteção.

O procedimento obrigatório de paridade entre código, migrations e bancos está em [`docs/GUIA-PROMOCAO-TEST-LIVE.md`](docs/GUIA-PROMOCAO-TEST-LIVE.md). O deploy de app em Test é automático; migrations ainda exigem execução operacional controlada.

Para conectar o MCP de operação a outro assistente de IA, consulte [`docs/GUIA-MCP-OUTRAS-IAS.md`](docs/GUIA-MCP-OUTRAS-IAS.md).

## Código e segredos

O código completo fica no GitHub. Os containers na VPS executam uma imagem identificada por commit. Arquivos `.env` reais ficam em `/opt/jbfd/test/.env` e `/opt/jbfd/live/.env`; não enviar esses arquivos ao GitHub, ao chat ou ao Codex. Exemplos sem segredos ficam em `deploy/`.

## Layout

- `app/`: páginas e telas.
- `app/components/ui/`: componentes e tokens compartilhados.
- `app/design-system/`: referência visual oficial.
- `public/brand/`: identidade visual.
- `db/`: schema e preparação para banco; as migrations Supabase versionadas ficam em `supabase/migrations/`.
- `deploy/`: Docker Compose e exemplos de ambiente.
- `scripts/`: build, validação e publicação controlada na VPS.
- `docs/`: operação, inspeção e arquitetura.

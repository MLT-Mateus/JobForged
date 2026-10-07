# JobForged (JBFD) — versão 0.00

O GitHub guarda o código e o histórico. A VPS executa a aplicação em dois ambientes: Test e Live.

| Ambiente | Branch | Endereço | Uso |
| --- | --- | --- | --- |
| Test | `develop` | <https://test.jobforged.com> | Validar mudanças antes de produção |
| Live | `main` | <https://jobforged.com> | Versão oficial |

## O que existe hoje

Landing page, Design System, biblioteca compartilhada, páginas visuais de autenticação, Home, telas administrativas e módulos demonstrativos de vagas e candidaturas. As telas usam dados simulados e, em alguns fluxos, armazenamento no navegador. Isso ainda não é autenticação real nem banco de produção. Supabase, Asaas e integração da aplicação com n8n ainda não estão configurados.

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

Os deploys automatizados só funcionam depois de configurar ambientes, secrets, variables e a chave restrita na VPS descritos no guia. A publicação Live permanece desligada até a variável de proteção ser ativada.

## Código e segredos

O código completo fica no GitHub. Os containers na VPS executam uma imagem identificada por commit. Arquivos `.env` reais ficam em `/opt/jbfd/test/.env` e `/opt/jbfd/live/.env`; não enviar esses arquivos ao GitHub, ao chat ou ao Codex. Exemplos sem segredos ficam em `deploy/`.

## Layout

- `app/`: páginas e telas.
- `app/components/ui/`: componentes e tokens compartilhados.
- `app/design-system/`: referência visual oficial.
- `public/brand/`: identidade visual.
- `db/`: preparação para banco; não representa uma base de produção ativa.
- `deploy/`: Docker Compose e exemplos de ambiente.
- `scripts/`: build, validação e publicação controlada na VPS.
- `docs/`: operação, inspeção e arquitetura.

# JobForged — Landing Page

Landing Page comercial da JobForged, um ATS white label para recrutamento e seleção. O projeto apresenta personalização de marca e domínio, entrevistas pelo WhatsApp, triagem automatizada, pipeline Kanban e indicadores de gestão.

## Tecnologias

- React 19 e TypeScript
- Vinext e Vite 8
- Motion para animações
- Lucide React para iconografia
- CSS responsivo com identidade visual própria
- ESLint e testes automatizados

## Desenvolvimento local

Pré-requisito: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Para validar uma versão pronta para publicação:

```bash
npm run lint
npm test
```

## Ambientes e branches

| Branch | Ambiente | Finalidade |
|---|---|---|
| `main` | Produção / live | Versão aprovada e disponível no domínio oficial |
| `develop` | Homologação / teste | Validação de conteúdo, layout e funcionalidades antes da produção |
| `feature/*` | Desenvolvimento | Alterações isoladas antes de entrarem em homologação |

Fluxo recomendado:

1. Criar uma branch `feature/nome-da-alteracao` a partir de `develop`.
2. Abrir um Pull Request da feature para `develop`.
3. Validar a publicação de homologação.
4. Abrir um Pull Request de `develop` para `main`.
5. Publicar em produção somente após aprovação.

O workflow em `.github/workflows/quality.yml` valida automaticamente pushes e Pull Requests direcionados a `main` e `develop`.

## Estrutura principal

- `app/page.tsx`: conteúdo, componentes e interações da página
- `app/globals.css`: identidade visual e responsividade
- `app/layout.tsx`: metadados, SEO e dados estruturados
- `public/brand/`: logos oficiais da JobForged

## Identidade visual

- Turquesa principal: `#20B2AA`
- Azul de destaque: `#4169E1`
- Azul muito claro: `#F1F8FF`
- Verde profundo: `#072F2D`
- Tipografia: Montserrat Variable

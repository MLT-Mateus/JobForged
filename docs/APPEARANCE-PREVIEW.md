# Personalização empresarial e prévia

A página demonstrativa independente `/jobforged`, sua identidade fictícia e a rota genérica de prévias por slug foram removidas. Endereços sem rota real retornam o 404 compartilhado; não representam empresas, vagas ou clientes fictícios.

A Personalização continua em `/app/personalizacao`. A ação Abrir prévia externa abre `/app/personalizacao/previa`, usando o rascunho da empresa autorizada pela sessão via API protegida existente. Não aceita identificador, slug ou e-mail como autorização e não importa vagas do armazenamento local. A prévia usa o mesmo componente do editor, com conteúdo ilustrativo identificado como mock.

O Design System demonstra o componente com os padrões genéricos de Sua empresa. Templates, fotografia padrão, rodapé, cores, fontes, Rich Text, uploads, persistência e histórico compartilhados da Personalização permanecem. Nenhuma conta, empresa, vínculo ou configuração persistida foi removida ou criada. A conta administrativa não se torna uma empresa recrutadora.

Desenvolvimento de vagas reais interrompido conforme a revisão de escopo. Publicação somente em Test; Live não é alterado.

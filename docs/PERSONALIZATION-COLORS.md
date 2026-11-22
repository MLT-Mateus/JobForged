# Personalização de cores e restauração

## Controles compartilhados

BrandColorsEditor, demonstrado em Design System → Cores e usado na aba Identidade, oferece sete controles: marca principal/complementar, ação (botões e links), texto claro/escuro e fundo claro/escuro. Menu e rodapé acompanham o texto e fundo/superfície do tema. Hover, superfície, seleção, cor interna do botão e links legíveis são derivados no modelo brand-colors.ts, consumidos por brandingStyle. Seis paletas: JobForged, Oceano, Floresta, Ameixa, Terracota e Grafite. Feedback semântico preservado.

Nenhum registro é migrado ou regravado ao abrir o editor. Valores antigos, inclusive chrome específico, continuam legíveis e restauráveis; somente uma escolha ou edição explícita recalcula o conjunto. Outros campos, arquivos, identidade, template e conteúdo são preservados. Digitação parcial hexadecimal permanece no campo; não produz cores NaN. Contraste inválido é bloqueado pelas validações existentes, com foco no campo correspondente da aba Identidade.

Seleção de paleta produz prévia local; Salvar aplica e registra a versão. Descartar recupera a última versão salva. O histórico contém versões persistidas, não cada movimento do seletor. Restaurar e aplicar usa explicitamente restore_public no RPC autorizado existente (o contrato privado restore continua recusado) com controle de revisão e histórico da própria empresa; confirmação explicita substituição dos campos não salvos e aplicação pública. Recupera o snapshot completo e cria nova versão/auditoria, sem apagar versões anteriores. Permissões owner/admin e empresas suspensas continuam verificadas no servidor/banco.

Tokens opcionais de ação primária da biblioteca UI mantêm o visual padrão fora do escopo empresarial. Dentro dele, recebem fundo/texto/hover calculados. Links recebem hover/foco derivado; navegação por teclado e semântica dos estados são preservadas.

## Validação

Testar todas as paletas nos dois temas, foreground e hover de botões, leitura de links nas superfícies, edição parcial, preservação de campos não relacionados, persistência/concorrência e restauração integral com histórico imutável. Testes de banco usam fixtures isoladas; não restaurar identidade de cliente real para gerar evidência.

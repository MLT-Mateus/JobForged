# Editor de vagas — referência Mantevida

## Estrutura
Referência inspecionada autenticada em 14/11/2026: painel/vagas/editar/sobre e seções atribuições, benefícios, perfil e processo. Conferidos HTML, script do editor, opções, CSS e janela do Chrome.

O formulário usa um cartão principal e navegação à direita no desktop. Em telas menores, a navegação fica acima. As cinco seções seguem a referência: Sobre o Cargo, Atribuições, Benefícios, Perfil Esperado e Processo. Entrar em uma vaga como titular/administrador abre diretamente o editor; a prévia é uma ação separada. Contas sem permissão continuam somente leitura.

Componentes compartilhados: TextField, SelectField, MultiSelectField, RichTextField, DateField, CheckboxField, ToggleSwitch, WidgetDialog, ActionButton e Panel. ItemListField foi adicionado à biblioteca e ao DS, com adição, edição, exclusão e ordenação acessíveis. Cores, espaçamentos e tipografia usam os tokens existentes.

## Persistência
Migration 0055 adiciona campos opcionais ao contrato para compatibilidade com versões anteriores: PCD, faixa salarial, jornada, descrição, atribuições e contatos públicos. Requisitos são opcionais; atribuições e etapas exigem pelo menos um item. Novas publicações exigem endereço de filial ativa da empresa. Rascunhos incompletos são permitidos. Contatos preenchidos são validados e disponibilizados aos candidatos. Remuneração confidencial permanece ocultada pela projeção pública.

Dados anteriores são preservados no documento; contexto complementar continua editável em Atribuições. Salvar rascunho é explícito; alterações em vagas já publicadas usam Salvar alterações e atualizam a publicação. Não há promessa de salvamento automático nem alteração silenciosa de status.

## Verificação
Testes de regras do editor e preservação de identidade das etapas, contrato do assistente e SQL de persistência, filiais, contatos e confidencialidade. Pipeline executa build, testes de API, migrations e isolamento empresarial antes do deploy Test.

Validação visual local com o componente real, dados fictícios e a referência aberta no Chrome: formulário editável, duas colunas no desktop, atribuições e navegação acima do formulário em largura reduzida. Ajustados deslocamento sob cabeçalho fixo e cor do progresso para tokens do DS.

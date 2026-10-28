# Regra global: campos e valores nunca ficam sem orientação

## Placeholder
- Chamada de 2–4 palavras: verbo + dado + três pontos literais (...).
- Preferir até28caracteres antes do sufixo. Não truncar uma frase em execução; trocar por uma chamada curta adequada ao label.
- Digite o nome..., Digite o e-mail..., Escreva a descrição..., Busque por nome..., Selecione opções..., Informe o valor...
- Label sempre visível. Exemplo de formato, restrição, mínimo, máximo e explicação ficam na ajuda. Placeholder não substitui validação, label, dado ou instrução persistente.
- Inputs desabilitados sem valor usam Indisponível...; readonly sem valor usa `Não informado...`. A causa/dependência deve estar em label/ajuda. Valores existentes não são modificados.
- Seleções reais (como Todos os setores) são valores, não placeholders; não acrescentar reticências a elas.
- Checkbox/radio/range/file usam identificação e orientação próprias, não placeholder nativo incompatível.

## Leitura de valores
- Dado real: exibir o valor, incluindo0.
- Ausente: Não informado.
- Aguardando consulta real: Carregando...
- Indisponível: Indisponível, com motivo ou ação no contexto.
- Não simular zero, dados ou métricas para preencher espaço. Não usar string vazia como estado de leitura.

## Implementação compartilhada
field-copy.ts centraliza defaults por contexto e tipo. TextField, TextAreaField/MultilineInput, RichTextField, SelectField, MultiSelectField, criação de opções e calendários consomem essa regra. TextField normaliza também as utilizações de ColorField e formulários legados encapsulados pelo Field do assistente de vagas. Sem observadores de DOM, timers ou mudanças nos valores submetidos.

DisplayValue fornece estados explícitos e é usado por MetricCard. Outros consumidores de leitura devem adotar a mesma representação quando o dado for opcional. Exemplos e regra estão em Design System/Formulários.

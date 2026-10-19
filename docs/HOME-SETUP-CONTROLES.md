# Home: controles aprovados, setup e banners responsivos — Test

Base oficial: develop `68a661d97f5377cf1456cc179a30a5337ff657eb`, checkout `MLT-Mateus/JobForged`, árvore limpa. Branch `feat/test-home-setup-approved-controls`. Apenas Test.

## Botões e navegação
O DS usa o botão principal suave e secundários/transparentes. A sobrescrita de White Label substituía principal e hover por fundo sólido. Essas regras e a sobrescrita genérica de botões das prévias foram removidas. Todas as páginas empresariais passam a consumir a mesma definição compartilhada `jf-action` aprovada, com tokens empresariais preservados. Navegação dos banners usa o botão quiet já aprovado.
Suporte e logout retirados do cabeçalho compartilhado. Saída disponível apenas no perfil `/app/minha-conta` ou `/backoffice/minha-conta`. A rota do perfil administrativo reutiliza o componente de conta, sem conceder edição empresarial ou ampliar privilégios. Falha no logout é informada e permite nova tentativa.

## Setup funcional
Home consulta `/api/company/setup` e RPC `company_setup_status`. Progresso derivado de dados persistidos, nunca de checkboxes manuais ou mocks:
- E-mail confirmado e nome de perfil preenchido.
- Dados cadastrais: nome, CNPJ e telefone.
- Identidade visual publicada.
Equipe adicional é opcional e não impede completar o progresso essencial. Links apontam para os módulos existentes e respeitam papéis; membros sem gestão recebem orientação. Atualiza ao voltar o foco e por botão. Portal e publicação de vagas ainda incompletos ficam como mock, fora do cálculo de conclusão.

## Banners e upload
Formato desktop820×312 e mobile640×360, fluido conforme largura. Uma imagem mobile opcional, persistida separadamente; fallback para a desktop sem recortar/deformar. Prévia desktop/mobile usa o mesmo componente da Home e do DS. Banners antigos e ordenação preservados.
Backoffice aceita fonte de até10MiB e32MP. Normaliza a PNG estático sem metadados, até4096px, saída máxima5MiB (limite privado de armazenamento preservado). Imagem grande demais após otimização é recusada com erro. PNG/JPEG/WebP somente; assinatura/MIME/decode e stream validados. Limites de identidade empresarial continuam5MiB/16MP. Nenhum HTML/SVG/animação aceita.

## Banco e operação
Migration nova imutável0012 adiciona imagem mobile, preserva regras de comunicações e disponibiliza somente leitura derivada do setup. Funções anteriores de comunicação encapsuladas no schema privado sem grants de clientes; autorização no banco mantida. Imagens mobile privadas e leitura permitida apenas nos banners ativos, exceto administrador que pode pré-visualizar.
Backup verificado: `/opt/jbfd/backups/supabase/test-20261019T195449Z`. Runner confirmou as12migrations. SHA2560012: `acde6bd48cc37bfd4925851179580cdf13a403fb51b0c865194ae37503b0e30d`. Arquivo criado emLF; migrations anteriores não editadas.
Validação real SQL em transação revertida: comunicações/permissões anteriores, imagem mobile retornada e legível no contexto autorizado, setup derivado e permissão de titular/membro, suspensão. Nenhum e-mail ou comunicação real enviado. CI e publicação final devem ser confirmados na entrega.

## Limites e auditoria
Sem sessão autenticada disponível, edição visual real do setup, publicação de banner mobile e saída de conta em navegador humano não são declaradas verificadas. Conferências do DS não substituem esse fluxo.
1. Home → setup → completar/revisar perfil, empresa e identidade; retornar e conferir progresso.
2. Conferir transparência/estados dos botões contra DS em claro/escuro, desktop/mobile.
3. Confirmar ausência de suporte/logout no cabeçalho e saída apenas no perfil empresarial/administrativo.
4. Backoffice → Comunicação interna: enviar imagens desktop/mobile e conferir prévias/Home.
5. Verificar erro para arquivo inválido e conta sem permissão.
Live preservado; Frente4 não iniciada.

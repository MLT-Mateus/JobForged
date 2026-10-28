# Página de carreiras padrão e alinhamentos

## Demonstração pública em Test
/jobforged é uma página estática demonstrativa da JobForged, noindex, com quatro vagas fictícias identificadas como mock. Não cria organização, vínculo, vaga no banco nem formulário de candidatura. Busca, filtro e abertura da descrição são locais. A identidade é criada a partir dos padrões aprovados e não lê dados de clientes.

O mesmo CareerPortalPreview é consumido pelo editor empresarial e pela prévia privada. Mantém os cinco layouts, conteúdo salvo, identidade, fontes, cores e opções existentes. Novas configurações recebem textos padrão mais completos; documentos já persistidos não são regravados. Foto ilustrativa é a alternativa quando a capa está vazia; uma capa enviada pela empresa tem prioridade.

Imagem: Ivan S / Pexels, foto8117405, licença e origem em public/careers/PHOTO-CREDIT.md. Arquivo comprimido local1400px, aproximadamente184KiB. Não representa a equipe real da JobForged nem endosso das pessoas retratadas.

## Alinhamentos
O nome custom-preview colidia com globals.css, que adicionava margin18px. O editor usa agora appearance-preview-panel com margin0; a landing não foi alterada. A barra de dispositivos e SelectField utiliza uma grade alinhada, sem as linhas invisíveis reservadas pelo campo compacto. O StatusBadge Em breve fica junto ao label do TextField usando labelAdornment compartilhado.

O popup de ampliação, seu estado e botões foram removidos. A única ação de abrir a página fora do editor é Abrir prévia externa; dispositivos, superfície e tema continuam na prévia embutida.

O slug jobforged foi reservado para a demonstração. Uma empresa com esse nome usa /jobforged-carreiras para a prévia privada; nenhum dado privado é exposto pela rota demonstrativa.


## Composição inspirada na referência Mantevida — 22/10/2026

As faixas de cabeçalho, hero, pilares, vagas, cultura e rodapé ocupam toda a largura disponível. O conteúdo mantém alinhamento compartilhado e largura de leitura máxima de 1160px, com margens fluidas. O portal público não possui mais o limite externo de 1280px.

O hero reúne ações para vagas e cultura, fotografia e destaques ilustrativos. Quatro pilares qualitativos substituem métricas empresariais não verificadas. As vagas aparecem antes da cultura, com descrição, metadados, contagem filtrada e aviso mock. O mesmo CareerPortalPreview atende o editor e as prévias; capas enviadas, textos e cinco templates existentes continuam respeitados. Não foi implementada candidatura nem alterado o modelo de persistência.

Verificações e SHA final são registrados nos documentos de continuidade após a publicação de Test.

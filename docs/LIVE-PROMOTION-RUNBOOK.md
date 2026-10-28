# Promoção controlada do MVP — preparação de 28/10/2026

## Escopo confirmado

Publicar o MVP atual com demonstrações identificadas. Não implementar a Frente 4, nem apresentar vagas locais, candidaturas, agenda, indicadores ou financeiro demonstrativos como recursos completos. Responsável indicado: `jobforged@gmail.com`; a leitura inicial não encontrou essa conta em Live. Sua criação/confirmação e seu autenticador são pessoais, no próprio ambiente. Não copiar usuários, fatores, sessões, arquivos ou segredos de Test.

Este documento é um procedimento, **não uma autorização de execução**. Live permanece somente em leitura durante a preparação. A execução exige aprovação humana do SHA e da janela, além do ambiente protegido `jbfd-live`.

## O que este pacote prepara

- Identidades canônicas por ambiente em `environment_profiles.py`, com caminhos, DB, app, gateway, ingressos e redes distintos.
- Auth, gateway, isolamento, Studio, backup/restauração e manutenção com padrões de Test preservados. Scripts com nome histórico `*-test-*` continuam usando Test por padrão; selecionar Live exige argumentos explícitos e evidência protegida.
- Mesmo Compose e política Auth para os dois ambientes, sem copiar valores privados. Test executa o caminho compartilhado no deploy normal.
- Backup de banco/arquivos consistente, restauração sem rede/portas/cron, evidência de integridade e cópia AES-GCM/DPAPI no computador. Retenção separada por prefixo/ambiente. Agendamento preparado: Test03:00, Live03:30; Live só é ativado explicitamente depois da autorização e da instalação da capacidade operacional de backup. RPO depende de computador e usuário disponíveis.
- Capacidade de manutenção persistente limitada a backup e quarentena de órfãos. Ela não autoriza migrations, publicação, contas ou alterações de MFA. O worker mantém limites de vinte arquivos, grace period, histórico preservado e purge condicionado à cópia externa.
- Janela de manutenção sem credenciais no proxy: bloqueia rotas empresariais e APIs diretas; permite somente login, sessão, Segurança/MFA, status e ativos públicos. Não há bypass por header/browser flag. O público continua em503 enquanto a conta responsável cadastra seu fator.
- Bootstrap auditado somente de identidade existente/confirmada, sem criar usuário, senha ou fator. Uma única sessão recente de senha recebe uma capacidade de matrícula TOTP de quinze minutos e uso único. MFA permanece exigido para operações administrativas.
- Gate antes de credenciais/alterações de implantação Live: SHA saudável em Test e integrado em main, migrations/checksums, backup próprio restaurado/cifrado, MFA e recuperação. A imagem Live anterior pode usar contratos revogados; não executar rollback automático para ela sem aceite de compatibilidade.

## Evidências e testes

- O CI nativo já inseria uma fixture após0002. Agora cria arquivo real `pg_dump`, restaura uma segunda base isolada, troca para a base restaurada e aplica0003 em diante. Depois roda Auth/PostgREST/Storage/gateway/worker reais. Não envolve dados pessoais de Live.
- O SQL exato de bootstrap é exercitado em identidade sintética: AAL1 não lê administração; matrícula de uso único; MFA permite o acesso depois; auditoria confirmada.
- Contratos dos dois Composes são renderizados sem iniciar serviços Live. Testes negativos recusam autorização ausente/expirada, recibo de Test para Live, restauração divergente, corrupção, rollback não comprovado e operação fora do escopo de manutenção.
- Proxy de manutenção testado com servidor HTTP descartável; solicitações de negócio não chegam ao upstream. SQL/API mocks, testes reais de provedores, execução ativa de Test e validação humana devem continuar sendo identificados separadamente.

## Pré-requisitos pessoais e operacionais

1. O responsável cria e confirma sua conta Live pelo fluxo normal, com senha própria e dados legítimos. O agente não preenche senha, aceita termos ou envia convites para simular esse passo. Se a conta existir antes da janela, apenas conferir confirmação/banimento/vínculo por leitura; não sobrescrever.
2. Confirmar ambiente GitHub protegido, secrets próprios de Live e sudoers do comando estrito `probe readiness live SHA`. Atualizações de dependências abertas não entram automaticamente nesta promoção.
3. Aprovar SHA exato atualmente saudável em Test, janela de manutenção e plano de recuperação. O registro root abaixo só é emitido **depois** dessa aprovação; não é uma flag recebida do navegador.

Formato do registro root privado, regular, root:root0600, em `/opt/jbfd/security-work/live-release-approval.json`:

```json
{
  "environment": "live",
  "revision": "<SHA completo aprovado>",
  "approved": true,
  "approval_reference": "<referência à aprovação humana>",
  "responsible_email": "<identidade Live confirmada>",
  "issued_at": "<UTC com fuso>",
  "expires_at": "<até duas horas depois>",
  "backup": "<pasta Live preenchida após o backup e recibo>",
  "rollback_strategy": "hold-maintenance-for-operator-recovery"
}
```

Este exemplo não deve ser copiado como aprovação real. O modo alternativo de rollback exige prova privada de imagem imutável, checksums do schema e aceites isolados recentes de Auth, contexto, leitura empresarial, branding, Storage e MFA. Não preencher `acceptance_passed` sem executar esses aceites.

## Sequência após aprovação — não executar durante a preparação

1. Integrar em main, por PR/CI, o mesmo commit saudável de Test. Reutilizar app e gateway desse SHA, sem reconstruir imagem. Garantir a release exata na VPS. Preparar cópias dos wrappers SSH/root novos e a regra sudoers estrita; preservar o caminho root de recuperação. Não imprimir ambientes/segredos.
2. Com autorização específica e antes de outras configurações dependentes, executar `test-recovery-drill.py --environment live --revision SHA --authorization ARQUIVO`. Apesar do nome legado, o perfil seleciona somente recursos Live. Há uma breve pausa dos escritores Live e retorno dos serviços no finally. Restaurar em container próprio sem rede/portas/cron; não sobrescrever banco ativo.
3. Coletar e cifrar em `JobForged-Backups/Live` com `collect-test-backup.ps1 -Environment live -Revision SHA -Authorization ARQUIVO`. O coletor gera novo backup/restauração antes da cópia; conferir o recibo correspondente à cópia mais recente e atualizar `backup` na aprovação. Não usar recibo Test. Não configurar novos serviços pagos.
4. Habilitar `configure-release-maintenance.py SHA --environment live --authorization ARQUIVO`. Conferir503 público e bloqueio das APIs de negócio. Login/Segurança permanecem disponíveis quando o app novo estiver ativo. Não reiniciar Traefik; somente conectar o ingresso específico.
5. Aplicar as mesmas migrations versionadas pelo runner. Verificar ausência de conflitos de vínculos/roles/status antes; divergências precisam de decisão explícita, nunca saneamento destrutivo improvisado. Guardar diagnóstico privado, interromper dependentes na primeira falha. O app antigo pode ficar incompatível após restrições: manter manutenção até concluir.
6. Executar isolamento, Auth e gateway com `--environment live --authorization ARQUIVO`, a partir da release aprovada. Conferir política, credenciais próprias, loopback, Studio protegido, conectividade e fingerprints de Test. Instalar também `configure-test-maintenance.py --environment live --authorization ARQUIVO` para gerar somente a capacidade operacional aprovada e os helpers privados em `live-tools`; a tarefa Windows Live ainda só é ativada no passo11. Helpers de Test não sobrescrevem os de Live. O pooler Live que já estiver em loopback deve ser preservado. Não chamar endurecimentos antigos com nomes Test como se operassem em Live.
7. Executar `bootstrap-live-admin.py SHA --authorization ARQUIVO --prepare-only` somente se o registro administrativo estiver vazio. Isso prepara a exigência de MFA antes do primeiro privilégio. Ativar o app aprovado em modo bootstrap pelo deploy root com `JBFD_LIVE_BOOTSTRAP=1`: o gate exige manutenção pública comprovada e MFA exigido no banco; não abre tráfego empresarial.
8. O responsável entra com sua conta Live. Com uma única sessão recente de senha e identidade confirmada, o operador executa `bootstrap-live-admin.py SHA --authorization ARQUIVO`. O responsável abre Segurança e cadastra/confirma pessoalmente o fator. Não remover fatores ou criar senhas. Se houver várias sessões recentes, diagnosticar em privado; não escolher uma sessão silenciosamente.
9. Conferir fator, exigência e auditoria. Executar o preflight normal sem `--bootstrap`; depois o workflow Live protegido (inclui gate antes da configuração Brevo). Confirmar app/gateway/SHA, Auth, migrations e serviços. O configurador SMTP preparado preserva o gateway e o override de segurança; conferir a política novamente depois da execução. Não usar a versão antiga do helper.
10. Abrir o público somente com `configure-release-maintenance.py SHA --environment live --authorization ARQUIVO --disable`, após gate normal e app saudável no SHA exato. Confirmar páginas, healthcheck, login, MFA/isolamento e fluxos reais sem alterações desnecessárias em clientes.
11. Instalar manutenção/backup Live somente com aprovação válida. A capacidade persistida contém apenas backup consistente e órfãos limitados. Ativar a tarefa local com `install-workstation-backup-task.ps1 -Environment live -EnableLiveTask`, conferir execução e recibo Live; não declarar agendamento comprovado apenas pela existência da tarefa.

## Falha e recuperação

- Falha de migration: parar; nenhuma publicação dependente. Corrigir por migration nova. Não editar as aplicadas.
- Falha do app durante a janela: o proxy continua em503, inclusive se o upstream estiver indisponível. O deploy não restaura silenciosamente a imagem antiga incompatível nem apaga banco/arquivos.
- Recuperação de imagem só com prova de compatibilidade. Recuperação de dados só com decisão do operador sobre escritas posteriores ao backup e validação do ponto, incluindo Auth/MFA. `restore-test-archive.py --environment live ...` cria apenas um clone isolado para conferir o arquivo; nunca restaura sobre o banco ativo.
- Se a janela/backup/aprovação expirar, renovar a evidência correta; não aumentar limites ou ignorar gates para acelerar.

## Limites atuais

O ensaio sintético não comprova a integridade dos dados particulares de Live; sua restauração/upgrade própria ainda precisa ocorrer após aprovação. A criação e matrícula MFA da conta Live exigem participação humana. As configurações/root wrappers não são instalados em Live durante o deploy de Test. O pacote preparado e CI verde não equivalem a promoção realizada ou a garantia de prontidão total.

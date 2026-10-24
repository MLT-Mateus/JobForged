# Execução de segurança em Test — em andamento

Atualização: 2026-10-23, UTC. Não constitui entrega final nem autorização de Live.

## Estado revalidado em 2026-10-24, 01:00 UTC

- Etapa de compatibilidade publicada pelo PR [#113](https://github.com/MLT-Mateus/JobForged/pull/113), SHA Test `33c05dfb6c5d3bc315e44c73167062d38ddd3bd5`, healthcheck `ok`. Migrations 0001–0017 aplicadas e checksums conferidos pelo runner oficial. A migration 0017 é `0017_security_read_contracts_compat.sql`, imutável; a numeração anterior dos rascunhos foi deslocada.
- Implementação principal continua no PR #112, draft. Último checkpoint publicado `eeabbd5`: cinco checks aprovados no run `40047220038`, incluindo Auth/Storage nativos. Não representa publicação da segurança completa.
- Backup pré-migration 0017: `test-20261023T233206Z`, restaurado e conferido, cópia cifrada no computador confirmada. Snapshot anterior `test-20261023T204429Z` também foi restaurado para testar upgrade de estrutura existente.
- Native CI usa DDL dos provedores fixados e somente metadados de versões das migrations, sem usuários, sessões, arquivos ou credenciais de Test/Live. Recria banco, Auth, REST, Storage, Envoy e duas instâncias de gateway em rede Docker interna sem portas ou SMTP externo.
- Testes nativos adicionais passaram: todos os símbolos de senha aprovados; JWT de 900 s; expiração de sessão em 30 dias e inatividade de 24 h; recuperação seguida de alteração real de senha; proxy BFF com preservação de HTTPS e contagem única; negação de credencial privilegiada na entrada pública e de JWT forjado apesar de hints válidos; capacidades de manutenção sem acesso empresarial/público; quarentena com cópia conferida e proteção de assets registrados.
- Configuração Auth, gateway e worker permanecem preparados em código, ainda não aplicados ao Test ativo. MFA real continua dependendo do cadastramento privado do responsável, antes de ativar a exigência. Live permanece sem alterações.

## Decisões recebidas

- Destino externo à VPS: computador atual, criptografado, sem serviço pago.
- Quota empresarial: 1 GB decimal (1.000.000.000 bytes), 200 imagens; limite individual existente preservado (5 MiB).
- Retenção do plano: 7 pontos diários, 4 semanais, 6 mensais.

## Última validação antes da integração

- Backup `test-20261024T010838Z`: restauração e cópia cifrada confirmadas; recibo externo registrado após conferir a decifragem autenticada no computador.
- Upgrade 0018–0030 passou sobre nova restauração desse backup (`jbfd-security-restore-20261024t011053z`), com SQL de segurança/cadastro e preservação das contagens originais. Test ativo ainda em 0017 neste registro.
- Worker real de quarentena passou com arquivo fictício no Storage nativo isolado. Recusa exclusão antes de readback, preserva assets registrados e nega purge sem retenção e aprovação de recibo externo.
- Convites por RPC direto limitados a dez por hora/empresa; teste nativo passou sem envio de e-mail. Troca de senha revogou as outras duas sessões reais da fixture.
- Rotação nativa: token antigo além da tolerância foi rejeitado. **Nesta versão do provedor, esse replay não revogou a família corrente**; o teste registra explicitamente esse resultado. Revogação empresarial imediata usa o ledger e a existência/validade da sessão para logout, bloqueios e expiração; não confundir essas garantias com revogação automática de toda família por replay.
- O gate proposto de deploy aplica migrations somente em Test, depois da disponibilidade das imagens aprovadas e com backup restaurado, íntegro e recibo de cópia cifrada com até duas horas. Ausência, corrupção, idade excessiva e erro de checksum bloqueiam a aplicação. Seis testes de controle passaram; não substituem o upgrade real descrito acima. Live continua exigindo migrations previamente aplicadas manualmente e aprovação explícita.
- Isolamento de rede Test preparado em script versionado: ingresso próprio, conexão adicional do Traefik sem reinício, remoção dos serviços Test da rede compartilhada, comparação das identidades/redes/portas de Live. Ainda precisa de execução e conferência no deploy.

## Evidências executadas

- Checkout oficial `MLT-Mateus/JobForged`, branch `feat/security-data-foundation`, base develop `0b7d26b757650ab2df7cc23e52bc3d19297df2d8`.
- Backup consistente de Test e restauração isolada de banco/arquivos passaram. Segunda execução: `/opt/jbfd/backups/security/test-20261023T203450Z`.
- Restauração sem rede, portas ou consumidores reais; cron desativado; comparação de contagens, objetos e arquivos. Scripts preservam os escritores anteriormente ativos de Test.
- Cópia cifrada AES-256-GCM autenticada, chave protegida por DPAPI CurrentUser, fora de Git/OneDrive, em `%LOCALAPPDATA%\JobForged\Backups\Test`. A verificação decifrada corresponde ao hash original.
- Teste de envelope com 2,5 MB sintéticos passou: ida/volta integral, adulteração rejeitada, truncamento rejeitado e bytes adicionais rejeitados.
- Agendamento Windows `JobForged-Test-Encrypted-Backup`, diário às 03:00, usuário interativo, execução posterior quando disponível. Coleta inteira passou manualmente; primeira execução pelo agendador ainda não observada.
- Testes SQL passaram no banco restaurado para isolamento, usuário sem vínculo, contratos de leitura, revogação, recuperação de uso único e MFA ausente/antigo.
- Replay de todas as migrations, incluindo 0017–0021 propostas, passou em PostgreSQL descartável com contrato mínimo de schemas dos provedores. Esse teste é SQL real; não substitui integração HTTP GoTrue/Storage.
- Quotas de 200 objetos, 1 GB e duas reservas simultâneas passaram em SQL. Objetos órfãos também consomem quota. Reservas de 5 MiB são conservadoras; objetos finalizados passam a consumir o tamanho real.
- Integração nativa GoTrue/PostgREST/Storage passou em restauração isolada: JWT assinado, senha fraca rejeitada, recuperação de link/nonce de uso único e sessão correta, revogação inclusive após refresh, TOTP cadastrado/confirmado, MFA ausente/antigo negado, upload com reserva, leitura própria, leitura cruzada negada, MIME indevido e excesso de tamanho rejeitados, vínculo inativo, empresa suspensa e logout. Apenas contas `example.invalid`, sem e-mails externos. O teste de tamanho contempla rejeição por fechamento da conexão e confirma serviço saudável/objeto não persistido.
- Portas de pooler de Test 5432/6543 foram restringidas a 127.0.0.1 em 20:36 UTC. Healthcheck passou; bindings de Live comparados e preservados. Hash da configuração Test: `5c39b90dff4a7437604901c439abd8e70c9864ae943688b927c8a43cbd3219e3`.
- Rollback de configuração: `/opt/jbfd/security-work/test-compose-before-pooler-20261023T203629Z`, acesso root restrito.
- Tentativa TCP a partir do computador externo confirmou portas 5432/6543 inacessíveis após a alteração.
- Studio Test: allowlist exclusiva do router Test exige caminho local/SSH, mantendo HTTPS e Basic Auth. Externo retornou 403; caminho local retornou 401; Studio Live permaneceu 401. Rollback `/opt/jbfd/security-work/test-studio-before-private-20261023T205756Z`.
- Acesso administrativo de recuperação: `ssh -N -L 8443:127.0.0.1:443 root@187.77.229.27`; teste TLS mantendo hostname: `curl --resolve test.supabase.jobforged.com:8443:127.0.0.1 https://test.supabase.jobforged.com:8443/`. Navegação requer resolução local do hostname para o túnel em perfil dedicado; não desative a validação do certificado.
- Build verificado e 16 testes existentes da aplicação passaram; TypeScript passou. Lint direcionado passou após corrigir o efeito de carregamento da tela de segurança.
- PR de trabalho: [#112](https://github.com/MLT-Mateus/JobForged/pull/112), em draft. Primeira rodada do CI: build/qualidade e Docker passaram; SQL detectou corrida no servidor temporário de inicialização (espera corrigida para TCP final); auditoria MCP detectou advisories atualizados. Zod atualizado para 4.6.7 e transitivos corrigidos; dez testes MCP passaram e `npm audit --omit=dev` retornou zero vulnerabilidades localmente. CI precisa ser repetido no novo commit.
- Advisories: [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [ip-address](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828).
- Segunda rodada do CI, commit `8015141`: quatro verificações passaram (MCP, código/build, Docker e SQL). Publicação permanece bloqueada pelo PR draft e pelas pendências funcionais.
- Proteção de `develop` aplicada: exige PR e os quatro checks, branch atualizada, conversas resolvidas; também exige checks dos administradores; force-push e exclusão negados. Nenhuma proteção/configuração de `main` foi alterada.
- Recuperação nativa de fator administrativo passou com conta fictícia: exclusão do fator pela API administrativa revogou as sessões, MFA continuou obrigatório e novo cadastro restaurou o acesso. Sessão apenas com senha não conseguiu adicionar fator enquanto existia fator verificado. Referência: [deleteFactor](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor).

## Código preparado, ainda não publicado

- 0018: contratos de identidade/sessão, wrappers de autorização, projeções explícitas, revogação, cadastro gradual de MFA e constraints.
- 0019: autorização temporária de recuperação ligada à identidade/sessão e consumo único; projeções de atualização.
- 0020: reservas de uploads empresariais com quota/concorrência/taxa e validação de tamanho real no registro.
- 0021: políticas de Storage usando sessão do usuário, sem credencial técnica global; sem UPDATE/DELETE ordinário de objetos.
- 0022: contrato de cadastro empresarial no trigger, plano fixo e horário de aceite registrado no servidor.
- 0024–0026: projeções restantes, guarda de sessão nas APIs Auth e intenção de cadastro validada, temporária e de uso único, com versão real dos termos. Metadados enviados pelo cliente não autorizam papéis ou planos.
- 0027–0029: limites transacionais de convites/processamento administrativo, prazo de sessão também no acesso aos dados e quarentena conservadora dos uploads abandonados. Ainda em validação, não aplicadas ao ambiente ativo.
- Aplicativo: consumidores dos novos contratos, recuperação e logout, tela administrativa de MFA, uploads com reserva e JWT do próprio usuário.
- Runner: seleção explícita de operador privilegiado por marcador de migration; funções da aplicação permanecem pertencendo a `postgres`, sem superusuário.
- CI: jobs de segurança SQL e de integração nativa como dependências da publicação de Test. Ambos passaram no GitHub no checkpoint acima.
- 0023 e serviço de gateway: contadores persistidos no PostgreSQL, credencial dedicada sem leitura empresarial e escopos HMAC sem e-mail em claro. Testes de política e de persistência após reinício passaram. Serviço ainda não instalado em Test.
- Referências oficiais consultadas: [requisitos e rotação do GoTrue](https://github.com/supabase/auth/blob/master/README.md?plain=1), [segurança de senhas](https://supabase.com/docs/guides/auth/password-security).

## Pendências obrigatórias

1. Repetir replay final após encerrar as revisões e testar concorrência real de uploads. Cobertura nativa atual está descrita acima; não substitui validação do aplicativo no navegador.
2. Publicar e conferir em Test os limites distribuídos, a configuração de Auth e o worker de quarentena já testados isoladamente; concluir testes de retenção/recibo externo e concorrência.
3. Completar revisão dos retornos RPC e sessões concorrentes/revogação após troca de senha.
4. Cadastrar fator do responsável legítimo e somente depois ativar MFA obrigatório; testar recuperação administrativa. A proteção permanece em preparação, sem bloquear o único administrador.
5. Concluir revisão das redes; Studio/portas Test já protegidos conforme evidências acima. Não alterar regras compartilhadas/Live.
6. Recuperação exige este perfil Windows/DPAPI. Perda do computador/perfil não está coberta por chave independente.
7. Concluir compatibilidade, lint/build, testes existentes, PR, CI, integração e publicação de Test. Confirmar SHA, migrations e healthchecks após publicação.
8. Apenas a publicação de compatibilidade está concluída. Não declarar a entrega das dez medidas antes da aplicação e validação das migrations 0018 em diante, serviços e fator administrativo real. Live não recebeu alterações.

# Backups offsite cifrados

O pipeline somente libera migrations/deploy depois de uma restauração isolada e de um recibo de artefato cifrado no repositório privado `MLT-Mateus/jobforged-backups`.

## Separação e retenção

- O workflow privado seleciona `backup-test` ou `backup-live` e usa a chave SSH exclusiva desse ambiente.
- O gateway root aceita apenas `prepare`, `stream` e `receipt` para o ambiente associado à chave. Ele não fornece shell nem comandos de deploy.
- O VPS cifra o arquivo com AES-256-GCM por blocos; a chave AES é encapsulada com RSA-OAEP-SHA256 de uma chave pública por ambiente. As chaves privadas de recuperação permanecem no computador do operador, protegidas por DPAPI CurrentUser.
- O runner transfere e baixa de volta apenas o ciphertext. Confere o SHA-256 antes de registrar no VPS um recibo que aponta para o artefato e para este repositório.
- Artefatos têm retenção de 90 dias. O gate de deploy continua exigindo backup restaurado, checksums corretos, rede isolada sem portas e recibo recente. Expiração do artefato invalida sua cópia externa para futuras verificações; crie um backup novo.

## Configuração necessária

No repositório privado, criar ambientes `backup-test` e `backup-live`, cada um com:

- Secret `BACKUP_SSH_KEY`: chave privada Ed25519 exclusiva do ambiente.
- Secret `BACKUP_SSH_KNOWN_HOSTS`: chave de host da VPS verificada fora de banda.
- Variable `VPS_BACKUP_HOST`: endereço da VPS.

No repositório `MLT-Mateus/JobForged`, criar o secret `BACKUP_WORKFLOW_TOKEN` em cada environment `jbfd-test` e `jbfd-live`. Usar um fine-grained token limitado ao repositório privado, com Actions read/write. O workflow público só o usa para iniciar e acompanhar a execução; as chaves SSH ficam exclusivamente no repositório privado.

Instalar no VPS duas chaves públicas em `/root/.ssh/authorized_keys`, cada uma presa a `/opt/jbfd/bin/jbfd-backup-vault-gateway.sh <ambiente>` com `restrict`, sem TTY, forwarding ou shell. Instalar os helpers root-owned em `/opt/jbfd/bin` e `/opt/jbfd/security-work`, as chaves públicas de cifra em `/opt/jbfd/security-work/backup-keys` e permissões `0700` para diretórios e `0600` para arquivos.

Não adicionar chave privada, dados de conexão, backup plaintext ou valores de `.env` ao Git. Mudanças no projeto entram por PR e deploy Test; configuração do VPS é feita separadamente pelo acesso root autorizado.

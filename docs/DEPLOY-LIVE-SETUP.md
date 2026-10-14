# Acesso de deploy Live

O deploy Live usa um usuário SSH exclusivo, sem shell administrativo nem encaminhamento de portas. A chave é presa a `scripts/jbfd-deploy-live-gateway.sh`, que aceita somente `deploy live <SHA completo>`. O helper root encaminha somente esse SHA para o gateway de deploy existente.

## Provisionamento inicial da VPS

Instale como root, sem substituir os helpers de Test:

```sh
useradd --create-home --user-group --shell /bin/bash jbfd-live-deploy
install -o root -g root -m 0755 scripts/deploy-vps-gateway.sh /opt/jbfd/bin/jbfd-deploy-vps-gateway.sh
install -o root -g root -m 0755 scripts/jbfd-deploy-live-root.sh /opt/jbfd/bin/jbfd-deploy-live-root.sh
install -o root -g root -m 0755 scripts/jbfd-deploy-live-gateway.sh /usr/local/bin/jbfd-deploy-live-gateway.sh
install -o root -g root -m 0440 deploy/jbfd-live-deploy.sudoers /etc/sudoers.d/jbfd-live-deploy
visudo -cf /etc/sudoers.d/jbfd-live-deploy
```

Cadastre a chave pública de deploy exclusivamente em `/home/jbfd-live-deploy/.ssh/authorized_keys`, com opções `restrict` e comando forçado:

```text
command="sudo -n /usr/local/bin/jbfd-deploy-live-gateway.sh",restrict <CHAVE PÚBLICA ED25519>
```

O diretório `.ssh` deve pertencer a `jbfd-live-deploy` com modo `700`; `authorized_keys` deve pertencer ao mesmo usuário com modo `600`. A chave privada fica somente no cofre de secrets do GitHub Environment `jbfd-live` e, se necessário, em armazenamento seguro local. Nunca a versione.

## GitHub

Crie o Environment `jbfd-live`, limite deployments à branch `main`, configure `required reviewers` e cadastre os secrets `VPS_DEPLOY_KEY` e `VPS_KNOWN_HOSTS`. Cadastre as variables `VPS_DEPLOY_HOST` e `VPS_DEPLOY_USER`. A variável de repositório `JBFD_LIVE_DEPLOY_ENABLED=true` habilita o workflow manual. Não copie a chave ou usuário restritos de Test.

O workflow `Promover versão para Live` valida que o SHA completo é ancestral de `main`, que a mesma imagem existe no GHCR e que o SHA está saudável em Test. O Environment `jbfd-live` continua exigindo aprovação antes do deploy.

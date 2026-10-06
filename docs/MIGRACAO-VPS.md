# JBFD na VPS: preparação da versão 0.00

## O que está pronto no código

O Docker executa a aplicação inteira existente: landing page, Design System,
autenticação visual e painéis existentes. Os painéis usam dados demonstrativos;
essa migração não implementa autenticação real, banco Supabase ou integrações.
O endpoint `/api/health` verifica apenas a aplicação, não serviços futuros.

O build padrão continua atendendo ao Sites durante a transição. `npm run
build:node` gera o servidor independente em `dist/standalone`. O Docker usa
esse servidor e não depende da hospedagem Sites ou da Vercel.

## Live e Test

- `main`: código aprovado para Live; `develop`: desenvolvimento e Test.
- Cada implantação usa uma imagem identificada pelo commit. Validar essa imagem
  no Test e promover a mesma imagem para Live, sem reconstruir.
- Projetos Compose separados: `jbfd-test` e `jbfd-live`, com redes separadas.
- Configurações externas: `/opt/jbfd/test/.env` e `/opt/jbfd/live/.env`.
- Cada ambiente tem uma rede privada própria. A aplicação também entra na rede
  existente do Traefik (`jobforged_jobforged_network`) para receber HTTPS; n8n,
  Evolution API, PostgreSQL e Redis não entram na rede privada da JBFD.
- O Traefik já usa `websecure` e o certificado automático `letsencrypt`.
  Test usa `test.jobforged.com`; Live usa `jobforged.com` quando ocorrer a troca.
- Portas 3101 (Test) e 3100 (Live) ficam acessíveis apenas por 127.0.0.1 para
  diagnóstico; o tráfego público passa pelo Traefik.
- Supabase, volumes e credenciais de integrações terão isolamento entre ambientes
  quando forem implementados. Não usar dados de produção nos testes.

## Primeiro instalar Test

O levantamento confirmou arquitetura, memória, disco, Docker, Compose, containers
e rede do Traefik. Não remover containers, redes ou volumes existentes. Antes de
subir o Test, verificar que o DNS `test.jobforged.com` aponta para esta VPS e que
a porta 3101 está livre. Não alterar o DNS Live nesta etapa.

No checkout do repositório na VPS:

```bash
revision="$(git rev-parse HEAD)"
docker build --build-arg APP_COMMIT="$revision" -t "jbfd:$revision" .
sudo install -d -m 700 /opt/jbfd/test
sudo install -m 600 deploy/.env.test.example /opt/jbfd/test/.env
sudo nano /opt/jbfd/test/.env
```

No editor, trocar `JBFD_IMAGE` por `jbfd:` seguido do commit completo usado no
build. Os exemplos não contêm segredos. Nunca enviar os arquivos reais ao GitHub.
Não executar `config` sem `--quiet` ou compartilhar logs contendo credenciais.

```bash
bash scripts/deploy-vps.sh test config
bash scripts/deploy-vps.sh test up
curl --fail http://127.0.0.1:3101/api/health
```

O certificado HTTPS do Test será servido pelo Traefik. Validar navegação, telas e assets no navegador.
Somente depois preparar Live com seu próprio arquivo de ambiente e a mesma
imagem validada. A troca do domínio acontecerá após essa validação.

## Atualizações e recuperação

Construir uma nova imagem com um novo commit, validar no Test e promover para
Live. Manter a imagem anterior: para voltar, alterar apenas `JBFD_IMAGE` no arquivo
do ambiente e executar `up` novamente. Alterações futuras de banco exigirão plano
próprio de migração e backup; voltar a imagem não desfaz alterações de dados.

O script `down` não remove volumes. Este kit não faz deploy automático na VPS,
não reescreve histórico e não instala MCP. A conexão MCP será configurada depois
com autenticação e ferramentas limitadas para inspecionar, atualizar Test e
promover versões. GitHub mantém o código completo; containers executam o build.

import { loadConfig, READ_SCOPE } from "./config.mjs";
import { readSnapshot } from "./snapshot.mjs";

async function check() {
  const config = loadConfig(), issuer = new URL(config.issuer);
  let metadata;
  for (const url of [config.issuer + "/.well-known/openid-configuration", issuer.origin + "/.well-known/oauth-authorization-server" + issuer.pathname]) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error" });
      if (!response.ok) continue;
      metadata = await response.json(); break;
    } catch { /* Try the other standards-based discovery endpoint. */ }
  }
  if (!metadata || metadata.issuer !== config.issuer) throw new Error("Emissor OAuth não está acessível ou não corresponde à configuração.");
  if (!metadata.code_challenge_methods_supported?.includes("S256")) throw new Error("OAuth precisa anunciar PKCE S256.");
  if (metadata.authorization_response_iss_parameter_supported !== true) throw new Error("OAuth precisa identificar o emissor na resposta de autorização para o callback pré-configurado.");
  if (!metadata.scopes_supported?.includes(READ_SCOPE)) throw new Error("OAuth precisa anunciar jbfd:read.");
  for (const field of ["authorization_endpoint", "token_endpoint", "jwks_uri"]) {
    if (!metadata[field] || new URL(metadata[field]).protocol !== "https:") throw new Error("Endpoints OAuth precisam de HTTPS.");
  }
  if (metadata.jwks_uri !== config.jwksUrl) throw new Error("JWKS configurado difere do discovery OAuth.");
  const response = await fetch(config.jwksUrl, { signal: AbortSignal.timeout(5000), redirect: "error" });
  const jwks = response.ok ? await response.json() : {};
  if (!jwks.keys?.some((key) => ["RSA", "EC"].includes(key.kty) && !key.d)) throw new Error("JWKS sem chaves públicas compatíveis.");
  if ((await readSnapshot(config.snapshotPath)).stale) throw new Error("Coletor não atualiza o snapshot há mais de 180 segundos.");
  console.log("Preflight aprovado: configuração, discovery OAuth, PKCE, scope, JWKS e coletor. Login completo do cliente ainda exige validação.");
}
check().catch(() => {
  console.error("Preflight reprovado. Verifique configuração OAuth, discovery HTTPS, PKCE, scope/JWKS e atualidade do coletor. Nenhum serviço iniciado.");
  process.exitCode = 1;
});

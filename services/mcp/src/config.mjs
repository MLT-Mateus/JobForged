export const READ_SCOPE = "jbfd:read";

function secureUrl(value, field) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error(field + " deve ser uma URL HTTPS sem credenciais ou parâmetros.");
  }
  return url.href.replace(/\/$/, "");
}

function allowlist(value, field) {
  const entries = (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!entries.length || entries.some((entry) => /SUBSTITUA|PREENCHA|\*/i.test(entry))) {
    throw new Error(field + " precisa de uma lista explícita, sem curingas.");
  }
  return new Set(entries);
}

export function loadConfig(env = process.env) {
  const resource = secureUrl(env.MCP_RESOURCE_URL ?? "https://mcp.jobforged.com/mcp", "MCP_RESOURCE_URL");
  if (new URL(resource).pathname !== "/mcp") throw new Error("O endpoint precisa terminar em /mcp.");
  const issuer = secureUrl(env.MCP_OAUTH_ISSUER ?? "https://auth.jobforged.com/realms/jbfd", "MCP_OAUTH_ISSUER");
  const jwksUrl = secureUrl(env.MCP_OAUTH_JWKS_URL ?? issuer + "/protocol/openid-connect/certs", "MCP_OAUTH_JWKS_URL");
  if (new URL(jwksUrl).origin !== new URL(issuer).origin) throw new Error("JWKS e emissor precisam usar a mesma origem.");
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválida.");
  const origins = (env.MCP_ALLOWED_ORIGINS ?? "https://chatgpt.com").split(",").filter(Boolean)
    .map((origin) => secureUrl(origin.trim(), "MCP_ALLOWED_ORIGINS"));
  if (origins.some((origin) => new URL(origin).origin !== origin)) throw new Error("Origin não pode ter caminho.");
  return {
    resource, issuer, jwksUrl, port,
    host: env.HOST ?? "0.0.0.0",
    allowedHost: new URL(resource).host,
    origins: new Set(origins),
    subjects: allowlist(env.MCP_ALLOWED_SUBJECTS, "MCP_ALLOWED_SUBJECTS"),
    clients: allowlist(env.MCP_ALLOWED_CLIENTS, "MCP_ALLOWED_CLIENTS"),
    snapshotPath: env.MCP_SNAPSHOT_FILE ?? "/snapshots/state.json",
    metadataUrl: new URL(resource).origin + "/.well-known/oauth-protected-resource/mcp",
  };
}

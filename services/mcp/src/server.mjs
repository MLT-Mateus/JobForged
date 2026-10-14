import http from "node:http";
import { pathToFileURL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createVerifier, AccessDenied } from "./auth.mjs";
import { loadConfig, READ_SCOPE } from "./config.mjs";
import { createMcpServer } from "./tools.mjs";

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 65536) throw new AccessDenied(413, "request_too_large");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AccessDenied(400, "invalid_json"); }
}

export function createHttpServer(config, verify = createVerifier(config)) {
  let windowStart = Date.now(), count = 0, active = 0;
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === "/healthz" && req.method === "GET") return json(res, 200, { status: "ok", service: "jbfd-mcp" });
      if (req.headers.host !== config.allowedHost) return json(res, 403, { error: "invalid_host" });
      const origin = req.headers.origin;
      if (origin && !config.origins.has(origin)) return json(res, 403, { error: "invalid_origin" });
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate, MCP-Protocol-Version");
      }
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, MCP-Protocol-Version, Accept");
        res.writeHead(204); return res.end();
      }
      if (req.method === "GET" && ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"].includes(req.url)) {
        return json(res, 200, { resource: config.resource, authorization_servers: [config.issuer], scopes_supported: [READ_SCOPE], bearer_methods_supported: ["header"] });
      }
      if (req.url !== "/mcp") return json(res, 404, { error: "not_found" });
      if (Date.now() - windowStart > 60000) { windowStart = Date.now(); count = 0; }
      if (++count > 120 || active >= 16) { res.setHeader("Retry-After", "60"); return json(res, 429, { error: "rate_limited" }); }
      await verify(req.headers.authorization);
      if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { error: "method_not_allowed" }); }
      if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) return json(res, 415, { error: "unsupported_media_type" });
      const body = await readBody(req);
      active++;
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      const mcp = createMcpServer(config);
      res.once("close", () => { active--; Promise.allSettled([transport.close(), mcp.close()]); });
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      if (error instanceof AccessDenied) {
        if (error.status === 401 || error.status === 403) res.setHeader("WWW-Authenticate",
          'Bearer error="' + error.code + '", resource_metadata="' + config.metadataUrl + '", scope="' + READ_SCOPE + '"');
        return json(res, error.status, { error: error.code });
      }
      console.error(JSON.stringify({ event: "request_failed" }));
      json(res, 500, { error: "internal_error" });
    }
  });
  server.headersTimeout = 10000; server.requestTimeout = 15000; server.keepAliveTimeout = 5000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = loadConfig(), server = createHttpServer(config);
    server.listen(config.port, config.host, () => console.log(JSON.stringify({ event: "mcp_started", mode: "read-only" })));
    for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => {
      server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref();
    });
  } catch {
    console.error("Configuração MCP incompleta ou inválida. Execute preflight; nenhum servidor foi iniciado.");
    process.exitCode = 1;
  }
}

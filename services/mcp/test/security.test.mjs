import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createVerifier } from "../src/auth.mjs";
import { loadConfig } from "../src/config.mjs";
import { createHttpServer } from "../src/server.mjs";
import { readSnapshot } from "../src/snapshot.mjs";

const baseEnv = { MCP_ALLOWED_SUBJECTS: "test-user", MCP_ALLOWED_CLIENTS: "test-client" };
const config = loadConfig(baseEnv);
let privateKey, verify, temp, server, url;

async function token(overrides = {}, omit = []) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "test-user", azp: "test-client", scope: "jbfd:read", typ: "Bearer",
    iat: now, exp: now + 300, iss: config.issuer, aud: config.resource, ...overrides,
  };
  for (const key of omit) delete payload[key];
  return new SignJWT(payload).setProtectedHeader({ alg: "RS256", kid: "test-key" }).sign(privateKey);
}

function sample(collectedAt = new Date().toISOString()) {
  const environment = {
    container: { state: "running", health: "healthy", restarts: 0 },
    application: { reachable: true, version: "0.00", commit: "4".repeat(40) },
    diagnostics: { available: true, windowMinutes: 15, examinedLines: 3, truncated: false, counts: { error: 1, warning: 1, other: 1 } },
    unwantedSecret: "FIXTURE_PRIVATE_VALUE",
  };
  return { schemaVersion: 1, collectedAt, environments: { test: environment, live: environment } };
}

before(async () => {
  const keys = await generateKeyPair("RS256", { modulusLength: 2048 });
  privateKey = keys.privateKey;
  const jwk = await exportJWK(keys.publicKey);
  verify = createVerifier(config, createLocalJWKSet({ keys: [{ ...jwk, kid: "test-key", alg: "RS256" }] }));
  temp = await mkdtemp(join(tmpdir(), "jbfd-mcp-test-"));
  config.snapshotPath = join(temp, "state.json");
  await writeFile(config.snapshotPath, JSON.stringify(sample()));
  server = createHttpServer(config, verify);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  config.allowedHost = "127.0.0.1:" + server.address().port;
  url = "http://" + config.allowedHost;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
});

test("configuração recusa listas vazias, placeholders, curingas e HTTP", () => {
  for (const env of [
    {}, { ...baseEnv, MCP_ALLOWED_SUBJECTS: "*" },
    { ...baseEnv, MCP_ALLOWED_SUBJECTS: "PREENCHA_SUB" },
    { ...baseEnv, MCP_RESOURCE_URL: "http://mcp.jobforged.com/mcp" },
    { ...baseEnv, MCP_OAUTH_JWKS_URL: "https://other.example/keys" },
  ]) assert.throws(() => loadConfig(env));
});

test("token assinado para usuário, cliente, recurso e scope autorizados funciona", async () => {
  assert.deepEqual(await verify("Bearer " + await token()), { scopes: ["jbfd:read"] });
});

test("recusa tokens ausentes e alterações na assinatura", async () => {
  for (const header of [undefined, "Basic invalid", "Bearer invalid", "Bearer " + (await token()).slice(0, -8) + "invalidx"]) {
    await assert.rejects(verify(header), (error) => error.status === 401);
  }
});

test("recusa expiração, emissor, audiência, ID token e validade excessiva", async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const payload of [
    { exp: now - 60, iat: now - 360 }, { iss: "https://other.example" }, { aud: "other-resource" },
    { typ: "ID" }, { iat: now + 60, exp: now + 360 }, { exp: now + 7200 },
  ]) await assert.rejects(verify("Bearer " + await token(payload)), (error) => error.status === 401);
  await assert.rejects(verify("Bearer " + await token({}, ["exp"])));
});

test("recusa usuário, cliente e scope não autorizados", async () => {
  for (const payload of [{ sub: "other-user" }, { azp: "other-client" }, { scope: "openid profile" }]) {
    await assert.rejects(verify("Bearer " + await token(payload)), (error) => error.status === 403);
  }
});

test("HTTP sem credencial devolve challenge de discovery; metadata não exige segredo", async () => {
  const response = await fetch(url + "/mcp", { method: "POST" });
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate"), /oauth-protected-resource\/mcp/);
  const discovery = await fetch(url + "/.well-known/oauth-protected-resource/mcp");
  assert.equal(discovery.status, 200);
  assert.equal((await discovery.json()).resource, config.resource);
});

test("HTTP bloqueia Origin e Host indevidos", async () => {
  assert.equal((await fetch(url + "/mcp", { method: "POST", headers: { Origin: "https://evil.example" } })).status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    const request = http.request(url + "/mcp", { method: "POST", headers: { Host: "evil.example" } }, (response) => {
      response.resume(); resolve(response.statusCode);
    });
    request.on("error", reject); request.end();
  });
  assert.equal(hostStatus, 403);
});

test("HTTP rejeita corpo inválido e grande, e métodos não suportados", async () => {
  const headers = { Authorization: "Bearer " + await token(), "Content-Type": "application/json" };
  assert.equal((await fetch(url + "/mcp", { method: "POST", headers, body: "{" })).status, 400);
  assert.equal((await fetch(url + "/mcp", { method: "POST", headers, body: " ".repeat(70000) })).status, 413);
  assert.equal((await fetch(url + "/mcp", { method: "DELETE", headers })).status, 405);
});

test("cliente SDK inicializa por HTTP e só encontra ferramentas de consulta", async () => {
  const client = new Client({ name: "test", version: "1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url + "/mcp"), {
    requestInit: { headers: { Authorization: "Bearer " + await token() } },
  });
  try {
    await client.connect(transport);
    const tools = (await client.listTools()).tools;
    assert.deepEqual(tools.map((tool) => tool.name).sort(), ["jbfd_diagnostics", "jbfd_status"]);
    assert(tools.every((tool) => tool.annotations.readOnlyHint === true));
    const status = await client.callTool({ name: "jbfd_status", arguments: { environment: "test" } });
    assert.equal(status.structuredContent.environments.test.application.version, "0.00");
    assert.equal(status.structuredContent.environments.live, undefined);
    assert(!JSON.stringify(status).includes("FIXTURE_PRIVATE_VALUE"));
    const diagnostic = await client.callTool({ name: "jbfd_diagnostics", arguments: { environment: "live" } });
    assert.equal(diagnostic.structuredContent.counts.error, 1);
    const invalid = await client.callTool({ name: "jbfd_status", arguments: { environment: "../../.env" } });
    assert.equal(invalid.isError, true);
    const missing = await client.callTool({ name: "deploy_live", arguments: {} });
    assert.equal(missing.isError, true);
  } finally { await client.close(); }
});

test("snapshots antigos são marcados; campos extra são descartados", async () => {
  const path = join(temp, "old.json");
  await writeFile(path, JSON.stringify(sample(new Date(Date.now() - 240000).toISOString())));
  const snapshot = await readSnapshot(path);
  assert.equal(snapshot.stale, true);
  assert(!JSON.stringify(snapshot).includes("FIXTURE_PRIVATE_VALUE"));
  await writeFile(path, '{"schemaVersion":1}');
  await assert.rejects(readSnapshot(path));
});

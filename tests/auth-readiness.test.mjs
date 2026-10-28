import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";

const jwt = role => ["header", Buffer.from(JSON.stringify({ role })).toString("base64url"), "fixture"].join(".");

async function check(overrides = {}, settingsStatus = 200, enabled = true, settings = {}) {
  const server = createServer((request, response) => {
    const config = request.url === "/api/auth/config";
    response.writeHead(config ? 200 : settingsStatus, { "Content-Type": "application/json" });
    response.end(JSON.stringify(config ? { enabled } : { external: { email: true }, disable_signup: false, mailer_autoconfirm: false, ...settings }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/verify-auth-readiness.mjs"], {
        env: { ...process.env, APP_ENV: "test", PORT: String(port), SUPABASE_URL: "", SUPABASE_INTERNAL_URL: `http://127.0.0.1:${port}`, SUPABASE_ANON_KEY: jwt("anon"), ...overrides },
        stdio: "ignore",
      });
      child.once("error", reject);
      child.once("close", resolve);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test("Auth conectado e configuração pública habilitada permitem deploy", async () => {
  assert.equal(await check(), 0);
});
test("Servidor saudável com credenciais ausentes bloqueia deploy", async () => {
  assert.equal(await check({ SUPABASE_ANON_KEY: "" }), 1);
});
test("Chave privilegiada não pode substituir a chave pública", async () => {
  assert.equal(await check({ SUPABASE_ANON_KEY: jwt("service_role") }), 1);
});
test("Falha no Auth bloqueia deploy mesmo com app saudável", async () => {
  assert.equal(await check({}, 503), 1);
});
test("Configuração desabilitada na aplicação bloqueia deploy", async () => {
  assert.equal(await check({}, 200, false), 1);
});
test("Live exige a conexão interna exclusiva de Live", async () => {
  assert.equal(await check({ APP_ENV: "live" }), 1);
});

test("Test rejeita também o gateway interno de Live", async () => {
  assert.equal(await check({ SUPABASE_INTERNAL_URL: "http://jbfd-live-security-gateway:8080" }), 1);
});
test("Cadastro desabilitado impede publicar uma versão pronta para cadastro", async () => {
  assert.equal(await check({}, 200, true, { disable_signup: true }), 1);
});
test("Confirmação de e-mail é obrigatória também em Test", async () => {
  assert.equal(await check({}, 200, true, { mailer_autoconfirm: true }), 1);
});

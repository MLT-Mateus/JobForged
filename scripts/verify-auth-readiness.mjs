import assert from "node:assert/strict";

// Executed inside the application container; never print credentials or responses.
try {
  const environment = process.env.APP_ENV;
  assert.ok(environment === "test" || environment === "live");
  const url = process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  assert.ok(url && key, "Configuração Supabase ausente");
  const host = new URL(url).hostname;
  if (environment === "live") assert.equal(host, "supabase-live-envoy");
  else assert.notEqual(host, "supabase-live-envoy");
  const claims = JSON.parse(Buffer.from(key.split(".")[1], "base64url"));
  assert.equal(claims.role, "anon");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const settingsResponse = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/settings`, {
    headers, signal: AbortSignal.timeout(10_000),
  });
  assert.equal(settingsResponse.status, 200);
  const settings = await settingsResponse.json();
  assert.equal(settings.external?.email, true);
  assert.notEqual(settings.disable_signup, true);
  if (environment === "live") assert.equal(settings.mailer_autoconfirm, false);
  const configResponse = await fetch(`http://127.0.0.1:${process.env.PORT || "3000"}/api/auth/config`, {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(configResponse.status, 200);
  assert.equal((await configResponse.json()).enabled, true);
  console.log(`Auth ${environment}: configuração, conexão e cadastro por e-mail disponíveis.`);
} catch {
  console.error("Auth indisponível ou configuração incompatível com o ambiente. Deploy interrompido.");
  process.exitCode = 1;
}

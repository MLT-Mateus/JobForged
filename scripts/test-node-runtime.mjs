import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

async function pages(directory = "app", segments = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  if (entries.some((entry) => entry.name === "page.tsx")) {
    result.push(`/${segments.join("/")}`);
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("[") || entry.name.startsWith("@")) continue;
    const next = entry.name.startsWith("(") ? segments : [...segments, entry.name];
    result.push(...await pages(`${directory}/${entry.name}`, next));
  }
  return result;
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHealth(base, environment) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
      assert.equal(response.status, 200);
      const health = await response.json();
      assert.equal(health.status, "ok");
      assert.equal(health.environment, environment);
      assert.equal(health.version, "0.00");
      return;
    } catch {
      await setTimeout(300);
    }
  }
  throw new Error(`Health não respondeu corretamente: ${environment}`);
}

const external = process.argv.slice(2);
assert.ok(external.length === 0 || external.length === 2, "Informe URL Test e URL Live, ou nenhuma URL");
const children = [];
try {
  const targets = [];
  for (const [index, environment] of ["test", "live"].entries()) {
    let base = external[index];
    if (!base) {
      const port = await availablePort();
      const child = spawn(process.execPath, ["server.js"], {
        cwd: "dist/standalone",
        env: { ...process.env, NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(port), APP_ENV: environment, APP_COMMIT: "smoke-test" },
        stdio: ["ignore", "ignore", "pipe"],
      });
      child.stderr.on("data", (data) => process.stderr.write(data));
      children.push(child);
      base = `http://127.0.0.1:${port}`;
    }
    targets.push({ base, environment });
  }
  await Promise.all(targets.map(({ base, environment }) => waitForHealth(base, environment)));
  const routes = [...new Set([
    ...await pages(),
    "/design-system/fundamentos",
    "/app/vagas/job-customer-success",
    "/app/vagas/job-customer-success/editar",
    "/app/vagas/job-customer-success/preview",
  ])];
  for (const { base, environment } of targets) {
    for (const route of routes) {
      const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(15_000) });
      assert.equal(response.status, 200, `${environment}: ${route}`);
      assert.match(response.headers.get("content-type") ?? "", /text\/html/);
      const html = await response.text();
      assert.match(html, /<html/);
      if (route === "/") {
        const assets = [...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g)].map((match) => match[1]);
        assert.ok(assets.length > 0, "Página sem assets JS/CSS");
        for (const asset of assets) {
          const file = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(15_000) });
          assert.equal(file.status, 200, asset);
        }
      }
    }
    console.log(`${environment}: ${routes.length} rotas e assets passaram`);
  }
} finally {
  for (const child of children) child.kill("SIGTERM");
}

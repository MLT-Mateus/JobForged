import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import test from "node:test";

const clientRoot = resolve("dist/client");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function fetchAsset(request) {
  const path = resolve(clientRoot, `.${decodeURIComponent(new URL(request.url).pathname)}`);
  const rel = relative(clientRoot, path);
  if (rel === ".." || rel.startsWith(`..${sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    return new Response(await readFile(path), {
      headers: { "content-type": contentTypes[extname(path)] ?? "application/octet-stream" },
    });
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}

const assets = { fetch: fetchAsset };

function rscPayload(html) {
  return [...html.matchAll(/self\.__VINEXT_RSC_CHUNKS__\.push\("((?:\\.|[^"\\])*)"\)/gs)]
    .map(([, chunk]) => JSON.parse(`"${chunk}"`))
    .join("\n");
}

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    { ASSETS: assets },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

// Signup must remain on the free plan while billing is not available.
test("signup always renders the Freemium plan regardless of URL parameters", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  for (const query of ["plano=basico-mensal", "plano=basico&ciclo=anual", "plano=invalido", ""]) {
    const response = await worker.fetch(
      new Request(`http://localhost/cadastro?${query}`, { headers: { accept: "text/html" } }),
      { ASSETS: assets },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    const rendered = rscPayload(html);
    assert.ok(html.includes("Plano Freemium"), query || "default plan");
    assert.ok(!rendered.includes("initialPlanId"), "paid plan parameters must not reach signup");
  }
});

// Runtime/dependency updates must keep existing entry pages and branded SVGs renderable.
test("existing system pages render with shared brand assets", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  for (const path of ["/", "/design-system", "/app/home", "/app/vagas/nova"]) {
    const response = await worker.fetch(
      new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
      { ASSETS: assets },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200, path);
    const html = await response.text();
    const rendered = rscPayload(html);
    assert.ok(rendered.includes(path), `route data missing from server render: ${path}`);
    assert.match(html, /jobforged-(?:logo-primary|symbol)\.svg/, path);
  }
});

// Explicit links and runtime boundaries share one UI and preserve real HTTP statuses.
test("system state routes preserve their HTTP status and shared actions", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  for (const code of [401, 403, 404, 500, 503]) {
    const response = await worker.fetch(new Request(`http://localhost/${code}`), { ASSETS: assets }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, code, `/${code}`);
    const html = await response.text();
    assert.match(html, /jf-action/);
    assert.match(html, /jobforged-logo-primary/);
  }
  const denied = await worker.fetch(new Request("http://localhost/backoffice"), { ASSETS: assets }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(denied.status, 401);
  const missing = await worker.fetch(new Request("http://localhost/rota-inexistente/para-contrato"), { ASSETS: assets }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(missing.status, 404);
});

// No static platform showcase: unpublished or missing company addresses stay 404.
test("missing company addresses return 404 and legacy preview opens the public address", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  for (const path of ["/jobforged", "/jobforged-carreiras", "/empresa-exemplo-sem-rota"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`), { ASSETS: assets }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /Vamos reencontrar o caminho/);
  }
  const preview = await worker.fetch(new Request("http://localhost/app/personalizacao/previa"), { ASSETS: assets }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(preview.status, 200);
  assert.match(await preview.text(), /Abrindo página da empresa/);
});

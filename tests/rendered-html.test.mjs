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

// A plan linked from the landing page must reach the signup client on first render.
test("signup renders the plan supplied by the URL and falls back for invalid plans", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  for (const [query, initialPlanId] of [
    ["plano=basico-mensal", "basico-mensal"],
    ["plano=basico&ciclo=anual", "basico-anual"],
    ["plano=invalido", "profissional-anual"],
    ["", "profissional-anual"],
  ]) {
    const response = await worker.fetch(
      new Request(`http://localhost/cadastro?${query}`, { headers: { accept: "text/html" } }),
      { ASSETS: assets },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    const rendered = rscPayload(html);
    assert.ok(
      rendered.includes(`\"initialPlanId\":\"${initialPlanId}\"`),
      query || "default plan",
    );
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
    const rendered = rscPayload(await response.text());
    assert.ok(rendered.includes(path), `route data missing from server render: ${path}`);
    assert.match(rendered, /jobforged-(?:logo-primary|symbol)\.svg/, path);
  }
});

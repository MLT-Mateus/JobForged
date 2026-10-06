import assert from "node:assert/strict";
import test from "node:test";

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
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
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

// A plan linked from the landing page must be present in the first server render.
test("signup renders the plan supplied by the URL and falls back for invalid plans", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  for (const [query, selected] of [
    ["plano=basico-mensal", "Básico · Mensal"],
    ["plano=basico&ciclo=anual", "Básico · Anual"],
    ["plano=invalido", "Profissional · Anual"],
    ["", "Profissional · Anual"],
  ]) {
    const response = await worker.fetch(
      new Request(`http://localhost/cadastro?${query}`, { headers: { accept: "text/html" } }),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200);
    const html = (await response.text()).replace(/<!--.*?-->/gs, "");
    assert.ok(html.includes(`Plano selecionado</span><strong>${selected}</strong>`), query || "default plan");
  }
});

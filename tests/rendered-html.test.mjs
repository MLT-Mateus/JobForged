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

test("renders canonical SEO metadata and JobForged structured data", async () => {
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
  const html = await response.text();
  assert.match(html, /<title>JobForged \| Recrutamento e seleção com a sua marca<\/title>/i);
  assert.match(html, /<meta name="description" content="Organize vagas, currículos e etapas de recrutamento/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/jobforged\.com\/"/i);
  assert.match(html, /<meta property="og:title" content="JobForged \| Recrutamento e seleção com a sua marca"/i);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type":"SoftwareApplication"/);
  assert.ok(rscPayload(html).includes("Recrute com a "), "main LP copy is present in the server-rendered RSC payload");
});

test("Test and private routes are noindex, while the Live sitemap lists only approved URLs", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const env = { ASSETS: assets };
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  const testHome = await worker.fetch(new Request("https://test.jobforged.com/", { headers: { accept: "text/html" } }), env, ctx);
  assert.equal(testHome.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

  const privateLogin = await worker.fetch(new Request("https://jobforged.com/login", { headers: { accept: "text/html" } }), env, ctx);
  assert.match(await privateLogin.text(), /<meta name="robots" content="noindex, nofollow"/i);
  assert.equal(privateLogin.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

  const liveHome = await worker.fetch(new Request("https://jobforged.com/", { headers: { accept: "text/html" } }), env, ctx);
  assert.equal(liveHome.headers.get("x-robots-tag"), null);

  const liveSitemap = await worker.fetch(new Request("https://jobforged.com/sitemap.xml"), env, ctx);
  assert.equal(liveSitemap.status, 200);
  const liveXml = await liveSitemap.text();
  assert.match(liveXml, /https:\/\/jobforged\.com\//);
  assert.doesNotMatch(liveXml, /test\.jobforged\.com|\/login|\/cadastro|\/app|design-system/i);

  const testSitemap = await worker.fetch(new Request("https://test.jobforged.com/sitemap.xml"), env, ctx);
  assert.equal(testSitemap.status, 200);
  const testSitemapXml = await testSitemap.text();
  assert.doesNotMatch(testSitemapXml, /test\.jobforged\.com|\/login|\/cadastro|\/app|design-system/i);
  assert.equal((testSitemapXml.match(/<url>/g) ?? []).length, 4);

  const testRobots = await worker.fetch(new Request("https://test.jobforged.com/robots.txt"), env, ctx);
  const testRobotsText = await testRobots.text();
  assert.doesNotMatch(testRobotsText, /Sitemap:/i);

  const liveRobots = await worker.fetch(new Request("https://jobforged.com/robots.txt"), env, ctx);
  assert.match(await liveRobots.text(), /Sitemap:\s*https:\/\/jobforged\.com\/sitemap\.xml/i);
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
    const rendered = rscPayload(await response.text());
    assert.ok(rendered.includes(path), `route data missing from server render: ${path}`);
    assert.match(rendered, /jobforged-(?:logo-primary|symbol)\.svg/, path);
  }
});

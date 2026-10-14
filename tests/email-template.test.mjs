import assert from "node:assert/strict";
import test from "node:test";
import { renderEmailHtml, resolveEmailTheme } from "../app/design-system/email-template-catalog.ts";

test("company welcome email escapes personalized text and keeps a safe HTTPS CTA", () => {
  const html = renderEmailHtml("company-welcome", "light", false, {}, {
    FIRST_NAME: "<Mateus>",
    COMPANY_NAME: "A & B \"RH\"",
    APP_URL: "https://test.jobforged.com/app/home?source=welcome&mode=free",
  });

  assert.match(html, /Olá, &lt;Mateus&gt;\./);
  assert.match(html, /A &amp; B &quot;RH&quot;/);
  assert.match(html, /href="https:\/\/test\.jobforged\.com\/app\/home\?source=welcome&amp;mode=free"/);
  assert.doesNotMatch(html, /<Mateus>/);
});

test("company welcome email does not allow unsafe CTA URL schemes", () => {
  const html = renderEmailHtml("company-welcome", "light", false, {}, {
    FIRST_NAME: "Mateus",
    COMPANY_NAME: "JobForged",
    APP_URL: "javascript:alert(1)",
  });

  assert.match(html, /href="#"/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test("email theme defaults to light and respects a saved dark preference", () => {
  assert.equal(resolveEmailTheme(undefined), "light");
  assert.equal(resolveEmailTheme("light"), "light");
  assert.equal(resolveEmailTheme("dark"), "dark");
});

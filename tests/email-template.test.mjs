import assert from "node:assert/strict";
import test from "node:test";
import { emailTemplates, renderEmailHtml, resolveEmailTheme } from "../app/design-system/email-template-catalog.ts";

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

test("password recovery template uses branded typography and a button-style CTA", () => {
  const html = renderEmailHtml("password-recovery", "light");

  assert.match(html, /font-family:'Montserrat Variable', 'Montserrat', 'Arial', sans-serif;/);
  assert.match(html, /font-family:'Open Sans Variable', 'Open Sans', 'Arial', sans-serif;/);
  assert.match(html, /display:inline-block;min-height:40px;box-sizing:border-box;padding:11px 15px/);
  assert.match(html, /border-radius:10px;background-color:#dff5f2;color:#087a76/);
  assert.match(html, /href="\{\{ \.SiteURL \}\}\/redefinir-senha\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery"/);
});

test("email template previews show inert button controls without navigating", () => {
  for (const template of emailTemplates) {
    const html = renderEmailHtml(template.id, "light", true);
    assert.match(html, /<button type="button" style="[^"]*">/);
    assert.doesNotMatch(html, /<a\b|href="https:\/\//);
    assert.doesNotMatch(html, /\{\{ \.TokenHash \}\}/);
  }
});

test("recovery email export keeps its working Supabase link", () => {
  const html = renderEmailHtml("password-recovery", "light", false);

  assert.match(html, /<a href="\{\{ \.SiteURL \}\}\/redefinir-senha\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery"/);
});

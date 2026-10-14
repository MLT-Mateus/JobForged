import { renderEmailHtml } from "@/app/design-system/email-template-catalog";

export const runtime = "nodejs";

export function GET() {
  return new Response(renderEmailHtml("auth-confirmation", "light"), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; img-src https://jobforged.com; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

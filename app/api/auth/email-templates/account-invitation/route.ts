import { renderEmailHtml } from "@/app/design-system/email-template-catalog";

export const runtime = "nodejs";
export function GET() {
  return new Response(renderEmailHtml("account-invitation", "light"), {
    headers: { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}

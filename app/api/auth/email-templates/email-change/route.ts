import {renderEmailHtml} from "@/app/design-system/email-template-catalog";
export const runtime="nodejs";

export function GET(){
 return new Response(renderEmailHtml("email-change","light"),{
  headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; base-uri 'none'; form-action 'none'","X-Content-Type-Options":"nosniff"},
 });
}

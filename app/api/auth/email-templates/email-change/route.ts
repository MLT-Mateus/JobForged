export const runtime="nodejs";

export function GET(){
 return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Confirme seu novo e-mail</title><h1>Confirme seu novo e-mail</h1><p>Confirme a troca para usar o novo endereço no login da JobForged.</p><p><a href="{{ .SiteURL }}/confirmar-email?token_hash={{ .TokenHash }}&amp;type=email_change">Confirmar novo e-mail</a></p><p>Se você não fez esta solicitação, ignore esta mensagem.</p></html>',{
  headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; base-uri 'none'; form-action 'none'","X-Content-Type-Options":"nosniff"},
 });
}

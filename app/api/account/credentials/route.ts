import type {NextRequest} from "next/server";
import {clearSessionCookies, readSession, requestAuth, requireSameOrigin} from "../../auth/_server";
import {isEmail, passwordRules} from "@/app/components/auth/auth-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
 const headers = new Headers({"Cache-Control":"no-store"});
 const reply = (message: string, status: number) => Response.json({message}, {status, headers});
 if (!requireSameOrigin(request)) return reply("Origem inválida.", 403);
 try {
  const session = await readSession(request, headers);
  if (!session || (!session.company && !session.platformAdmin)) return reply("Entre novamente para continuar.", 401);
  const input = await request.json().catch(() => null) as {operation?: unknown; password?: unknown; email?: unknown; confirmation?: unknown} | null;
  if (input?.operation === "password") {
   const password = typeof input.password === "string" ? input.password : "";
   if (new TextEncoder().encode(password).length > 72 || !Object.values(passwordRules(password)).every(Boolean))
    return reply("Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.", 400);
   if (password !== input.confirmation) return reply("As senhas não coincidem.", 400);
   const updated = await requestAuth("user", {password}, session.accessToken, "PUT");
   if (!updated.response?.ok) return reply("Não foi possível trocar a senha. Entre novamente e tente de novo.", 400);
   await requestAuth("logout?scope=global", {}, session.accessToken).catch(() => null);
   clearSessionCookies(headers);
   return Response.json({ok:true}, {headers});
  }
  if (input?.operation === "email" && session.company && !session.platformAdmin) {
   const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
   if (email.length > 254 || !isEmail(email) || email === session.email.toLowerCase())
    return reply("Informe um novo e-mail válido.", 400);
   if (email !== (typeof input.confirmation === "string" ? input.confirmation.trim().toLowerCase() : ""))
    return reply("Os e-mails não coincidem.", 400);
   const updated = await requestAuth("user", {email}, session.accessToken, "PUT");
   if (!updated.response?.ok) return reply("Não foi possível solicitar a troca. Confira o endereço e tente novamente.", 400);
   return Response.json({ok:true}, {headers});
  }
  return reply("Operação indisponível para esta conta.", 403);
 } catch {
  return reply("Serviço indisponível. Tente novamente.", 503);
 }
}

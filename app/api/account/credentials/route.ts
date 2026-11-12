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
  if (!session || !session.company || session.platformAdmin) return reply("Entre novamente para continuar.", 401);
  const input = await request.json().catch(() => null) as {operation?: unknown; password?: unknown; email?: unknown; confirmation?: unknown; currentPassword?: unknown} | null;
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
  if (input?.operation === "email") {
   const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
   if (email.length > 254 || !isEmail(email) || email === session.email.toLowerCase())
    return reply("Informe um novo e-mail válido.", 400);
   if (email !== (typeof input.confirmation === "string" ? input.confirmation.trim().toLowerCase() : ""))
    return reply("Os e-mails não coincidem.", 400);
   const currentPassword=typeof input.currentPassword==='string'?input.currentPassword:'';
   if(!currentPassword||new TextEncoder().encode(currentPassword).length>72)return reply("Informe sua senha atual.",400);
   const reauth=await requestAuth("token?grant_type=password",{email:session.email,password:currentPassword});
   const user=reauth.payload?.user as {id?:string}|undefined;
   const token=reauth.payload?.access_token;
   if(!reauth.response?.ok||user?.id!==session.id||typeof token!=='string')return reply("A senha atual não confere.",400);
   const updated=await requestAuth("user",{email},token,"PUT").finally(()=>requestAuth("logout?scope=local",{},token).catch(()=>null));
   if (!updated.response?.ok) return reply("Não foi possível solicitar a troca. Confira o endereço e tente novamente.", 400);
   return Response.json({ok:true}, {headers});
  }
  return reply("Operação indisponível para esta conta.", 403);
 } catch {
  return reply("Serviço indisponível. Tente novamente.", 503);
 }
}

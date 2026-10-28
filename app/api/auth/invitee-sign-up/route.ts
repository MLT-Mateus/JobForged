import type { NextRequest } from "next/server";
import { isEmail, passwordRules } from "@/app/components/auth/auth-validation";
import { getSupabaseConfig, requestDatabase, requestAuth, requireSameOrigin } from "../_server";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { token?: unknown; email?: unknown; password?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^[0-9a-f]{64}$/.test(token) || !isEmail(email) || password.length > 72 || Object.values(passwordRules(password)).some(valid => !valid))
    return Response.json({ message: "Revise os dados do convite." }, { status: 400 });
  const config = getSupabaseConfig();
  if (!config) return Response.json({ message: "Serviço indisponível." }, { status: 503 });
  const match = await requestDatabase("rpc/company_invitation_matches", config.anonKey, { invitation_token: token, invite_email: email });
  if (!match?.ok || await match.json() !== true) return Response.json({ message: "Convite inválido ou expirado para este e-mail." }, { status: 400 });
  const signup = await requestAuth("signup", { email, password, data: { account_type: "company_invitee" } });
  if (!signup.response?.ok) return Response.json({ message: "Não foi possível criar a conta. Se já existe, entre com sua senha para aceitar o convite." }, { status: 400 });
  return Response.json({ ok: true, message: "Conta criada. Confirme seu e-mail e volte ao convite para entrar." }, { headers: { "Cache-Control": "no-store" } });
}

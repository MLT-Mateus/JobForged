import type { NextRequest } from "next/server";
import { isEmail } from "@/app/components/auth/auth-validation";
import { clearPasswordRecoveryCookie, requireSameOrigin, requestAuth, setSessionCookies, type SupabaseSessionPayload } from "../_server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem da solicitação inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(email) || !password || password.length > 72) {
    return Response.json({ message: "Informe um e-mail válido e uma senha." }, { status: 400 });
  }

  try {
    const result = await requestAuth("token?grant_type=password", { email, password });
    if (!result.configured) return Response.json({ message: "A autenticação ainda não está configurada neste ambiente." }, { status: 503 });
    if (!result.response?.ok || !(result.payload as SupabaseSessionPayload).access_token) {
      return Response.json({ message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const headers = new Headers({ "Cache-Control": "no-store" });
    clearPasswordRecoveryCookie(headers);
    setSessionCookies(headers, result.payload as SupabaseSessionPayload);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ message: "Serviço de autenticação indisponível. Tente novamente." }, { status: 503 });
  }
}

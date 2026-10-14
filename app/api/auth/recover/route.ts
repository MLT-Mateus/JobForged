import type { NextRequest } from "next/server";
import { isEmail } from "@/app/components/auth/auth-validation";
import { requireSameOrigin, requestAuth } from "../_server";

export const runtime = "nodejs";

const genericMessage = "Se houver uma conta associada a este e-mail, você receberá instruções para redefinir a senha.";

function recoveryRedirect() {
  const origin = process.env.APP_ENV === "live" ? "https://jobforged.com" : "https://test.jobforged.com";
  return `${origin}/redefinir-senha`;
}

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem da solicitação inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isEmail(email) || email.length > 254) {
    return Response.json({ message: "Informe um e-mail válido." }, { status: 400 });
  }

  try {
    const redirectTo = encodeURIComponent(recoveryRedirect());
    const result = await requestAuth(`recover?redirect_to=${redirectTo}`, { email });
    if (!result.configured) return Response.json({ message: "A autenticação ainda não está configurada neste ambiente." }, { status: 503 });
    if (!result.response?.ok) {
      // Keep a neutral response for unknown users and Auth rate limits. Never disclose account existence.
      if (result.response?.status === 429 || result.response?.status === 404) {
        return Response.json({ ok: true, message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
      }
      return Response.json({ message: "Não foi possível solicitar a recuperação agora. Tente novamente em instantes." }, { status: 503 });
    }
    return Response.json({ ok: true, message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Não foi possível solicitar a recuperação agora. Tente novamente em instantes." }, { status: 503 });
  }
}

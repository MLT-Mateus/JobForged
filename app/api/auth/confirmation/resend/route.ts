import type { NextRequest } from "next/server";
import { isEmail } from "@/app/components/auth/auth-validation";
import { requireSameOrigin, requestAuth } from "../../_server";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isEmail(email) || email.length > 254) return Response.json({ message: "Informe um e-mail válido." }, { status: 400 });
  try {
    const result = await requestAuth("resend", { type: "signup", email });
    if (!result.configured) return Response.json({ message: "Serviço indisponível." }, { status: 503 });
    return Response.json({ ok: true, message: "Se houver um cadastro pendente, enviaremos um novo link." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "Não foi possível solicitar o e-mail agora." }, { status: 503 }); }
}

import type { NextRequest } from "next/server";
import { getCookie, requestAuth, requestDatabase, requireSameOrigin } from "@/app/api/auth/_server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!/^[0-9a-f]{64}$/.test(token)) return Response.json({ message: "Convite inválido." }, { status: 400 });
  // A confirmed invitee has no company membership until this operation succeeds.
  const access = getCookie(request, "jf_auth_access");
  if (!access) return Response.json({ message: "Entre com o e-mail convidado para continuar." }, { status: 401 });
  const user = await requestAuth("user", undefined, access);
  if (!user.response?.ok || !(user.payload as { email_confirmed_at?: string }).email_confirmed_at)
    return Response.json({ message: "Confirme seu e-mail antes de aceitar o convite." }, { status: 401 });
  const response = await requestDatabase("rpc/accept_company_invitation", access, { invitation_token: token });
  if (!response?.ok) return Response.json({ message: "Convite expirado, já utilizado ou destinado a outro e-mail." }, { status: 400 });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

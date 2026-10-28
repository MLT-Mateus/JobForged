import type { NextRequest } from "next/server";
import { readSession, requestDatabase, requireSameOrigin } from "@/app/api/auth/_server";
import { sendCompanyInvitationEmail } from "@/app/lib/brevo-email";
import { isEmail } from "@/app/components/auth/auth-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session || session.platformAdmin || !session.company || !["owner", "admin"].includes(session.role)) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role === "admin" ? "admin" : "member";
  if (!isEmail(email) || email.length > 254) return Response.json({ message: "Informe um e-mail válido." }, { status: 400, headers });
  const response = await requestDatabase("rpc/create_company_invitation", session.accessToken,
    { target_company_id: session.company.id, invite_email: email, invite_role: role });
  if (!response?.ok) return Response.json({ message: "Não foi possível criar o convite." }, { status: 400, headers });
  const rows = await response.json() as Array<{ invitation_id: string; invitation_token: string }>;
  const invitation = rows[0];
  if (!invitation) return Response.json({ message: "Não foi possível criar o convite." }, { status: 503, headers });
  const delivery = await sendCompanyInvitationEmail(email, session.company.name, invitation.invitation_token);
  if (delivery !== "sent") {
    await requestDatabase("rpc/revoke_company_invitation", session.accessToken,
      { target_company_id: session.company.id, target_invitation_id: invitation.invitation_id });
    return Response.json({ message: "O e-mail de convite não pôde ser enviado. Tente novamente." }, { status: 503, headers });
  }
  return Response.json({ ok: true, message: "Convite enviado." }, { headers });
}

export async function PATCH(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session || session.platformAdmin || !session.company || !["owner", "admin"].includes(session.role)) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { id?: unknown; role?: unknown; status?: unknown } | null;
  const id = typeof body?.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : "";
  if (!id || !["owner", "admin", "member"].includes(String(body?.role)) || !["active", "inactive"].includes(String(body?.status)))
    return Response.json({ message: "Alteração inválida." }, { status: 400, headers });
  const response = await requestDatabase("rpc/update_company_member", session.accessToken,
    { target_company_id: session.company.id, target_member_id: id, new_role: body?.role, new_status: body?.status });
  if (!response?.ok) return Response.json({ message: "Você não pode alterar esse acesso." }, { status: 403, headers });
  return Response.json({ member: await response.json() }, { headers });
}

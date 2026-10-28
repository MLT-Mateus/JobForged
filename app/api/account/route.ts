import type { NextRequest } from "next/server";
import { readSession, requestDatabase, requireSameOrigin } from "@/app/api/auth/_server";

export const runtime = "nodejs";
export async function PATCH(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session || session.platformAdmin || !session.company) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { fullName?: unknown } | null;
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  if (fullName.length < 3 || fullName.length > 120) return Response.json({ message: "Informe um nome entre 3 e 120 caracteres." }, { status: 400, headers });
  const response = await requestDatabase("rpc/update_my_member_profile", session.accessToken, { new_full_name: fullName });
  if (!response?.ok) return Response.json({ message: "Não foi possível salvar o perfil." }, { status: 400, headers });
  const member = await response.json() as { full_name: string };
  return Response.json({ fullName: member.full_name }, { headers });
}

import type { NextRequest } from "next/server";
import { readSession, requestDatabase, requireSameOrigin } from "@/app/api/auth/_server";
import { isValidCnpj } from "@/app/components/auth/auth-validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session || session.platformAdmin || !session.company) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const result = await requestDatabase("rpc/company_read_v1", session.accessToken, {});
  if (!result?.ok) return Response.json({ message: "Não foi possível carregar a empresa." }, { status: 503, headers });
  return Response.json(await result.json(), { headers });
}

export async function PATCH(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session || session.platformAdmin || !session.company || !["owner", "admin"].includes(session.role)) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { name?: unknown; cnpj?: unknown; phone?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const cnpj = typeof body?.cnpj === "string" ? body.cnpj.replace(/\D/g, "") : "";
  const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (name.length < 2 || name.length > 160 || !isValidCnpj(cnpj) || !/^\d{10,11}$/.test(phone))
    return Response.json({ message: "Revise os dados da empresa." }, { status: 400, headers });
  const response = await requestDatabase("rpc/update_company_profile", session.accessToken,
    { target_company_id: session.company.id, new_name: name, new_cnpj: cnpj || null, new_phone: phone || null });
  if (!response?.ok) return Response.json({ message: "Não foi possível salvar os dados." }, { status: response?.status === 403 ? 403 : 400, headers });
  return Response.json({ company: await response.json() }, { headers });
}

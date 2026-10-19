import type { NextRequest } from "next/server";
import { readSession, requestDatabase, requireSameOrigin } from "@/app/api/auth/_server";
import { sendCompanyInvitationEmail } from "@/app/lib/brevo-email";
import { isValidCnpj } from "@/app/components/auth/auth-validation";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session?.platformAdmin) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const params = request.nextUrl.searchParams;
  const section = params.get("section") || "overview";
  const company = params.get("company") || null;
  const page = Number(params.get("page") || 1);
  if (!["overview","companies","company","users","invitations","settings","audit"].includes(section) ||
    (company && !/^[0-9a-f-]{36}$/i.test(company)) || !Number.isInteger(page) || page < 1 || page > 10000 || (params.get("search") || "").length > 160)
    return Response.json({ message: "Consulta inválida." }, { status: 400, headers });
  const response = await requestDatabase("rpc/platform_read", session.accessToken, { section, search_text: params.get("search") || "", status_filter: params.get("status") || "", page_number: page, company_filter: company });
  if (!response?.ok) return Response.json({ message: "Não foi possível carregar os dados autorizados." }, { status: response?.status === 403 ? 403 : 503, headers });
  return Response.json({ data: await response.json() }, { headers });
}

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session?.platformAdmin) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { operation?: string; company?: string; target?: string; values?: Record<string,string>; reason?: string } | null;
  const operations = ["company.update","company.status","member.update","invitation.create","invitation.resend","invitation.revoke","settings.update"];
  if (!body || !operations.includes(body.operation || "") || typeof body.reason !== "string" || body.reason.trim().length < 5 || body.reason.length > 500 ||
    !body.values || typeof body.values !== "object" || Array.isArray(body.values) || Object.values(body.values).some(v=>typeof v!=="string" || v.length>500) ||
    (body.operation !== "settings.update" && !/^[0-9a-f-]{36}$/i.test(body.company || "")) || (body.target && !/^[0-9a-f-]{36}$/i.test(body.target)))
    return Response.json({ message: "Revise os campos e informe um motivo de 5 a 500 caracteres." }, { status: 400, headers });
  if (body.operation === "company.update" && body.values.cnpj && !isValidCnpj(body.values.cnpj))
    return Response.json({ message: "CNPJ inválido." }, { status: 400, headers });
  if (body.operation === "settings.update") {
    try { const url = new URL(body.values.support_url); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); }
    catch { return Response.json({ message: "Informe um endereço HTTPS de suporte válido." }, { status: 400, headers }); }
  }
  const response = await requestDatabase("rpc/platform_manage", session.accessToken, { operation: body.operation, target_company: body.company || null, target_record: body.target || null, values_json: body.values, change_reason: body.reason });
  if (!response?.ok) return Response.json({ message: "Operação recusada. Confira os dados, o responsável ativo e possíveis vínculos existentes." }, { status: 400, headers });
  const result = await response.json() as { id?: string; token?: string; email?: string; company_name?: string };
  if (result.token && result.email) {
    const delivered = await sendCompanyInvitationEmail(result.email, result.company_name || "Empresa", result.token);
    if (delivered !== "sent") {
      const revoked = await requestDatabase("rpc/platform_manage", session.accessToken, { operation: "invitation.revoke", target_company: body.company, target_record: result.id, values_json: {}, change_reason: "Revogação automática: falha no envio do convite." });
      return Response.json({ message: revoked?.ok ? "O envio falhou e o novo convite foi revogado. Tente novamente." : "O envio falhou. Confira o convite e revogue-o antes de tentar novamente." }, { status: 503, headers });
    }
  }
  return Response.json({ ok: true }, { headers });
}

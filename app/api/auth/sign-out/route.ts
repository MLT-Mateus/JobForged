import type { NextRequest } from "next/server";
import { clearPasswordRecoveryCookie, requestDatabase, getCookie, requestAuth, clearSessionCookies, requireSameOrigin } from "../_server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem da solicitação inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const accessToken = getCookie(request, "jf_auth_access");
  let revoked = !accessToken;
  if (accessToken) {
    try { const result = await requestDatabase("rpc/revoke_current_session", accessToken, {}); revoked = Boolean(result?.ok); } catch { /* Report revocation failure below. */ }
    try { await requestAuth("logout", {}, accessToken); } catch { /* Clear local cookies even if Auth is unreachable. */ }
  }
  clearPasswordRecoveryCookie(headers);
  clearSessionCookies(headers);
  return Response.json({ ok: revoked, revoked, ...(!revoked ? { message: "A sessão local foi encerrada, mas a revogação no servidor não pôde ser confirmada." } : {}) }, { status: revoked ? 200 : 503, headers });
}

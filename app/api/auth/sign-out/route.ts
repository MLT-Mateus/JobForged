import type { NextRequest } from "next/server";
import { getCookie, requestAuth, clearSessionCookies, requireSameOrigin } from "../_server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem da solicitação inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const accessToken = getCookie(request, "jf_auth_access");
  if (accessToken) {
    try { await requestAuth("logout", {}, accessToken); } catch { /* Clear local cookies even if Auth is unreachable. */ }
  }
  clearSessionCookies(headers);
  return Response.json({ ok: true }, { headers });
}

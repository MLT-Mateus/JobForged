import type { NextRequest } from "next/server";
import { requireSameOrigin, requestAuth, setPasswordRecoveryCookie, setSessionCookies, type SupabaseSessionPayload } from "../../_server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem da solicitação inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { tokenHash?: unknown; type?: unknown } | null;
  const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash.trim() : "";
  if ((body?.type !== "recovery" && body?.type !== "invite") || tokenHash.length < 16 || tokenHash.length > 512 || /\s/.test(tokenHash)) {
    return Response.json({ message: "Este link de recuperação é inválido ou expirou. Solicite outro." }, { status: 400 });
  }

  try {
    const result = await requestAuth("verify", { type: body.type, token_hash: tokenHash });
    if (!result.configured) return Response.json({ message: "A autenticação ainda não está configurada neste ambiente." }, { status: 503 });
    const session = result.payload as SupabaseSessionPayload;
    if (!result.response?.ok || !session.access_token || !session.refresh_token) {
      return Response.json({ message: "Este link de recuperação é inválido ou expirou. Solicite outro." }, { status: 400 });
    }

    const verifiedUser = await requestAuth("user", undefined, session.access_token);
    if (!verifiedUser.response?.ok) {
      return Response.json({ message: "Este link de recuperação é inválido ou expirou. Solicite outro." }, { status: 400 });
    }

    const headers = new Headers({ "Cache-Control": "no-store", "Pragma": "no-cache" });
    setSessionCookies(headers, session);
    setPasswordRecoveryCookie(headers);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ message: "Não foi possível validar o link. Solicite uma nova recuperação." }, { status: 503 });
  }
}

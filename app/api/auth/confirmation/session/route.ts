import type { NextRequest } from "next/server";
import { requireSameOrigin, requestAuth, setSessionCookies, type SupabaseSessionPayload } from "../../_server";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { tokenHash?: unknown; type?: unknown } | null;
  const token = typeof body?.tokenHash === "string" ? body.tokenHash : "";
  if (body?.type !== "signup" || token.length < 16 || token.length > 512 || /\s/.test(token))
    return Response.json({ message: "Link inválido ou expirado. Solicite um novo e-mail." }, { status: 400 });
  try {
    const result = await requestAuth("verify", { type: "signup", token_hash: token });
    const session = result.payload as SupabaseSessionPayload;
    if (!result.response?.ok || !session.access_token || !session.refresh_token)
      return Response.json({ message: "Link inválido, expirado ou já utilizado. Solicite um novo e-mail." }, { status: 400 });
    const headers = new Headers({ "Cache-Control": "no-store" });
    setSessionCookies(headers, session);
    return Response.json({ ok: true }, { headers });
  } catch { return Response.json({ message: "Não foi possível confirmar agora. Tente novamente." }, { status: 503 }); }
}

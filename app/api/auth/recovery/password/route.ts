import type { NextRequest } from "next/server";
import { passwordRules } from "@/app/components/auth/auth-validation";
import { clearPasswordRecoveryCookie, clearSessionCookies, getCookie, hasPasswordRecoveryCookie, requireSameOrigin, requestAuth, requestDatabase } from "../../_server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem da solicitação inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { password?: unknown; confirmPassword?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  if (password.length > 72 || Object.values(passwordRules(password)).some((valid) => !valid)) {
    return Response.json({ message: "A senha precisa ter ao menos 8 caracteres, maiúscula, minúscula, número e símbolo." }, { status: 400 });
  }
  if (password !== confirmPassword) return Response.json({ message: "As senhas não coincidem." }, { status: 400 });
  if (!hasPasswordRecoveryCookie(request)) return Response.json({ message: "Valide o link enviado por e-mail antes de definir uma senha." }, { status: 403 });

  const accessToken = getCookie(request, "jf_auth_access");
  if (!accessToken) return Response.json({ message: "A sessão de recuperação expirou. Solicite um novo link." }, { status: 401 });

  try {
    const consumed = await requestDatabase("rpc/consume_password_recovery", accessToken, { nonce: getCookie(request, "jf_password_recovery") });
    if (!consumed?.ok || await consumed.json() !== true) {
      const headers = new Headers({ "Cache-Control": "no-store" });
      clearPasswordRecoveryCookie(headers);
      return Response.json({ message: "Esta recuperação expirou ou já foi usada. Solicite outro link." }, { status: 403, headers });
    }
    const result = await requestAuth("user", { password }, accessToken, "PUT");
    if (!result.configured) return Response.json({ message: "A autenticação ainda não está configurada neste ambiente." }, { status: 503 });
    if (!result.response?.ok) {
      const headers = new Headers({ "Cache-Control": "no-store" });
      clearPasswordRecoveryCookie(headers);
      if (result.response?.status === 401 || result.response?.status === 403) clearSessionCookies(headers);
      return Response.json({ message: result.response?.status === 401 || result.response?.status === 403
        ? "A sessão de recuperação expirou. Solicite um novo link."
        : "Não foi possível atualizar a senha. Verifique os requisitos e tente novamente." }, { status: result.response?.status === 401 || result.response?.status === 403 ? 401 : 400, headers });
    }

    const headers = new Headers({ "Cache-Control": "no-store" });
    try { await requestAuth("logout?scope=global", {}, accessToken); } catch { /* Password update already succeeded. */ }
    clearPasswordRecoveryCookie(headers);
    clearSessionCookies(headers);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ message: "Serviço de autenticação indisponível. Tente novamente." }, { status: 503 });
  }
}

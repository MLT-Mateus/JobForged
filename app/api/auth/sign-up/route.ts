import type { NextRequest } from "next/server";
import { onlyDigits, validateSignup, type SignupValues } from "@/app/components/auth/auth-validation";
import { sendCompanyWelcomeEmail } from "@/app/lib/brevo-email";
import { resolveEmailTheme } from "@/app/design-system/email-template-catalog";
import { requireSameOrigin, requestAuth, setSessionCookies, type SupabaseSessionPayload } from "../_server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem da solicitação inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as (Partial<SignupValues> & { acceptedTerms?: boolean }) | null;
  if (!body) return Response.json({ message: "Não foi possível ler os dados do cadastro." }, { status: 400 });
  if (body.acceptedTerms !== true) return Response.json({ message: "Aceite os termos para criar a conta." }, { status: 400 });

  const values: SignupValues = {
    responsible: typeof body.responsible === "string" ? body.responsible.slice(0, 120) : "",
    company: typeof body.company === "string" ? body.company.slice(0, 160) : "",
    cnpj: typeof body.cnpj === "string" ? body.cnpj : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    password: typeof body.password === "string" ? body.password : "",
    confirmPassword: typeof body.confirmPassword === "string" ? body.confirmPassword : "",
  };
  const errors = validateSignup(values);
  if (Object.keys(errors).length) {
    return Response.json({ message: "Revise os dados do cadastro e tente novamente." }, { status: 400 });
  }

  try {
    const result = await requestAuth("signup", {
      email: values.email,
      password: values.password,
      data: {
        account_type: "company_admin",
        responsible_name: values.responsible.trim(),
        company_name: values.company.trim(),
        company_cnpj: onlyDigits(values.cnpj),
        phone: onlyDigits(values.phone),
        plan_id: "freemium",
        plan_status: "free",
        terms_accepted_at: new Date().toISOString(),
      },
    });
    if (!result.configured) return Response.json({ message: "A autenticação ainda não está configurada neste ambiente." }, { status: 503 });
    if (!result.response?.ok) {
      return Response.json({ message: "Não foi possível criar a conta com esses dados. Verifique se o e-mail já está cadastrado." }, { status: 400 });
    }

    const session = result.payload as SupabaseSessionPayload;
    const requiresConfirmation = !session.access_token;
    if (!requiresConfirmation) {
      await sendCompanyWelcomeEmail({
        email: values.email,
        responsible: values.responsible,
        company: values.company,
        preferredTheme: resolveEmailTheme(request.cookies.get("jobforged-theme")?.value),
      });
    }
    const headers = new Headers({ "Cache-Control": "no-store" });
    if (!requiresConfirmation) setSessionCookies(headers, session);
    return Response.json({ ok: true, requiresConfirmation }, { headers });
  } catch {
    return Response.json({ message: "Serviço de autenticação indisponível. Tente novamente." }, { status: 503 });
  }
}

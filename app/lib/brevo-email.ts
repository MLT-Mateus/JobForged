import {
  renderEmailHtml,
  resolveEmailTheme,
} from "@/app/design-system/email-template-catalog";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER = { name: "JobForged", email: "suporte@jobforged.com" };

export type BrevoSendResult = "sent" | "not-configured" | "failed";

export async function sendCompanyInvitationEmail(email: string, company: string, token: string): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return "not-configured";
  const origin = process.env.APP_ENV === "live" ? "https://jobforged.com" : "https://test.jobforged.com";
  const url = `${origin}/convite?token=${encodeURIComponent(token)}`;
  const safeCompany = company.replace(/[&<>"']/g, "").slice(0, 160);
  try {
    const response = await fetch(BREVO_SEND_URL, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json", "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ sender: SENDER, to: [{ email }], subject: "Convite para acessar uma empresa na JobForged",
        htmlContent: `<html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#142321;padding:24px"><img src="${origin}/brand/jobforged-logo.png" alt="JobForged" width="164"/><h1>Convite para ${safeCompany}</h1><p>Você recebeu um convite para acessar esta empresa na JobForged. O link expira em 24 horas e só funciona com este e-mail confirmado.</p><p><a href="${url}">Aceitar convite</a></p><p>Se você não esperava este convite, ignore esta mensagem.</p></body></html>` }),
    });
    return response.ok ? "sent" : "failed";
  } catch { return "failed"; }
}

function appHomeUrl() {
  const origin = process.env.APP_ENV === "test"
    ? "https://test.jobforged.com"
    : "https://jobforged.com";
  const configured = process.env.APP_PUBLIC_URL;
  try {
    const url = new URL(configured || origin);
    if (url.origin !== origin || url.username || url.password) return `${origin}/app/home`;
    return new URL("/app/home", origin).toString();
  } catch {
    return `${origin}/app/home`;
  }
}

export async function sendCompanyWelcomeEmail({
  email,
  responsible,
  company,
  preferredTheme,
}: {
  email: string;
  responsible: string;
  company: string;
  preferredTheme?: string | null;
}): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return "not-configured";

  try {
    const firstName = responsible.trim().split(/\s+/)[0]?.slice(0, 80) || "";
    const companyName = company.trim().slice(0, 160);
    const htmlContent = renderEmailHtml("company-welcome", resolveEmailTheme(preferredTheme), false, {}, {
      FIRST_NAME: firstName,
      COMPANY_NAME: companyName,
      APP_URL: appHomeUrl(),
    });
    const safeSubjectName = firstName.replace(/[\r\n\u0000-\u001f\u007f]/g, " ").slice(0, 80);
    const response = await fetch(BREVO_SEND_URL, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email }],
        subject: safeSubjectName ? `Bem-vindo à JobForged, ${safeSubjectName}` : "Bem-vindo à JobForged",
        htmlContent,
      }),
    });
    if (!response.ok) {
      console.warn("Brevo não aceitou o e-mail transacional de boas-vindas.", response.status);
      return "failed";
    }
    return "sent";
  } catch {
    console.warn("Não foi possível conectar à API de e-mail transacional.");
    return "failed";
  }
}

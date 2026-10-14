export type EmailTheme = "light" | "dark";

export type EmailTypography = {
  font?: string;
  heading?: string;
  body?: string;
};

const fontStacks: Record<string, string> = {
  Montserrat: '"Montserrat Variable", "Montserrat", Arial, sans-serif',
  "Open Sans": '"Open Sans Variable", "Open Sans", Arial, sans-serif',
  Poppins: '"Poppins", Arial, sans-serif',
};

function fontStack(value: string | undefined, fallback: string) {
  const families = value
    ?.split(",")
    .map((family) => family.trim().replace(/^['"]|['"]$/g, "").replace(/[^\w -]/g, ""))
    .filter(Boolean);
  return (families?.length ? families : fallback.split(",").map((family) => family.trim().replace(/^['"]|['"]$/g, "")))
    .map((family) => `"${family}"`)
    .join(", ");
}

export function resolveEmailTheme(preferredTheme: string | null | undefined): EmailTheme {
  return preferredTheme === "dark" ? "dark" : "light";
}

export type EmailTemplateId =
  | "auth-confirmation"
  | "company-welcome"
  | "application-received"
  | "new-application";

export type EmailTemplateDefinition = {
  id: EmailTemplateId;
  name: string;
  audience: string;
  trigger: string;
  channel: string;
  subject: string;
  description: string;
};

export const emailTemplates: EmailTemplateDefinition[] = [
  {
    id: "auth-confirmation",
    name: "Confirmação de e-mail",
    audience: "Conta JobForged",
    trigger: "Após o cadastro",
    channel: "Supabase Auth · SMTP Brevo",
    subject: "Confirme seu e-mail na JobForged",
    description: "Confirma o endereço usado no cadastro antes de continuar.",
  },
  {
    id: "company-welcome",
    name: "Boas-vindas à empresa",
    audience: "Empresa cliente",
    trigger: "Após criar o espaço da empresa",
    channel: "Brevo · e-mail transacional",
    subject: "Bem-vindo à JobForged, {{ params.FIRST_NAME }}",
    description: "Recebe a pessoa responsável e orienta o primeiro acesso ao espaço da empresa.",
  },
  {
    id: "application-received",
    name: "Candidatura recebida",
    audience: "Pessoa candidata",
    trigger: "Após enviar uma candidatura",
    channel: "Brevo · e-mail transacional",
    subject: "Recebemos sua candidatura para {{ params.JOB_TITLE }}",
    description: "Confirma o recebimento da candidatura com o nome da vaga e da empresa.",
  },
  {
    id: "new-application",
    name: "Nova candidatura",
    audience: "Equipe de recrutamento",
    trigger: "Quando chega uma candidatura",
    channel: "Brevo · notificação transacional",
    subject: "Nova candidatura para {{ params.JOB_TITLE }}",
    description: "Avisa a equipe responsável e oferece um atalho para revisar o perfil.",
  },
];

type EmailCopy = {
  preheader: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  note?: string;
};

const previewValues: Record<string, string> = {
  "{{ .Email }}": "pessoa@empresa.com",
  "{{ .ConfirmationURL }}": "https://jobforged.com/",
  "{{ params.FIRST_NAME }}": "Alex",
  "{{ params.COMPANY_NAME }}": "Empresa Exemplo",
  "{{ params.CANDIDATE_NAME }}": "Larissa Rocha",
  "{{ params.JOB_TITLE }}": "Analista de Customer Success",
  "{{ params.RECRUITER_NAME }}": "Alex",
  "{{ params.APPLICATION_URL }}": "https://jobforged.com/login",
  "{{ params.APP_URL }}": "https://jobforged.com/login",
  "{{ params.JOB_URL }}": "https://jobforged.com/",
};

function copyFor(id: EmailTemplateId): EmailCopy {
  switch (id) {
    case "auth-confirmation":
      return {
        preheader: "Confirme seu endereço para continuar com seu cadastro JobForged.",
        eyebrow: "SEGURANÇA DA CONTA",
        title: "Confirme seu e-mail",
        paragraphs: [
          "Olá, {{ .Email }}.",
          "Recebemos uma solicitação para criar uma conta na JobForged com este endereço. Confirme que ele pertence a você para continuar.",
        ],
        button: { label: "Confirmar meu e-mail", url: "{{ .ConfirmationURL }}" },
        note: "Se você não iniciou este cadastro, pode ignorar esta mensagem.",
      };
    case "company-welcome":
      return {
        preheader: "Seu espaço de recrutamento está pronto para o primeiro acesso.",
        eyebrow: "ESPAÇO DA EMPRESA",
        title: "Boas-vindas à JobForged",
        paragraphs: [
          "Olá, {{ params.FIRST_NAME }}.",
          "O espaço de {{ params.COMPANY_NAME }} foi criado. Acesse sua conta para revisar os dados da empresa e seguir com a configuração inicial.",
        ],
        button: { label: "Acessar meu espaço", url: "{{ params.APP_URL }}" },
        note: "Este e-mail é uma confirmação de cadastro e não altera seu plano ou suas configurações.",
      };
    case "application-received":
      return {
        preheader: "Sua candidatura foi recebida pela equipe responsável pela vaga.",
        eyebrow: "CANDIDATURA ENVIADA",
        title: "Recebemos sua candidatura",
        paragraphs: [
          "Olá, {{ params.CANDIDATE_NAME }}.",
          "Sua candidatura para a vaga de {{ params.JOB_TITLE }} em {{ params.COMPANY_NAME }} foi recebida. A equipe responsável poderá consultar as informações que você enviou.",
        ],
        button: { label: "Ver detalhes da vaga", url: "{{ params.JOB_URL }}" },
        note: "Esta mensagem confirma o recebimento da candidatura. A empresa entrará em contato se houver novidades no processo.",
      };
    case "new-application":
      return {
        preheader: "Uma nova pessoa se candidatou a uma vaga da sua empresa.",
        eyebrow: "ATIVIDADE DE RECRUTAMENTO",
        title: "Nova candidatura recebida",
        paragraphs: [
          "Olá, {{ params.RECRUITER_NAME }}.",
          "{{ params.CANDIDATE_NAME }} se candidatou à vaga de {{ params.JOB_TITLE }}. Acesse sua conta para consultar o perfil e dar continuidade à avaliação.",
        ],
        button: { label: "Acessar candidatura", url: "{{ params.APPLICATION_URL }}" },
        note: "Você recebeu esta notificação porque acompanha o processo seletivo desta vaga.",
      };
  }
}

function valueFor(value: string, preview: boolean) {
  if (!preview) return value;
  return Object.entries(previewValues).reduce(
    (result, [token, replacement]) => result.replaceAll(token, replacement),
    value,
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function palette(theme: EmailTheme) {
  // These fixed email-safe values mirror the JobForged brand and UI tokens in ui.css.
  return theme === "dark"
    ? {
        canvas: "#071f1c",
        card: "#102522",
        surface: "#15302c",
        text: "#f2fbf9",
        muted: "#afc3bf",
        border: "#29413d",
        brand: "#43d0c6",
        accent: "#7e9cff",
        buttonBackground: "#102b27",
        buttonBorder: "#245a54",
        buttonText: "#73e2da",
      }
    : {
        canvas: "#f1f8ff",
        card: "#ffffff",
        surface: "#effaf8",
        text: "#142321",
        muted: "#5d6e6b",
        border: "#dce8e6",
        brand: "#087a76",
        accent: "#4169e1",
        buttonBackground: "#dff5f2",
        buttonBorder: "#a6dcd7",
        buttonText: "#087a76",
      };
}

export function renderEmailHtml(id: EmailTemplateId, theme: EmailTheme, preview = false, typography: EmailTypography = {}) {
  const template = emailTemplates.find((item) => item.id === id);
  if (!template) throw new Error(`Template de e-mail desconhecido: ${id}`);

  const copy = copyFor(id);
  const colors = palette(theme);
  const preferredFont = fontStacks[typography.font ?? "Montserrat"] ?? fontStacks.Montserrat;
  const headingFont = fontStack(typography.heading ?? preferredFont, fontStacks.Montserrat);
  const bodyFont = fontStack(typography.body ?? preferredFont, fontStacks["Open Sans"]);
  const subject = valueFor(template.subject, preview);
  const preheader = valueFor(copy.preheader, preview);
  const paragraphs = copy.paragraphs
    .map((paragraph) => `<p style="margin:0 0 18px;color:${colors.text};font-family:${bodyFont};font-size:16px;line-height:1.65;">${valueFor(paragraph, preview)}</p>`)
    .join("");
  const button = copy.button
    ? `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:26px 0 22px;"><tr><td align="center" bgcolor="${colors.buttonBackground}" style="min-height:40px;padding:11px 14px;border:1px solid ${colors.buttonBorder};border-radius:10px;background-color:${colors.buttonBackground};"><a href="${valueFor(copy.button.url, preview)}" style="display:inline-block;color:${colors.buttonText};font-family:${headingFont};font-size:12px;font-weight:700;line-height:1.4;text-decoration:none;">${escapeHtml(copy.button.label)}</a></td></tr></table>`
    : "";
  const note = copy.note
    ? `<tr><td style="padding:0 32px 30px;"><p style="margin:0;padding:16px;border:1px solid ${colors.border};border-radius:8px;background:${colors.surface};color:${colors.muted};font-family:${bodyFont};font-size:13px;line-height:1.6;">${valueFor(copy.note, preview)}</p></td></tr>`
    : "";
  const previewSubject = preview ? subject : template.subject;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(previewSubject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.canvas};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${colors.canvas}" style="width:100%;border-collapse:collapse;background-color:${colors.canvas};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${colors.card}" style="width:100%;max-width:600px;border:1px solid ${colors.border};border-radius:14px;border-collapse:separate;background-color:${colors.card};">
        <tr><td style="padding:24px 32px;border-bottom:1px solid ${colors.border};">
          <img src="https://jobforged.com/brand/jobforged-logo.png" width="164" height="47" alt="JobForged" style="display:block;width:164px;height:auto;max-width:100%;border:0;">
        </td></tr>
        <tr><td style="padding:32px 32px 10px;">
          <p style="margin:0 0 12px;color:${colors.accent};font-family:${headingFont};font-size:11px;font-weight:bold;letter-spacing:1.1px;line-height:1.4;">${copy.eyebrow}</p>
          <h1 style="margin:0 0 22px;color:${colors.text};font-family:${headingFont};font-size:27px;font-weight:700;line-height:1.25;">${copy.title}</h1>
          ${paragraphs}
          ${button}
        </td></tr>
        ${note}
        <tr><td style="padding:20px 32px;border-top:1px solid ${colors.border};">
          <p style="margin:0 0 6px;color:${colors.muted};font-family:${bodyFont};font-size:12px;line-height:1.5;">Enviado por <strong style="color:${colors.text};font-family:${headingFont};">JobForged &lt;suporte@jobforged.com&gt;</strong></p>
          <p style="margin:0;color:${colors.muted};font-family:${bodyFont};font-size:12px;line-height:1.5;">Recrutamento organizado para empresas.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:${colors.muted};font-family:${bodyFont};font-size:11px;line-height:1.5;">Esta é uma mensagem transacional da JobForged.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function downloadFileName(id: EmailTemplateId, theme: EmailTheme) {
  return `jobforged-${id}-${theme}.html`;
}

export function makeHtmlDownloadUrl(html: string) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

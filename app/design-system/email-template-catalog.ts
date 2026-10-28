export type EmailTheme = "light" | "dark";

export type EmailTypography = {
  font?: string;
  heading?: string;
  body?: string;
};

export type EmailTemplateVariables = Partial<Record<
  "COMMUNICATION_TITLE" | "COMMUNICATION_MESSAGE" | "FIRST_NAME" | "COMPANY_NAME" | "CANDIDATE_NAME" | "JOB_TITLE" | "RECRUITER_NAME" | "APPLICATION_URL" | "APP_URL" | "JOB_URL",
  string
>>;

const fontStacks: Record<string, string> = {
  Montserrat: '"Montserrat Variable", "Montserrat", Arial, sans-serif',
  "Open Sans": '"Open Sans Variable", "Open Sans", Arial, sans-serif',
  Poppins: '"Poppins", Arial, sans-serif',
};

function fontStack(value: string | undefined, fallback: string) {
  const genericFamilies = new Set(["serif", "sans-serif", "monospace", "system-ui", "cursive", "fantasy"]);
  const families = value
    ?.split(",")
    .map((family) => family.trim().replace(/^['"]|['"]$/g, "").replace(/[^\w -]/g, ""))
    .filter(Boolean);
  return (families?.length ? families : fallback.split(",").map((family) => family.trim().replace(/^['"]|['"]$/g, "")))
    .map((family) => genericFamilies.has(family.toLowerCase()) ? family : `'${family}'`)
    .join(", ");
}

export function resolveEmailTheme(preferredTheme: string | null | undefined): EmailTheme {
  return preferredTheme === "dark" ? "dark" : "light";
}

export type EmailTemplateId =
  | "auth-confirmation"
  | "password-recovery"
  | "account-invitation"
  | "platform-communication"
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
  {id:"platform-communication",name:"Comunicado JobForged",audience:"Contas selecionadas no backoffice",trigger:"Publicação e envio pelo backoffice",channel:"Brevo · e-mail transacional",subject:"{{ params.COMMUNICATION_TITLE }}",description:"Comunicado institucional para destinatários verificados."},
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
    id: "password-recovery",
    name: "Recuperação de senha",
    audience: "Conta JobForged",
    trigger: "Após solicitar recuperação de acesso",
    channel: "Supabase Auth · SMTP Brevo",
    subject: "Redefina sua senha na JobForged",
    description: "Entrega um link de uso único para definir uma nova senha sem revelar se o e-mail está cadastrado.",
  },
  { id: "account-invitation", name: "Convite de acesso", audience: "Conta convidada", trigger: "Convite administrativo", channel: "Supabase Auth · SMTP Brevo", subject: "Seu convite de acesso à JobForged", description: "Permite definir a senha com link de uso único." },
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
  "{{ params.COMMUNICATION_TITLE }}": "Novidades para sua equipe",
  "{{ params.COMMUNICATION_MESSAGE }}": "Confira as novidades da JobForged no seu painel.",
  "{{ .Email }}": "pessoa@empresa.com",
  "{{ .ConfirmationURL }}": "https://jobforged.com/",
  "{{ .SiteURL }}": "https://test.jobforged.com",
  "{{ .TokenHash }}": "token-de-exemplo",
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
          "Olá,",
          "Recebemos uma solicitação para criar uma conta na JobForged com este endereço. Confirme que ele pertence a você para continuar.",
        ],
        button: { label: "Confirmar meu e-mail", url: "{{ .SiteURL }}/confirmar-email?token_hash={{ .TokenHash }}&amp;type=signup" },
        note: "Se você não iniciou este cadastro, pode ignorar esta mensagem.",
      };
    case "password-recovery":
      return {
        preheader: "Use o link seguro para escolher uma nova senha para sua conta JobForged.",
        eyebrow: "SEGURANÇA DA CONTA",
        title: "Redefina sua senha",
        paragraphs: [
          "Recebemos uma solicitação para redefinir a senha da sua conta JobForged.",
          "O link é de uso único e expira. Você precisará confirmar a solicitação antes de criar a nova senha.",
        ],
        button: { label: "Redefinir minha senha", url: "{{ .SiteURL }}/redefinir-senha?token_hash={{ .TokenHash }}&amp;type=recovery" },
        note: "Se você não solicitou a recuperação, ignore esta mensagem. Sua senha não será alterada.",
      };
    case "account-invitation":
      return {
        preheader: "Confirme o convite e defina sua senha de acesso.", eyebrow: "SEGURANÇA DA CONTA",
        title: "Convite para acessar a JobForged",
        paragraphs: ["Você recebeu um convite de acesso à JobForged.", "O link é de uso único e expira. Confirme o convite para definir sua senha."],
        button: { label: "Aceitar convite e definir senha", url: "{{ .SiteURL }}/redefinir-senha?token_hash={{ .TokenHash }}&amp;type=invite" },
        note: "Se você não esperava este convite, ignore esta mensagem.",
      };
    case "platform-communication":
      return {preheader:"Uma nova comunicação da JobForged para sua conta.",eyebrow:"COMUNICADO JOBFORGED",title:"{{ params.COMMUNICATION_TITLE }}",paragraphs:["{{ params.COMMUNICATION_MESSAGE }}"],button:{label:"Saiba mais",url:"{{ params.APP_URL }}"},note:"Você recebeu este comunicado por possuir uma conta vinculada à JobForged."};
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeVariable(name: string, value: string) {
  if (!name.endsWith("_URL")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "#";
  } catch {
    return "#";
  }
}

function valueFor(value: string, preview: boolean, variables: EmailTemplateVariables) {
  const replacements: Record<string, string> = preview
    ? previewValues
    : Object.fromEntries(Object.entries(variables)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, replacement]) => [`{{ params.${key} }}`, sanitizeVariable(key, replacement)]));
  return Object.entries(replacements).reduce(
    (result, [token, replacement]) => result.replaceAll(token, preview ? replacement : escapeHtml(replacement)),
    value,
  );
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

export function renderEmailHtml(id: EmailTemplateId, theme: EmailTheme, preview = false, typography: EmailTypography = {}, variables: EmailTemplateVariables = {}) {
  const template = emailTemplates.find((item) => item.id === id);
  if (!template) throw new Error(`Template de e-mail desconhecido: ${id}`);

  const copy = copyFor(id);
  const colors = palette(theme);
  const preferredFont = fontStacks[typography.font ?? "Montserrat"] ?? fontStacks.Montserrat;
  const headingFont = fontStack(typography.heading ?? preferredFont, fontStacks.Montserrat);
  const bodyFont = fontStack(typography.body ?? (typography.font ? preferredFont : fontStacks["Open Sans"]), fontStacks["Open Sans"]);
  const subject = valueFor(template.subject, preview, variables);
  const preheader = valueFor(copy.preheader, preview, variables);
  const paragraphs = copy.paragraphs
    .map((paragraph) => `<p style="margin:0 0 18px;color:${colors.text};font-family:${bodyFont};font-size:16px;line-height:1.65;white-space:pre-wrap;">${valueFor(paragraph, preview, variables)}</p>`)
    .join("");
  const buttonStyles = `display:inline-block;min-height:40px;box-sizing:border-box;padding:11px 15px;border:1px solid ${colors.buttonBorder};border-radius:10px;background-color:${colors.buttonBackground};color:${colors.buttonText};font-family:${headingFont};font-size:11px;font-weight:730;line-height:1.4;text-align:center;text-decoration:none;mso-padding-alt:0;`;
  const button = copy.button
    ? preview
      ? `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:26px 0 22px;"><tr><td align="left" style="padding:0;"><button type="button" style="${buttonStyles}appearance:none;-webkit-appearance:none;cursor:pointer;">${escapeHtml(copy.button.label)}</button></td></tr></table>`
      : `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:26px 0 22px;"><tr><td align="left" style="padding:0;"><a href="${valueFor(copy.button.url, preview, variables)}" style="${buttonStyles}">${escapeHtml(copy.button.label)}</a></td></tr></table>`
    : "";
  const note = copy.note
    ? `<tr><td style="padding:0 32px 30px;"><p style="margin:0;padding:16px;border:1px solid ${colors.border};border-radius:8px;background:${colors.surface};color:${colors.muted};font-family:${bodyFont};font-size:13px;line-height:1.6;">${valueFor(copy.note, preview, variables)}</p></td></tr>`
    : "";
  const previewSubject = preview ? subject : template.subject;
  const origin = process.env.APP_ENV === "live" ? "https://jobforged.com" : "https://test.jobforged.com";
  // Browser-based previews and downloaded HTML share the application's scrollbar. Mail clients may ignore this optional CSS.
  const scrollbarStyles = `<style>
    :root { --track:${theme === "dark" ? "#0b211e" : "#e9f5f4"}; --edge:${theme === "dark" ? "#0b211e" : "#eef7f6"}; --thumb-start:${theme === "dark" ? "#7e9cff" : "#4169e1"}; --thumb-end:${theme === "dark" ? "#43d0c6" : "#20b2aa"}; --hover-start:${theme === "dark" ? "#a8baff" : "#3157ca"}; --hover-end:${theme === "dark" ? "#73e2da" : "#087a76"}; }
    * { scrollbar-color:var(--thumb-end) var(--track); scrollbar-width:thin; }
    *::-webkit-scrollbar { width:10px; height:10px; }
    *::-webkit-scrollbar-track { background:var(--track); }
    *::-webkit-scrollbar-thumb { min-height:34px; border:2px solid var(--edge); border-radius:999px; background:linear-gradient(180deg,var(--thumb-start),var(--thumb-end)); background-clip:padding-box; }
    *::-webkit-scrollbar-thumb:hover { background:linear-gradient(180deg,var(--hover-start),var(--hover-end)); background-clip:padding-box; }
    *::-webkit-scrollbar-button { display:none; width:0; height:0; }
  </style>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(previewSubject)}</title>
  ${scrollbarStyles}
</head>
<body style="margin:0;padding:0;background-color:${colors.canvas};font-family:${bodyFont};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(valueFor(preheader, preview, variables))}</div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${colors.canvas}" style="width:100%;border-collapse:collapse;background-color:${colors.canvas};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${colors.card}" style="width:100%;max-width:600px;border:1px solid ${colors.border};border-radius:14px;border-collapse:separate;background-color:${colors.card};">
        <tr><td style="padding:24px 32px;border-bottom:1px solid ${colors.border};">
          <img src="${origin}/brand/jobforged-logo.png" width="164" height="47" alt="JobForged" style="display:block;width:164px;height:auto;max-width:100%;border:0;">
        </td></tr>
        <tr><td style="padding:32px 32px 10px;">
          <p style="margin:0 0 12px;color:${colors.accent};font-family:${headingFont};font-size:11px;font-weight:bold;letter-spacing:1.1px;line-height:1.4;">${copy.eyebrow}</p>
          <h1 style="margin:0 0 22px;color:${colors.text};font-family:${headingFont};font-size:27px;font-weight:700;line-height:1.25;">${valueFor(copy.title, preview, variables)}</h1>
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

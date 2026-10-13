"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Mail, Moon, Sun } from "lucide-react";
import {
  downloadFileName,
  emailTemplates,
  makeHtmlDownloadUrl,
  renderEmailHtml,
  type EmailTemplateId,
  type EmailTheme,
} from "./email-template-catalog";

const themes: Array<{ id: EmailTheme; label: string; description: string; icon: typeof Sun }> = [
  { id: "light", label: "Claro", description: "Padrão se a preferência do usuário não estiver salva.", icon: Sun },
  { id: "dark", label: "Escuro", description: "Usado quando a preferência salva do usuário for escura.", icon: Moon },
];

function EmailVariantPreview({ templateId, theme }: { templateId: EmailTemplateId; theme: EmailTheme }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const emailHtml = useMemo(() => renderEmailHtml(templateId, theme), [templateId, theme]);
  const previewHtml = useMemo(() => renderEmailHtml(templateId, theme, true), [templateId, theme]);
  const template = emailTemplates.find((item) => item.id === templateId)!;
  const mode = themes.find((item) => item.id === theme)!;
  const Icon = mode.icon;

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(emailHtml);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 2400);
  }

  return (
    <article className={`ds-email-variant ds-email-variant--${theme}`}>
      <header className="ds-email-variant__header">
        <div>
          <span className="ds-email-variant__mode"><Icon size={15} aria-hidden="true" />Tema {mode.label}</span>
          <small>{mode.description}</small>
        </div>
        <div className="ds-email-variant__actions">
          <button type="button" className="jf-action jf-action--secondary" onClick={copyHtml} aria-label={`Copiar HTML do modelo ${template.name}, tema ${mode.label}`}>
            {copyState === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            <span>{copyState === "copied" ? "Copiado" : "Copiar HTML"}</span>
          </button>
          <a className="jf-action jf-action--quiet ds-email-download" href={makeHtmlDownloadUrl(emailHtml)} download={downloadFileName(templateId, theme)} aria-label={`Baixar HTML do modelo ${template.name}, tema ${mode.label}`}>
            <Download size={15} aria-hidden="true" /><span>Baixar</span>
          </a>
        </div>
      </header>
      <div className="ds-email-variant__frame">
        <iframe
          title={`Prévia de ${template.name} no tema ${mode.label}`}
          srcDoc={previewHtml}
          sandbox=""
          loading="lazy"
        />
      </div>
      <p className="ds-email-variant__status" aria-live="polite">
        {copyState === "error" ? "Não foi possível copiar. Baixe o arquivo HTML para continuar." : copyState === "copied" ? "HTML copiado, com as variáveis de envio preservadas." : "Conteúdo de exemplo; as variáveis continuam no HTML exportado."}
      </p>
    </article>
  );
}

export function EmailTemplatesSection() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateId>(emailTemplates[0].id);
  const current = emailTemplates.find((item) => item.id === selectedTemplate)!;

  return (
    <section className="ds-section ds-section--first ds-email-templates" aria-labelledby="ds-emails-title">
      <header className="ds-section-heading ds-email-templates__heading">
        <span>COMUNICAÇÃO · BREVO</span>
        <h2 id="ds-emails-title">E-mails com a identidade JobForged.</h2>
        <p>Modelos transacionais responsivos, preparados em versões clara e escura. Escolha um modelo para comparar as duas versões e copiar ou baixar o HTML.</p>
      </header>

      <aside className="ds-email-templates__notice" aria-label="Regra de tema e situação de envio">
        <span className="ds-email-templates__notice-icon"><Mail size={19} aria-hidden="true" /></span>
        <div>
          <strong>Prévia de design · nenhum e-mail é enviado por esta página</strong>
          <p>Quando o envio for integrado, use a preferência de tema salva da pessoa; se não houver, escolha o tema claro. O domínio <b>jobforged.com</b> aparece autenticado na Brevo e o remetente informado é <b>JobForged &lt;suporte@jobforged.com&gt;</b>.</p>
          <small>O painel da Brevo também sinaliza ausência da etiqueta <code>rua</code> no DMARC. O registro DNS não foi alterado.</small>
        </div>
      </aside>

      <div className="ds-email-templates__layout">
        <nav className="ds-email-library" aria-label="Modelos de e-mail">
          <div className="ds-email-library__heading"><strong>Biblioteca</strong><span>{emailTemplates.length} modelos</span></div>
          {emailTemplates.map((template, index) => (
            <button
              className={`ds-email-library__item ${selectedTemplate === template.id ? "is-active" : ""}`}
              type="button"
              key={template.id}
              aria-pressed={selectedTemplate === template.id}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <span className="ds-email-library__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="ds-email-library__copy"><strong>{template.name}</strong><small>{template.audience}</small></span>
              <span className="ds-email-library__arrow" aria-hidden="true">›</span>
            </button>
          ))}
          <div className="ds-email-library__rule"><strong>Regra de seleção</strong><p>Preferência salva do usuário → tema correspondente. Preferência ausente → claro.</p></div>
        </nav>

        <div className="ds-email-template-detail">
          <div className="ds-email-template-detail__summary">
            <div>
              <span>{current.channel}</span>
              <h3>{current.name}</h3>
              <p>{current.description}</p>
            </div>
            <dl>
              <div><dt>Quando</dt><dd>{current.trigger}</dd></div>
              <div><dt>Assunto</dt><dd>{current.subject}</dd></div>
            </dl>
          </div>
          <div className="ds-email-variants" aria-label={`Duas versões do modelo ${current.name}`}>
            {themes.map(({ id }) => <EmailVariantPreview key={`${current.id}-${id}`} templateId={current.id} theme={id} />)}
          </div>
        </div>
      </div>

      <aside className="ds-email-templates__integration-note">
        <strong>Como os modelos se conectam ao envio</strong>
        <p>Confirmação de conta usa o modelo HTML do Supabase Auth enviado por SMTP Brevo. Boas-vindas e notificações usam o envio transacional da Brevo. Nos envios do aplicativo, a regra é <code>tema salvo === escuro ? escuro : claro</code>. O SMTP padrão do Supabase usa um modelo global de Auth; escolher uma variante por pessoa para esses e-mails exigirá um fluxo de envio personalizado.</p>
      </aside>
    </section>
  );
}

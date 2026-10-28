"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Moon, Sun } from "lucide-react";
import { useThemePreference } from "@/app/components/ui";
import {
  downloadFileName,
  emailTemplates,
  makeHtmlDownloadUrl,
  renderEmailHtml,
  type EmailTemplateId,
  type EmailTheme,
} from "./email-template-catalog";

const themes: Array<{ id: EmailTheme; label: string; icon: typeof Sun }> = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
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
  const { theme } = useThemePreference();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateId>(emailTemplates[0].id);
  const current = emailTemplates.find((item) => item.id === selectedTemplate)!;

  return (
    <section className="ds-section ds-section--first ds-email-templates" aria-labelledby="ds-emails-title">
      <header className="ds-section-heading ds-email-templates__heading">
        <span>MODELOS DE E-MAIL</span>
        <h2 id="ds-emails-title">E-mails com a identidade JobForged.</h2>
          <p>Escolha um modelo para ver a prévia no tema atual e copiar ou baixar seu HTML.</p>
      </header>


      <div className="ds-email-templates__layout">
        <nav className="ds-email-library" aria-label="Modelos de e-mail">
          <div className="ds-email-library__heading"><div><strong>Biblioteca de modelos</strong><small>Selecione um e-mail para ver o conteúdo.</small></div><span>{emailTemplates.length} modelos</span></div>
          <div className="ds-email-library__items">
            {emailTemplates.map((template, index) => (
              <button
                className={`ds-email-library__item ${selectedTemplate === template.id ? "is-active" : ""}`}
                type="button"
                key={template.id}
                aria-pressed={selectedTemplate === template.id}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <span className="ds-email-library__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="ds-email-library__copy"><strong>{template.name}</strong><small>{template.audience}</small><small>{template.trigger}</small></span>
                <span className="ds-email-library__arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="ds-email-template-detail">
          <div className="ds-email-variants" aria-label={`Prévia do modelo ${current.name} no tema ${theme === "dark" ? "escuro" : "claro"}`}>
            <EmailVariantPreview key={`${current.id}-${theme}`} templateId={current.id} theme={theme === "dark" ? "dark" : "light"} />
          </div>
        </div>
      </div>

    </section>
  );
}

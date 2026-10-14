"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Download, Mail, Moon, Sun } from "lucide-react";
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
  const selectedIndex = emailTemplates.findIndex((item) => item.id === selectedTemplate);

  function selectRelativeTemplate(offset: number) {
    const nextIndex = (selectedIndex + offset + emailTemplates.length) % emailTemplates.length;
    setSelectedTemplate(emailTemplates[nextIndex].id);
  }

  return (
    <section className="ds-section ds-section--first ds-email-templates" aria-labelledby="ds-emails-title">
      <header className="ds-section-heading ds-email-templates__heading">
        <span>COMUNICAÇÃO · BREVO</span>
        <h2 id="ds-emails-title">E-mails com a identidade JobForged.</h2>
          <p>Cinco modelos transacionais, cada um com versões clara e escura. Escolha um cartão para entender quando o e-mail é enviado e comparar as duas versões antes de copiar ou baixar o HTML.</p>
      </header>

      <aside className="ds-email-templates__notice" aria-label="Regra de tema e situação de envio">
        <span className="ds-email-templates__notice-icon"><Mail size={19} aria-hidden="true" /></span>
        <div>
          <strong>Prévia de design · nenhum e-mail é enviado por esta página</strong>
          <p>Os e-mails seguem a tipografia aprovada no Design System: Montserrat nos títulos e Open Sans no texto, com alternativas seguras para clientes de e-mail. Os CTAs usam aparência e área de clique de botão, próximas ao componente principal do aplicativo. O tema claro é o padrão; preferências disponíveis nos envios transacionais do app podem usar a escolha salva da pessoa.</p>
          <small>O painel da Brevo também sinaliza ausência da etiqueta <code>rua</code> no DMARC. O registro DNS não foi alterado.</small>
        </div>
      </aside>

      <div className="ds-email-templates__layout">
        <nav className="ds-email-library" aria-label="Modelos de e-mail">
          <div className="ds-email-library__heading"><div><strong>Biblioteca de modelos</strong><small>Selecione um e-mail para ver o conteúdo e as duas versões.</small></div><span>{emailTemplates.length} modelos</span></div>
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
          <div className="ds-email-library__rule"><strong>Regra de tema</strong><p>Usamos a preferência salva no perfil; quando ela não existe, o padrão é claro.</p></div>
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
            <nav className="ds-email-template-detail__navigation" aria-label="Navegação entre modelos">
              <button type="button" className="jf-action jf-action--secondary" onClick={() => selectRelativeTemplate(-1)} aria-label="Ver modelo anterior"><ChevronLeft size={16} aria-hidden="true"/><span>Anterior</span></button>
              <span aria-live="polite">{String(selectedIndex + 1).padStart(2, "0")} / {String(emailTemplates.length).padStart(2, "0")}</span>
              <button type="button" className="jf-action jf-action--secondary" onClick={() => selectRelativeTemplate(1)} aria-label="Ver próximo modelo"><span>Próximo</span><ChevronRight size={16} aria-hidden="true"/></button>
            </nav>
          </div>
          <div className="ds-email-variants" aria-label={`Duas versões do modelo ${current.name}`}>
            {themes.map(({ id }) => <EmailVariantPreview key={`${current.id}-${id}`} templateId={current.id} theme={id} />)}
          </div>
        </div>
      </div>

      <aside className="ds-email-templates__integration-note">
        <strong>Como os modelos se conectam ao envio</strong>
        <p>Recuperação de senha e confirmação de conta usam Supabase Auth com SMTP Brevo e o modelo global de segurança. A recuperação valida o link no servidor, grava a sessão em cookies HttpOnly e nunca expõe uma chave administrativa da Supabase. Boas-vindas e notificações do aplicativo usam a API transacional da Brevo; nesses envios, a preferência salva de tema é aplicada quando disponível e o tema claro é o padrão.</p>
      </aside>
    </section>
  );
}

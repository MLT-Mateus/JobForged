import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { BrandAsset } from "./BrandAsset";

type LegalPageProps = {
  title: string;
  description: string;
  documentHtml: string;
  downloadHref: string;
};

export default function LegalPage({ title, description, documentHtml, downloadHref }: LegalPageProps) {
  const publicationWarning = /<blockquote>\s*<p><strong>ATENÇÃO — NÃO PUBLICAR SEM PREENCHER OS CAMPOS EM VERMELHO E VALIDAR O TEXTO COM A OPERAÇÃO REAL\.<\/strong><\/p>\s*<\/blockquote>/g;
  const visibleDocumentHtml = documentHtml.replace(publicationWarning, "");

  return (
    <main className="legal-page">
      <header className="legal-header">
        <div className="legal-shell legal-header__inner">
          <Link className="legal-brand" href="/" aria-label="JobForged — página inicial">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={159} height={46} />
          </Link>
          <Link className="legal-back" href="/">
            <ArrowLeft size={17} aria-hidden="true" />
            Voltar ao início
          </Link>
        </div>
      </header>

      <section className="legal-content">
        <div className="legal-shell">
          <div className="legal-heading">
            <span className="legal-kicker"><FileText size={16} aria-hidden="true" /> Documento JobForged</span>
            <h1>{title}</h1>
            <p>{description}</p>
            <a className="legal-download" href={downloadHref} download>
              <Download size={17} aria-hidden="true" />
              Baixar documento em Word
            </a>
          </div>

          <article className="legal-document" aria-label={title}>
            <div className="legal-document__meta">
              <span>Minuta em revisão</span>
              <span>Versão 1.0 · 21 de agosto de 2026</span>
            </div>
            <div className="legal-document__body legal-rich-text" dangerouslySetInnerHTML={{ __html: visibleDocumentHtml }} />
          </article>
        </div>
      </section>

      <footer className="legal-footer">
        <div className="legal-shell legal-footer__inner">
          <span>© {new Date().getFullYear()} JobForged</span>
          <nav aria-label="Outros documentos legais">
            <Link href="/termos-servico">Termos</Link>
            <Link href="/politicas-privacidade">Privacidade</Link>
            <Link href="/politicas-exclusao">Exclusão de dados</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

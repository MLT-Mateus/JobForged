import Link from "next/link";
import { ArrowLeft, Compass, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-grid" aria-hidden="true" />
      <header className="not-found-header container">
        <Link className="brand" href="/" aria-label="JobForged — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/jobforged-logo.png" alt="JobForged" width={636} height={184} />
        </Link>
      </header>
      <section className="not-found-content container">
        <div className="not-found-copy">
          <span className="eyebrow">Caminho não encontrado</span>
          <span className="not-found-code">404</span>
          <h1>Essa página não faz parte deste processo.</h1>
          <p>O endereço pode ter mudado ou não existir. Volte para a Landing Page e continue conhecendo a JobForged.</p>
          <div className="not-found-actions">
            <Link className="button button--primary" href="/"><Home /> Voltar ao início</Link>
            <Link className="button button--ghost" href="/#faq"><ArrowLeft /> Acessar o FAQ</Link>
          </div>
        </div>
        <div className="not-found-visual" aria-hidden="true">
          <div className="not-found-window">
            <div className="window-bar">
              <div className="window-dots"><span /><span /><span /></div>
              <span className="window-address">jobforged.com/pagina</span>
              <Compass />
            </div>
            <div className="not-found-window__body">
              <span><Search /></span>
              <strong>Página não encontrada</strong>
              <small>Vamos ajudar você a reencontrar o caminho.</small>
              <i><b /></i>
            </div>
          </div>
          <span className="not-found-float not-found-float--one">Rota segura</span>
          <span className="not-found-float not-found-float--two">Volte ao início</span>
        </div>
      </section>
    </main>
  );
}

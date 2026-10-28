import Link from "next/link";
import { Panel } from "@/app/components/ui";
import { systemPages } from "@/app/components/system/system-pages";
export function ApplicationStatesSection() {
  return <section className="ds-section ds-section--first"><header className="ds-section-heading"><h2>Estados da aplicação</h2><p>Telas compartilhadas de autenticação, acesso e disponibilidade. Abra uma rota para consultar a tela e seu código HTTP.</p></header><div className="system-state-catalog">{Object.entries(systemPages).map(([code, page]) => <Panel key={code}><h3>{code} · {page.label}</h3><p>{page.description}</p><Link className="jf-action jf-action--secondary" href={`/${code}`} target="_blank" rel="noopener noreferrer">Abrir /{code}</Link></Panel>)}</div></section>;
}

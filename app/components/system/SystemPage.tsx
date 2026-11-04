"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Compass, Home, LockKeyhole, Search, ShieldCheck, Wrench, CircleAlert } from "lucide-react";
import { BrandAsset } from "@/app/components/BrandAsset";
import { AppToast, ActionButton, EmptyState, TextField, ThemeSelector, useThemePreference } from "@/app/components/ui";
import { safeReturnPath } from "./safe-return";
import { pageLinks, systemPages, type SystemPageCode } from "./system-pages";
const icons = { 401: LockKeyhole, 403: ShieldCheck, 404: Search, 500: CircleAlert, 503: Wrench };
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const subscribeLocation = (notify: () => void) => { window.addEventListener("popstate", notify); return () => window.removeEventListener("popstate", notify); };
const returnSnapshot = () => safeReturnPath(new URLSearchParams(window.location.search).get("next")) ?? safeReturnPath(window.location.pathname);
export function SystemPage({ code, reset }: { code: SystemPageCode; reset?: () => void }) {
  const copy = systemPages[code];
  const Icon = icons[code];
  const { theme, changeTheme } = useThemePreference();
  const [query, setQuery] = useState("");
  const next = useSyncExternalStore(subscribeLocation, returnSnapshot, () => null);
  const router = useRouter();
  const [support, setSupport] = useState("/#faq");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (code !== 500 && code !== 503) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    fetch("/api/platform/settings", { signal: controller.signal, cache: "no-store" }).then(async response => response.ok ? response.json() as Promise<{support_url?: string; support_email?: string}> : null).then(settings => {
      if (settings?.support_url && /^https:\/\//i.test(settings.support_url)) {
        try { const url = new URL(settings.support_url); if (!url.username && !url.password) setSupport(url.href); } catch { /* Keep local help. */ }
      } else if (typeof settings?.support_email === "string" && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(settings.support_email)) setSupport(`mailto:${settings.support_email}`);
    }).catch(() => {}).finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [code]);
  const login = `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  async function switchAccount() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" });
      if (!response.ok) { setNotice("Não foi possível confirmar o encerramento da sessão. Tente novamente."); return; }
      router.replace(login);
    } catch { setNotice("Sem conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  const results = pageLinks.filter(page => fold(`${page.title} ${page.keywords}`).includes(fold(query.trim())));
  return <main className="not-found-page system-page">
    <div className="not-found-grid" aria-hidden="true" />
    <header className="not-found-header container"><Link className="brand" href="/" aria-label="JobForged — início"><BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={636} height={184} /></Link><ThemeSelector theme={theme} onChange={changeTheme} /></header>
    <section className="not-found-content container"><div className="not-found-copy">
      <span className="eyebrow">{copy.label}</span><span className="not-found-code">{code}</span><h1>{copy.title}</h1><p>{copy.description}</p>
      {code === 404 && <div className="system-page__search"><TextField label="Buscar páginas" placeholder="Busque uma página..." value={query} onChange={event => setQuery(event.target.value)} maxLength={80} icon={Search} /><nav aria-label="Páginas sugeridas" className="system-page__links">{results.map(page => <Link key={page.href} className="jf-action jf-action--secondary" href={page.href}>{page.title}</Link>)}</nav>{!results.length && <EmptyState variant="inline" icon={Search} title="Nenhuma página encontrada" description="Tente outro termo ou volte ao início." />}</div>}
      <div className="not-found-actions">
        {code === 401 && <><Link className="jf-action jf-action--primary" href={login}>Entrar na conta</Link><Link className="jf-action jf-action--secondary" href="/cadastro">Cadastrar empresa</Link></>}
        {code === 403 && <ActionButton disabled={busy} onClick={switchAccount}>{busy ? "Encerrando sessão..." : "Entrar com outra conta"}</ActionButton>}
        {(code === 500 || code === 503) && <><ActionButton onClick={() => reset ? reset() : window.location.reload()}>Tentar novamente</ActionButton><a className="jf-action jf-action--secondary" href={support}>Falar com o suporte</a></>}
        <Link className="jf-action jf-action--secondary" href="/"><Home size={18} aria-hidden="true" />Voltar ao início</Link>
      </div>
      {code === 403 && <p className="system-page__help">Solicite ao responsável da sua empresa a revisão do seu vínculo e das permissões. Esta página não concede acesso automaticamente.</p>}
      {code === 503 && <div className="system-page__help"><p>Previsão de retorno: a confirmar.</p><a className="jf-action jf-action--quiet" href="/api/health" target="_blank" rel="noopener noreferrer">Consultar status atual</a></div>}
      {notice && <AppToast notice={{kind:"danger",title:"Não foi possível trocar de conta",text:notice}} onClose={()=>setNotice("")}/>}
    </div><div className="not-found-visual" aria-hidden="true"><div className="not-found-window"><div className="window-bar"><div className="window-dots"><span /><span /><span /></div><span className="window-address">JobForged</span><Compass /></div><div className="not-found-window__body"><span><Icon /></span><strong>{copy.label}</strong><small>Seu próximo passo começa por aqui.</small></div></div></div></section>
  </main>;
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  Copy,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Sparkles,
  Sun,
  TrendingUp,
  UsersRound,
} from "lucide-react";

type Theme = "light" | "dark";

const navigation = [
  { label: "Fundamentos", href: "#fundamentos" },
  { label: "Cores", href: "#cores" },
  { label: "Tipografia", href: "#tipografia" },
  { label: "Botões", href: "#botoes" },
  { label: "Formulários", href: "#formularios" },
  { label: "Componentes", href: "#componentes" },
  { label: "Aplicação", href: "#aplicacao" },
];

const colorTokens = [
  { name: "Brand teal", variable: "--ds-brand", value: "#20B2AA", className: "ds-swatch--brand" },
  { name: "Brand blue", variable: "--ds-accent", value: "#4169E1", className: "ds-swatch--accent" },
  { name: "Background", variable: "--ds-bg", value: "Tema", className: "ds-swatch--background" },
  { name: "Surface", variable: "--ds-surface", value: "Tema", className: "ds-swatch--surface" },
  { name: "Text primary", variable: "--ds-text", value: "Tema", className: "ds-swatch--text" },
  { name: "Success", variable: "--ds-success", value: "#15946B", className: "ds-swatch--success" },
  { name: "Warning", variable: "--ds-warning", value: "#D58A14", className: "ds-swatch--warning" },
  { name: "Danger", variable: "--ds-danger", value: "#D64A5D", className: "ds-swatch--danger" },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="ds-section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function ExampleCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <article className={`ds-example-card ${className}`}>
      <div className="ds-example-card__header">
        <span>{title}</span>
        <button type="button" className="ds-icon-button ds-icon-button--subtle" aria-label={`Copiar exemplo: ${title}`}>
          <Copy size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="ds-example-card__body">{children}</div>
    </article>
  );
}

function ThemeSelector({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div className="ds-theme-selector" aria-label="Escolha o tema visual">
      <button
        type="button"
        className={theme === "light" ? "is-active" : ""}
        aria-pressed={theme === "light"}
        onClick={() => onChange("light")}
      >
        <Sun size={16} aria-hidden="true" />
        Claro
      </button>
      <button
        type="button"
        className={theme === "dark" ? "is-active" : ""}
        aria-pressed={theme === "dark"}
        onClick={() => onChange("dark")}
      >
        <Moon size={16} aria-hidden="true" />
        Escuro
      </button>
    </div>
  );
}

export default function DesignSystemClient() {
  const [theme, setTheme] = useState<Theme>("light");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("jobforged-theme");
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    const frame = window.requestAnimationFrame(() => setTheme(initialTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem("jobforged-theme", nextTheme);
  }

  return (
    <main className="ds-page" data-theme={theme}>
      <a className="ds-skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="ds-header">
        <div className="ds-header__inner">
          <Link className="ds-brand" href="/" aria-label="Voltar para a página inicial da JobForged">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/jobforged-logo.png" alt="JobForged" width={636} height={184} />
            <span>Design System</span>
          </Link>

          <div className="ds-header__actions">
            <ThemeSelector theme={theme} onChange={changeTheme} />
            <Link className="ds-home-link" href="/">
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao site
            </Link>
            <button
              type="button"
              className="ds-mobile-menu"
              aria-label="Abrir navegação"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="ds-layout">
        <aside className={`ds-sidebar ${menuOpen ? "is-open" : ""}`}>
          <nav aria-label="Seções do design system">
            <span className="ds-sidebar__label">Navegação</span>
            {navigation.map((item, index) => (
              <a
                key={item.href}
                className={index === 0 ? "is-active" : ""}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ds-sidebar__note">
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <strong>Versão 1.0</strong>
              <span>Base para produto e marketing</span>
            </div>
          </div>
        </aside>

        <div className="ds-content" id="conteudo">
          <section className="ds-hero" id="fundamentos">
            <div className="ds-hero__copy">
              <span className="ds-kicker">Identidade visual · v1.0</span>
              <h1>Interfaces claras para decisões mais inteligentes.</h1>
              <p>
                O sistema visual da JobForged une precisão, proximidade e tecnologia. Esta base mantém o produto
                consistente em qualquer tela — nos temas claro e escuro.
              </p>
              <div className="ds-hero__tags" aria-label="Princípios da marca">
                <span>Humano</span>
                <span>Confiável</span>
                <span>Objetivo</span>
                <span>Adaptável</span>
              </div>
            </div>
            <div className="ds-hero__visual" aria-hidden="true">
              <div className="ds-orbit ds-orbit--one" />
              <div className="ds-orbit ds-orbit--two" />
              <div className="ds-monogram">JF</div>
              <span className="ds-visual-label ds-visual-label--top">Dados organizados</span>
              <span className="ds-visual-label ds-visual-label--bottom">Pessoas em foco</span>
            </div>
          </section>

          <section className="ds-section" id="cores">
            <SectionHeading
              eyebrow="01 · Cores"
              title="Cores com função, não apenas decoração."
              description="Os componentes usam tokens semânticos. Assim, o tema muda sem alterar hierarquia, contraste ou significado."
            />
            <div className="ds-color-grid">
              {colorTokens.map((token) => (
                <article className="ds-color-card" key={token.variable}>
                  <div className={`ds-color-card__swatch ${token.className}`} />
                  <div>
                    <strong>{token.name}</strong>
                    <code>{token.variable}</code>
                    <span>{token.value}</span>
                  </div>
                </article>
              ))}
            </div>
            <div className="ds-guideline">
              <Palette size={22} aria-hidden="true" />
              <div>
                <strong>Regra de uso</strong>
                <p>Turquesa identifica ações principais e progresso. Azul destaca informação, navegação e tecnologia.</p>
              </div>
            </div>
          </section>

          <section className="ds-section" id="tipografia">
            <SectionHeading
              eyebrow="02 · Tipografia"
              title="Uma voz direta, moderna e legível."
              description="Montserrat é usada em toda a experiência, com pesos bem definidos para criar hierarquia sem ruído."
            />
            <div className="ds-type-showcase">
              <div className="ds-type-specimen">
                <span>Aa</span>
                <div>
                  <strong>Montserrat Variable</strong>
                  <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                  <p>abcdefghijklmnopqrstuvwxyz · 0123456789</p>
                </div>
              </div>
              <div className="ds-type-scale">
                <div><span>Display · 52/58</span><strong>Talentos que movem negócios.</strong></div>
                <div><span>Heading 1 · 38/46</span><strong>Visão completa do processo.</strong></div>
                <div><span>Heading 2 · 28/36</span><strong>Candidatos em destaque</strong></div>
                <div><span>Body · 15/24</span><p>Informação organizada para o RH decidir com mais segurança e agilidade.</p></div>
                <div><span>Label · 12/16</span><small>ETAPA ATUAL · ENTREVISTA</small></div>
              </div>
            </div>
          </section>

          <section className="ds-section" id="botoes">
            <SectionHeading
              eyebrow="03 · Ações"
              title="Botões compactos, claros e consistentes."
              description="Cantos discretos e cores leves mantêm as ações acessíveis sem competir com o conteúdo."
            />
            <div className="ds-examples-grid">
              <ExampleCard title="Principais">
                <div className="ds-button-row">
                  <button type="button" className="ds-button ds-button--primary"><Plus size={16} />Nova vaga</button>
                  <button type="button" className="ds-button ds-button--accent">Ver candidatos</button>
                  <button type="button" className="ds-button ds-button--primary" disabled>Carregando</button>
                </div>
              </ExampleCard>
              <ExampleCard title="Transparentes">
                <div className="ds-button-row">
                  <button type="button" className="ds-button ds-button--outline">Editar processo</button>
                  <button type="button" className="ds-button ds-button--ghost">Cancelar</button>
                  <button type="button" className="ds-icon-button" aria-label="Mais opções"><MoreHorizontal size={18} /></button>
                </div>
              </ExampleCard>
            </div>
          </section>

          <section className="ds-section" id="formularios">
            <SectionHeading
              eyebrow="04 · Formulários"
              title="Campos que orientam durante todo o preenchimento."
              description="Rótulos permanecem visíveis, mensagens são objetivas e o foco tem contraste em ambos os temas."
            />
            <div className="ds-examples-grid">
              <ExampleCard title="Campos de texto" className="ds-example-card--form">
                <div className="ds-field-grid">
                  <label className="ds-field">
                    <span>Nome da vaga</span>
                    <div className="ds-input-wrap"><BriefcaseBusiness size={17} /><input type="text" defaultValue="Analista de Customer Success" /></div>
                    <small>Use um título reconhecido pelo mercado.</small>
                  </label>
                  <label className="ds-field">
                    <span>E-mail do responsável</span>
                    <div className="ds-input-wrap"><Mail size={17} /><input type="email" placeholder="nome@empresa.com" /></div>
                  </label>
                  <label className="ds-field">
                    <span>Modelo de trabalho</span>
                    <div className="ds-input-wrap"><select defaultValue="hybrid"><option value="hybrid">Híbrido</option><option value="remote">Remoto</option><option value="office">Presencial</option></select><ChevronDown size={17} /></div>
                  </label>
                  <label className="ds-field ds-field--error">
                    <span>Senha de acesso</span>
                    <div className="ds-input-wrap"><LockKeyhole size={17} /><input type="password" defaultValue="12345" /></div>
                    <small>A senha precisa ter pelo menos 8 caracteres.</small>
                  </label>
                </div>
              </ExampleCard>
              <ExampleCard title="Busca e seleção">
                <div className="ds-search"><Search size={18} /><input type="search" placeholder="Buscar candidatos..." /><kbd>⌘ K</kbd></div>
                <div className="ds-check-list">
                  <label><input type="checkbox" defaultChecked /><span><Check size={14} /></span>Experiência com SaaS</label>
                  <label><input type="checkbox" /><span><Check size={14} /></span>Inglês avançado</label>
                  <label><input type="checkbox" defaultChecked /><span><Check size={14} /></span>Disponibilidade híbrida</label>
                </div>
              </ExampleCard>
            </div>
          </section>

          <section className="ds-section" id="componentes">
            <SectionHeading
              eyebrow="05 · Componentes"
              title="Peças pequenas que formam experiências completas."
              description="Estados, indicadores e cartões compartilham o mesmo vocabulário visual e comportamental."
            />
            <div className="ds-components-grid">
              <ExampleCard title="Status">
                <div className="ds-badge-list">
                  <span className="ds-badge ds-badge--success"><CircleCheck size={14} />Aprovado</span>
                  <span className="ds-badge ds-badge--warning"><Clock3 size={14} />Em avaliação</span>
                  <span className="ds-badge ds-badge--danger"><CircleX size={14} />Não selecionado</span>
                  <span className="ds-badge ds-badge--info"><CircleAlert size={14} />Novo</span>
                </div>
              </ExampleCard>
              <ExampleCard title="Avatar e pessoa">
                <div className="ds-person-list">
                  <div className="ds-person"><span className="ds-avatar ds-avatar--teal">BS</span><div><strong>Beatriz Souza</strong><small>Product Designer</small></div><span className="ds-dot" /></div>
                  <div className="ds-person"><span className="ds-avatar ds-avatar--blue">AM</span><div><strong>André Martins</strong><small>Customer Success</small></div><button type="button" className="ds-icon-button ds-icon-button--subtle" aria-label="Opções de André Martins"><MoreHorizontal size={17} /></button></div>
                </div>
              </ExampleCard>
              <ExampleCard title="Notificações">
                <div className="ds-alert ds-alert--success"><CircleCheck size={18} /><div><strong>Vaga publicada</strong><span>A oportunidade já está disponível na página de carreiras.</span></div></div>
                <div className="ds-alert ds-alert--warning"><CircleAlert size={18} /><div><strong>Perfil incompleto</strong><span>Adicione os critérios obrigatórios antes de avançar.</span></div></div>
              </ExampleCard>
            </div>
          </section>

          <section className="ds-section" id="aplicacao">
            <SectionHeading
              eyebrow="06 · Aplicação"
              title="Do fundamento à tela real."
              description="Um exemplo de dashboard reúne navegação, dados, estados e ações no mesmo sistema."
            />
            <div className="ds-dashboard">
              <aside className="ds-dashboard__sidebar" aria-label="Exemplo de navegação lateral">
                <div className="ds-dashboard__mark">JF</div>
                <button type="button" className="is-active" aria-label="Visão geral"><Layers3 size={19} /></button>
                <button type="button" aria-label="Vagas"><BriefcaseBusiness size={19} /></button>
                <button type="button" aria-label="Candidatos"><UsersRound size={19} /></button>
                <span />
                <button type="button" aria-label="Notificações"><Bell size={19} /></button>
              </aside>
              <div className="ds-dashboard__main">
                <div className="ds-dashboard__topbar">
                  <div><span>Visão geral</span><strong>Olá, Mateus 👋</strong></div>
                  <button type="button" className="ds-button ds-button--primary"><Plus size={16} />Criar vaga</button>
                </div>
                <div className="ds-stat-grid">
                  <article><span>Vagas ativas</span><strong>12</strong><small><TrendingUp size={14} /> 3 neste mês</small></article>
                  <article><span>Novos candidatos</span><strong>248</strong><small><TrendingUp size={14} /> 18,4%</small></article>
                  <article><span>Em entrevista</span><strong>36</strong><small>Próximos 7 dias</small></article>
                </div>
                <div className="ds-table-card">
                  <div className="ds-table-card__header"><div><strong>Candidatos recentes</strong><span>Acompanhe os últimos movimentos do funil</span></div><button type="button" className="ds-button ds-button--outline">Ver todos</button></div>
                  <div className="ds-table" role="table" aria-label="Candidatos recentes">
                    <div className="ds-table__row ds-table__head" role="row"><span>Nome</span><span>Vaga</span><span>Etapa</span><span>Match</span></div>
                    <div className="ds-table__row" role="row"><span><i className="ds-avatar ds-avatar--teal">BS</i><b>Beatriz Souza</b></span><span>Product Designer</span><span><em className="ds-badge ds-badge--warning">Entrevista</em></span><span><b>94%</b></span></div>
                    <div className="ds-table__row" role="row"><span><i className="ds-avatar ds-avatar--blue">AM</i><b>André Martins</b></span><span>Customer Success</span><span><em className="ds-badge ds-badge--info">Triagem</em></span><span><b>88%</b></span></div>
                    <div className="ds-table__row" role="row"><span><i className="ds-avatar ds-avatar--green">LR</i><b>Larissa Rocha</b></span><span>People Analyst</span><span><em className="ds-badge ds-badge--success">Aprovada</em></span><span><b>91%</b></span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="ds-footer">
            <div><strong>JobForged Design System</strong><span>Uma base viva para evoluir junto com o produto.</span></div>
            <Link href="/">Voltar para jobforged.com <ArrowLeft size={15} /></Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

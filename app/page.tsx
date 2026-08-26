"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleCheck,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Paintbrush,
  PanelTop,
  Palette,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  SquareKanban,
  Sparkles,
  Star,
  Sun,
  Type,
  Upload,
  UsersRound,
  X,
} from "lucide-react";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5561991630130&text=Ol%C3%A1%2C+quero+conhecer+a+JobForged.&type=phone_number&app_absent=0";

const navItems = [
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

const capabilityTags = [
  { icon: Paintbrush, label: "ATS white label" },
  { icon: MessageCircle, label: "Entrevistas no WhatsApp" },
  { icon: Sparkles, label: "Triagens por IA" },
  { icon: BrainCircuit, label: "Automações estratégicas" },
  { icon: BarChart3, label: "Painéis de análises" },
  { icon: SquareKanban, label: "Metodologias ágeis" },
  { icon: BriefcaseBusiness, label: "Contratos assertivos" },
  { icon: ShieldCheck, label: "Decisões mais seguras" },
];

const faqs = [
  {
    question: "O que significa um ATS white label?",
    answer:
      "É uma plataforma de recrutamento e seleção que funciona com a identidade da sua empresa. A JobForged permite personalizar marca, cores, conteúdo, página de carreiras e domínio para criar uma experiência própria para candidatos e gestores.",
  },
  {
    question: "A JobForged substitui planilhas e controles separados?",
    answer:
      "Sim. A JobForged concentra vagas, candidatos, currículos, etapas, comunicações e indicadores em um fluxo simples, reduzindo retrabalho e informações dispersas.",
  },
  {
    question: "Como a triagem por IA ajuda a contratar melhor?",
    answer:
      "A IA compara as informações dos currículos com os critérios definidos para a vaga e ajuda a priorizar os perfis mais aderentes. A decisão continua com o RH, apoiada por dados mais organizados.",
  },
  {
    question: "É possível entrevistar candidatos pelo WhatsApp?",
    answer:
      "Sim. A JobForged envia perguntas de triagem, confirmações e comunicações pelo WhatsApp e registra as respostas no processo seletivo para o RH acompanhar tudo em um só lugar.",
  },
  {
    question: "As etapas do processo seletivo podem ser personalizadas?",
    answer:
      "Sim. Cada empresa pode estruturar o pipeline conforme sua realidade, com etapas e critérios adaptados aos diferentes tipos de vaga.",
  },
  {
    question: "A plataforma pode funcionar no domínio da minha empresa?",
    answer:
      "Sim. A JobForged foi pensada para operar como uma solução da sua própria marca, incluindo domínio personalizado e página de carreiras integrada à experiência do candidato.",
  },
];

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.68, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  text,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  text: string;
  align?: "left" | "center";
}) {
  return (
    <Reveal className={`section-intro section-intro--${align}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </Reveal>
  );
}

function BrandPair({ blue, teal, light = false }: { blue: string; teal: string; light?: boolean }) {
  return (
    <span className={`highlight-pair${light ? " highlight-pair--light" : ""}`}>
      <span className="highlight-blue">{blue}</span>{" "}
      <span className="highlight-teal">{teal}</span>
    </span>
  );
}

function ProductMockup() {
  const reduceMotion = useReducedMotion();
  const columns = [
    {
      title: "Novos",
      count: 24,
      color: "blue",
      candidates: ["Beatriz Souza", "Gabriel Lima", "Camila Duarte"],
    },
    {
      title: "Triagem",
      count: 12,
      color: "teal",
      candidates: ["André Martins", "Juliana Costa", "Pedro Azevedo"],
    },
    {
      title: "Entrevista",
      count: 6,
      color: "green",
      candidates: ["Larissa Rocha", "Rafael Nunes"],
    },
  ];

  return (
    <motion.div
      className="product-scene"
      initial={{ opacity: 0, scale: 0.96, y: 32 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="scene-glow" />
      <div className="product-window">
        <div className="window-bar">
          <div className="window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="window-address">carreiras.suaempresa.com.br</span>
          <ShieldCheck size={16} aria-hidden="true" />
        </div>
        <div className="app-shell">
          <aside className="app-sidebar" aria-label="Representação do menu da plataforma">
            {/* The icon is served directly because this Worker does not use Next's image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="app-sidebar__mark" src="/favicon.svg" alt="" width={46} height={46} />
            <span className="side-item side-item--active"><PanelTop size={17} /></span>
            <span className="side-item"><BriefcaseBusiness size={17} /></span>
            <span className="side-item"><UsersRound size={17} /></span>
            <span className="side-item"><BarChart3 size={17} /></span>
          </aside>
          <div className="app-content">
            <div className="app-heading">
              <div>
                <span>Processo seletivo</span>
                <strong>Analista de Customer Success</strong>
              </div>
              <button type="button" tabIndex={-1}>+ Candidato</button>
            </div>
            <div className="pipeline">
              {columns.map((column, index) => (
                <div className="pipeline-column" key={column.title}>
                  <div className="pipeline-title">
                    <span className={`status-dot status-dot--${column.color}`} />
                    <strong>{column.title}</strong>
                    <em>{column.count}</em>
                  </div>
                  {column.candidates.map((candidate, candidateIndex) => (
                    <motion.div
                      className="candidate-card"
                      key={candidate}
                      animate={reduceMotion ? undefined : { y: [0, -3, 0, 2, 0] }}
                      transition={{
                        duration: 7.5 + candidateIndex * 0.65,
                        repeat: Infinity,
                        delay: index * 0.45 + candidateIndex * 0.35,
                        ease: "easeInOut",
                      }}
                    >
                      <span className={`candidate-avatar avatar-${index}-${candidateIndex}`} />
                      <span>
                        <strong>{candidate}</strong>
                        <small>{index === 0 ? "Currículo recebido" : index === 1 ? "92% de aderência" : "WhatsApp enviado"}</small>
                      </span>
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="floating-card floating-card--whatsapp"
        animate={reduceMotion ? undefined : { x: [0, 14, -7, 18, 0], y: [0, -19, 7, -11, 0] }}
        transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="floating-icon"><MessageCircle size={20} /></span>
        <span><small>Entrevista enviada</small><strong>WhatsApp conectado</strong></span>
      </motion.div>

      <motion.div
        className="floating-card floating-card--match"
        animate={reduceMotion ? undefined : { x: [0, -16, 8, -12, 0], y: [0, 15, -9, 10, 0] }}
        transition={{ duration: 8.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <span className="match-value">92%</span>
        <span><small>Aderência à vaga</small><strong>Perfil recomendado</strong></span>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [annualBilling, setAnnualBilling] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      setTheme(currentTheme);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const applyTheme = (nextTheme: "light" | "dark") => {
    if (nextTheme === theme) return;
    const root = document.documentElement;
    const commitTheme = () => {
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
      localStorage.setItem("jobforged-theme", nextTheme);
      setTheme(nextTheme);
    };
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    root.classList.add("theme-switching");
    if (transitionDocument.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const transition = transitionDocument.startViewTransition(commitTheme);
      void transition.finished.finally(() => root.classList.remove("theme-switching"));
      return;
    }

    commitTheme();
    window.setTimeout(() => root.classList.remove("theme-switching"), 820);
  };

  return (
    <main>
      <header className="site-header">
        <div className="container nav-wrap">
          <a className="brand" href="#inicio" aria-label="JobForged — início">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/jobforged-logo.png" alt="JobForged" width={636} height={184} fetchPriority="high" />
          </a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="theme-switcher" role="group" aria-label="Tema da página">
            <button type="button" className={theme === "light" ? "is-active" : ""} aria-pressed={theme === "light"} onClick={() => applyTheme("light")}>
              <Sun aria-hidden="true" /><span>Claro</span>
            </button>
            <button type="button" className={theme === "dark" ? "is-active" : ""} aria-pressed={theme === "dark"} onClick={() => applyTheme("dark")}>
              <Moon aria-hidden="true" /><span>Escuro</span>
            </button>
          </div>
          <button
            className="menu-button"
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <motion.nav
            className="mobile-nav"
            aria-label="Navegação para dispositivos móveis"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {navItems.map((item) => <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>)}
          </motion.nav>
        )}
      </header>

      <a
        className="floating-whatsapp-cta"
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Solicitar demonstração pelo WhatsApp"
      >
        <span><MessageCircle aria-hidden="true" /></span>
        <strong>Solicitar demonstração</strong>
      </a>

      <section className="hero" id="inicio">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orb hero-orb--one" aria-hidden="true" />
        <div className="hero-orb hero-orb--two" aria-hidden="true" />
        <div className="container hero-layout">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1>Recrute com a <BrandPair blue="sua" teal="marca." /><br />Contrate com inteligência.</h1>
            <p className="hero-lead">
              Centralize vagas, currículos, triagem automática, Kanban e histórico de candidatos em uma plataforma feita para PMEs que querem mais controle e menos retrabalho.
            </p>
            <div className="hero-actions">
              <a className="button button--primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Quero uma demonstração <ArrowRight size={19} /></a>
              <a className="button button--ghost" href="#como-funciona"><span className="play-dot">▶</span> Ver como funciona</a>
            </div>
          </motion.div>
          <ProductMockup />
        </div>
        <div className="container capability-carousel" role="region" aria-label="Capacidades da JobForged">
          <div className="capability-track">
            {[false, true].map((duplicate) => (
              <div className="capability-set" aria-hidden={duplicate || undefined} key={String(duplicate)}>
                {capabilityTags.map(({ icon: Icon, label }) => (
                  <span className="capability-tag" key={label}>
                    <Icon aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="problem-section" id="produto">
        <div className="container problem-layout">
          <Reveal className="problem-copy">
            <span className="eyebrow">Menos ruído. Mais qualidade.</span>
            <h2>Menos ferramentas. <BrandPair blue="Mais" teal="controle." /> Uma contratação melhor.</h2>
            <p>Vagas, currículos, conversas e decisões ficam no mesmo fluxo. Seu RH trabalha com clareza e reduz o retrabalho.</p>
          </Reveal>
          <Reveal className="solution-card" delay={0.12}>
            <div className="solution-card__top">
              <span className="solution-icon"><Sparkles /></span>
              <span>Um processo conectado</span>
            </div>
            <h3>Do currículo à decisão, tudo avança no mesmo lugar.</h3>
            <p>O agente organiza os perfis. O WhatsApp conduz a conversa. Seu RH mantém a decisão.</p>
            <div className="solution-flow" aria-label="Fluxo de recrutamento JobForged">
              <span><BriefcaseBusiness /><small>Receba</small><strong>Vagas e currículos</strong></span>
              <span><Bot /><small>Priorize</small><strong>Triagem por IA</strong></span>
              <span><MessageCircle /><small>Avance</small><strong>Pelo WhatsApp</strong></span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="whatsapp-section">
        <div className="container whatsapp-layout">
          <Reveal className="phone-area">
            <div className="phone-glow" />
            <div className="phone">
              <div className="phone-notch" />
              <div className="chat-head">
                <span className="chat-avatar"><MessageCircle /></span>
                <span><strong>Sua Empresa Jobs</strong><small>online</small></span>
              </div>
              <div className="chat-body">
                <div className="chat-date">Hoje</div>
                <div className="chat-bubble chat-bubble--bot">Olá, Marina! 👋 Para concluir sua candidatura, pode enviar seu currículo em PDF?</div>
                <div className="chat-file"><span><FileText /></span><div><strong>Curriculo_Marina.pdf</strong><small>Documento enviado</small></div><CircleCheck /></div>
                <div className="chat-bubble chat-bubble--bot">Currículo recebido! Você foi aprovada para a próxima fase. Podemos agendar sua entrevista para 28/08 às 14h?</div>
                <div className="chat-bubble chat-bubble--user">Sim, confirmado! 😊</div>
                <div className="chat-options"><span>Ver agendamento</span><span>Adicionar à agenda</span></div>
              </div>
            </div>
            <motion.div
              className="phone-status"
              animate={reduceMotion ? undefined : { x: [0, 9, -5, 7, 0], y: [0, -12, 5, -8, 0] }}
              transition={{ repeat: Infinity, duration: 7.4, ease: "easeInOut" }}
            >
              <CircleCheck /><span><strong>Resposta registrada</strong><small>Perfil atualizado no ATS</small></span>
            </motion.div>
            <motion.div
              className="phone-quality"
              animate={reduceMotion ? undefined : { x: [0, -10, 6, -7, 0], y: [0, 9, -6, 11, 0] }}
              transition={{ repeat: Infinity, duration: 8.2, ease: "easeInOut", delay: 0.6 }}
            >
              <Bot /><span><strong>Agente de triagem</strong><small>Currículo analisado no WhatsApp</small></span>
            </motion.div>
          </Reveal>
          <Reveal className="whatsapp-copy" delay={0.1}>
            <span className="eyebrow eyebrow--light">Agente de triagem no WhatsApp</span>
            <h2>O candidato envia. <BrandPair blue="A IA" teal="organiza." light /> Seu RH decide.</h2>
            <p>Nosso agente recebe o currículo, coleta respostas e organiza a aderência do perfil. Tudo chega ao ATS pronto para o RH avaliar.</p>
            <div className="whatsapp-benefits">
              <span><FileText /> Currículo recebido no WhatsApp</span>
              <span><Bot /> Aderência organizada pela IA</span>
              <span><SquareKanban /> Próxima etapa registrada no ATS</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="steps-section" id="como-funciona">
        <div className="container">
          <SectionIntro
            eyebrow="Da configuração à contratação"
            title={<>Sua operação pronta em <BrandPair blue="3" teal="passos" /> claros.</>}
            text="Nós configuramos a base. Seu RH publica, acompanha e decide."
            align="center"
          />
          <div className="steps-grid">
            <Reveal className="step-card">
              <span className="step-number">01</span><Paintbrush />
              <span className="step-outcome">Marca própria</span>
              <h3>Personalize sua operação</h3>
              <p>Aplicamos sua marca, domínio e etapas ao processo.</p>
            </Reveal>
            <Reveal className="step-card" delay={0.1}>
              <span className="step-number">02</span><Bot />
              <span className="step-outcome">Triagem assistida</span>
              <h3>Ative o agente de IA</h3>
              <p>A IA organiza currículos e o WhatsApp coleta respostas.</p>
            </Reveal>
            <Reveal className="step-card" delay={0.2}>
              <span className="step-number">03</span><BarChart3 />
              <span className="step-outcome">Decisão com contexto</span>
              <h3>Acompanhe e decida</h3>
              <p>Kanban, histórico e indicadores mantêm o RH no controle.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="white-label-section" id="white-label">
        <div className="container white-label-layout">
          <Reveal className="white-label-copy">
            <span className="eyebrow">White label para sua empresa</span>
            <h2><BrandPair blue="Sua marca" teal="na frente." /> A tecnologia nos bastidores.</h2>
            <p>Personalize a experiência e apresente cada vaga como parte da sua empresa.</p>
            <div className="check-grid">
              <span><Check /> Logo, cores e página de carreiras</span>
              <span><Check /> Domínio e comunicação próprios</span>
              <span><Check /> Jornada adaptada ao seu processo</span>
            </div>
            <a className="button button--blue" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Ver com minha marca <ArrowRight /></a>
          </Reveal>
          <Reveal className="personalization-scene" delay={0.12}>
            <div className="product-window personalization-window">
              <div className="window-bar">
                <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
                <span className="window-address">app.suaempresa.com.br/personalizacao</span>
                <ShieldCheck size={16} aria-hidden="true" />
              </div>
              <div className="personalization-shell">
                <aside className="app-sidebar personalization-sidebar" aria-label="Representação do menu da plataforma">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="app-sidebar__mark" src="/favicon.svg" alt="" width={46} height={46} />
                  <span className="side-item"><PanelTop size={17} /></span>
                  <span className="side-item"><BriefcaseBusiness size={17} /></span>
                  <span className="side-item"><UsersRound size={17} /></span>
                  <span className="side-item side-item--active"><Paintbrush size={17} /></span>
                  <span className="side-item"><BarChart3 size={17} /></span>
                </aside>
                <div className="personalization-main">
                  <div className="personalization-heading">
                    <span><small>Personalização</small><strong>Identidade do portal</strong></span>
                    <button type="button" tabIndex={-1}>Publicar alterações</button>
                  </div>
                  <div className="personalization-tabs" aria-label="Seções de personalização">
                    <span className="is-active"><Paintbrush /> Marca</span>
                    <span><Palette /> Cores</span>
                    <span><Type /> Tipografia</span>
                    <span><LayoutTemplate /> Estrutura</span>
                    <span><ImageIcon /> Banners</span>
                  </div>
                  <div className="personalization-workspace">
                    <div className="personalization-controls">
                      <div className="personalization-progress">
                        <span><strong>Identidade configurada</strong><small>4 de 7 itens concluídos</small></span><em>57%</em>
                        <i><b /></i>
                      </div>
                      <div className="personalization-control-card">
                        <small>IDENTIDADE DA EMPRESA</small>
                        <div className="personalization-field"><span>S</span><strong>Sua Empresa</strong></div>
                        <div className="personalization-upload"><Upload /><span><strong>Logotipo principal</strong><small>SVG atualizado</small></span><CircleCheck /></div>
                      </div>
                      <div className="personalization-control-card">
                        <small>CORES DA MARCA</small>
                        <div className="personalization-colors"><span /><span /><span /><b>#20B2AA</b></div>
                      </div>
                      <div className="personalization-layouts">
                        <span className="is-selected"><LayoutTemplate /><strong>Corporativo</strong></span>
                        <span><PanelTop /><strong>Minimal</strong></span>
                      </div>
                    </div>
                    <div className="personalization-preview">
                      <div className="personalization-preview-head">
                        <span><strong>Pré-visualização do portal</strong><small>Exatamente como o candidato vê</small></span>
                        <div><Monitor /><Smartphone /></div>
                      </div>
                      <div className="careers-preview">
                        <div className="careers-preview__nav"><span><b>S</b> Sua Empresa</span><small>Vagas&nbsp;&nbsp;&nbsp; Cultura&nbsp;&nbsp;&nbsp; Contato</small></div>
                        <div className="careers-preview__hero">
                          <span>FAÇA PARTE DO NOSSO TIME</span>
                          <strong>O próximo capítulo da sua carreira começa aqui.</strong>
                          <small>Conheça oportunidades feitas para pessoas que querem construir, aprender e crescer.</small>
                          <button type="button" tabIndex={-1}>Explorar vagas <ArrowRight /></button>
                        </div>
                        <div className="careers-preview__jobs">
                          <div className="careers-search"><SearchCheck /> Busque por área ou oportunidade</div>
                          <span><i /><b>Analista de Customer Success</b><small>Híbrido · Brasília, DF</small><ArrowRight /></span>
                          <span><i /><b>Desenvolvedor Front-end</b><small>Remoto · Pleno</small><ArrowRight /></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="difference-section" id="diferenciais">
        <div className="container">
          <SectionIntro
            eyebrow="Três diferenciais. Uma operação conectada."
            title={<>Sua marca, seu WhatsApp e um <BrandPair blue="agente" teal="de triagem." /></>}
            text="A JobForged une presença própria, comunicação no canal do candidato e IA para organizar quem merece atenção primeiro."
            align="center"
          />
          <div className="difference-grid">
            <Reveal className="difference-card difference-card--brand">
              <span className="difference-number">01</span>
              <Paintbrush />
              <h3>White label de ponta a ponta.</h3>
              <p>Logo, cores, domínio e página de carreiras com a identidade da sua empresa.</p>
              <div className="difference-mini-brand">
                <span><i>S</i><strong>SuaEmpresa</strong></span>
                <small>carreiras.suaempresa.com.br</small>
              </div>
            </Reveal>
            <Reveal className="difference-card difference-card--whatsapp" delay={0.08}>
              <span className="difference-number">02</span>
              <MessageCircle />
              <h3>WhatsApp integrado ao processo.</h3>
              <p>Perguntas, documentos e confirmações no canal que o candidato já utiliza.</p>
              <div className="difference-mini-chat">
                <span>Olá, Júlia! Pode enviar seu currículo?</span>
                <span>Enviado! <i>✓✓</i></span>
              </div>
            </Reveal>
            <Reveal className="difference-card difference-card--ai" delay={0.16}>
              <span className="difference-number">03</span>
              <Bot />
              <h3>Agente de triagem por IA.</h3>
              <p>Lê currículos, organiza a aderência e entrega contexto para o RH decidir.</p>
              <div className="difference-mini-score">
                <span><Sparkles /> Currículo analisado</span>
                <strong>92%</strong>
                <i><b /></i>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="pricing-section" id="planos">
        <div className="container">
          <SectionIntro
            eyebrow="Planos para cada momento"
            title={<>Escolha o <BrandPair blue="plano" teal="ideal" /> para sua operação</>}
            text="Comece gratuitamente e evolua conforme sua necessidade de vagas, usuários e automações."
            align="center"
          />
          <div className="billing-toggle" role="group" aria-label="Período de cobrança">
            <button type="button" className={!annualBilling ? "is-active" : ""} aria-pressed={!annualBilling} onClick={() => setAnnualBilling(false)}>Mensal</button>
            <button type="button" className={annualBilling ? "is-active" : ""} aria-pressed={annualBilling} onClick={() => setAnnualBilling(true)}>Anual <span>2 meses grátis</span></button>
          </div>
          <div className="pricing-grid">
            <Reveal className="price-card">
              <div className="plan-head"><span>Gratuito</span><small>Para conhecer a plataforma</small></div>
              <div className="plan-price"><strong>R$ 0</strong><span>para começar</span></div>
              <p>Uma base organizada para operações menores iniciarem com clareza.</p>
              <a className="button button--ghost" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Começar grátis <ArrowRight /></a>
              <ul>
                <li><Check /> Até 2 vagas simultâneas</li>
                <li><Check /> 1 usuário recrutador</li>
                <li><Check /> Página básica de carreiras</li>
                <li><Check /> Kanban e histórico de candidatos</li>
                <li><Check /> Até 500 candidatos armazenados</li>
                <li><Check /> Portal geral JobForged</li>
              </ul>
            </Reveal>
            <Reveal className="price-card price-card--featured" delay={0.08}>
              <span className="plan-badge"><Star /> Melhor custo-benefício</span>
              <div className="plan-head"><span>Essencial</span><small>Para ter mais controle</small></div>
              <div className="plan-price"><strong>R$ {annualBilling ? "80,83" : "97"}</strong><span>/mês{annualBilling ? ", no anual" : ""}</span></div>
              <p>Mais capacidade para empresas que já recrutam com frequência.</p>
              <a className="button button--primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Falar com especialista <ArrowRight /></a>
              <ul>
                <li><Check /> Até 5 vagas simultâneas</li>
                <li><Check /> 3 usuários</li>
                <li><Check /> Tudo do plano Gratuito</li>
                <li><Check /> Estrutura para sua operação crescer</li>
              </ul>
            </Reveal>
            <Reveal className="price-card" delay={0.16}>
              <div className="plan-head"><span>Profissional</span><small>Para operações estruturadas</small></div>
              <div className="plan-price"><strong>R$ {annualBilling ? "205,83" : "247"}</strong><span>/mês{annualBilling ? ", no anual" : ""}</span></div>
              <p>Mais vagas e usuários para equipes com maior volume de contratações.</p>
              <a className="button button--ghost" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Falar com especialista <ArrowRight /></a>
              <ul>
                <li><Check /> Até 15 vagas simultâneas</li>
                <li><Check /> 10 usuários</li>
                <li><Check /> Tudo do plano Essencial</li>
                <li><Check /> Operação pronta para escala</li>
              </ul>
            </Reveal>
          </div>
          <p className="pricing-note"><ShieldCheck /> Fale com um especialista para escolher o plano mais adequado à sua operação.</p>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="container faq-layout">
          <Reveal className="faq-copy">
            <span className="eyebrow">Perguntas frequentes</span>
            <h2>O que você precisa saber antes de transformar o <BrandPair blue="seu" teal="recrutamento." /></h2>
            <p>Respostas diretas sobre personalização, triagem por IA, WhatsApp e operação da plataforma.</p>
          </Reveal>
          <div className="faq-list">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <Reveal className={`faq-item ${isOpen ? "faq-item--open" : ""}`} delay={index * 0.04} key={faq.question}>
                  <button type="button" aria-expanded={isOpen} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(isOpen ? null : index)}>
                    <span>{faq.question}</span><ChevronDown />
                  </button>
                  <div id={`faq-answer-${index}`} className={`faq-answer ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
                    <div><p>{faq.answer}</p></div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cta-section" id="contato">
        <div className="container">
          <Reveal className="cta-box">
            <div className="cta-orb" aria-hidden="true" />
            <div className="cta-copy">
              <span className="eyebrow eyebrow--light">Pronto para contratar de um jeito melhor?</span>
              <h2>Veja como a JobForged <BrandPair blue="simplifica" teal="processos" light /> sem simplificar a decisão.</h2>
              <p>Conheça o ATS white label que combina automações, critérios de seleção e suporte especializado para contratar com mais qualidade.</p>
            </div>
            <div className="cta-actions">
              <a className="button button--outline-light" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Solicitar demonstração <ArrowRight /></a>
              <span><ShieldCheck /> Demonstração personalizada e sem compromisso.</span>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/jobforged-logo.png" alt="JobForged" width={636} height={184} />
            <p>ATS white label com WhatsApp integrado e agente de triagem por IA.</p>
            <address>JobForged · CNPJ 65.703.328/0001-10</address>
          </div>
          <div className="footer-column"><strong>Explore</strong><a href="#diferenciais">Diferenciais</a><a href="#planos">Planos</a><Link href="/design-system">Design System</Link></div>
          <div className="footer-column"><strong>Contato</strong><a href="mailto:jobforged@gmail.com">jobforged@gmail.com</a><a href="tel:+5561991630130">+55 61 9 9163-0130</a></div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} JobForged. Todos os direitos reservados.</span>
          <nav className="footer-legal" aria-label="Documentos legais">
            <Link href="/termos-servico">Termos de serviço</Link>
            <Link href="/politicas-privacidade">Privacidade</Link>
            <Link href="/politicas-exclusao">Exclusão de dados</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

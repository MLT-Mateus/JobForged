"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Database,
  Gauge,
  Globe2,
  Handshake,
  Menu,
  MessageCircle,
  Paintbrush,
  PanelTop,
  SearchCheck,
  ShieldCheck,
  SquareKanban,
  Sparkles,
  UsersRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5561991630130&text=Ol%C3%A1%2C+quero+conhecer+a+JobForged.&type=phone_number&app_absent=0";

const navItems = [
  { label: "Produto", href: "#produto" },
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "White label", href: "#white-label" },
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

const features = [
  {
    icon: Paintbrush,
    eyebrow: "Sua identidade",
    title: "White label de verdade",
    text: "Entregue uma experiência própria, com logo, cores, textos, página de carreiras e domínio da sua empresa.",
    className: "feature-card feature-card--wide feature-card--teal",
  },
  {
    icon: MessageCircle,
    eyebrow: "Conversas que avançam",
    title: "Entrevistas pelo WhatsApp",
    text: "Automatize perguntas eliminatórias, confirmações e retornos no canal que o candidato já usa todos os dias.",
    className: "feature-card feature-card--dark",
  },
  {
    icon: SearchCheck,
    eyebrow: "Qualidade desde a triagem",
    title: "Triagem de currículos por IA",
    text: "Compare currículos com os critérios da vaga e priorize os perfis mais aderentes para o RH avaliar com segurança.",
    className: "feature-card feature-card--ai",
  },
  {
    icon: Globe2,
    eyebrow: "Presença própria",
    title: "Seu domínio. Sua plataforma.",
    text: "Publique vagas e conduza candidatos em uma página de carreiras conectada ao domínio da sua empresa.",
    className: "feature-card feature-card--sky",
  },
  {
    icon: Workflow,
    eyebrow: "Processo visível",
    title: "Pipeline em Kanban",
    text: "Visualize cada candidatura, personalize etapas e identifique rapidamente onde cada processo precisa avançar.",
    className: "feature-card feature-card--blue",
  },
  {
    icon: BarChart3,
    eyebrow: "Decisões melhores",
    title: "Indicadores em tempo real",
    text: "Acompanhe vagas, candidaturas, conversões e contratações para corrigir gargalos e elevar a qualidade do processo.",
    className: "feature-card feature-card--wide feature-card--insights",
  },
  {
    icon: Handshake,
    eyebrow: "Apoio especializado",
    title: "Consultoria mensal para o RH",
    text: "Conte com a equipe JobForged para revisar indicadores, ajustar etapas e transformar dados do funil em contratações mais seguras.",
    className: "feature-card feature-card--consulting",
  },
];

const audiences = [
  {
    icon: UsersRound,
    title: "RH interno",
    text: "Padronize a seleção, reduza tarefas operacionais e dê visibilidade aos gestores.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Consultorias de R&S",
    text: "Entregue uma operação com a sua marca e organize múltiplas vagas e clientes.",
  },
  {
    icon: Building2,
    title: "Grupos empresariais",
    text: "Centralize unidades, marcas e processos sem perder governança ou identidade.",
  },
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
  title: string;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const closeMenu = () => setMenuOpen(false);

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
          <a className="button button--small button--blue desktop-cta" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Solicitar demonstração <ArrowRight size={17} />
          </a>
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
            <a className="button button--primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={closeMenu}>Solicitar demonstração</a>
          </motion.nav>
        )}
      </header>

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
            <h1>Recrute com a <em className="highlight-pair"><span className="highlight-blue">sua</span> <span className="highlight-teal">marca.</span></em><br />Contrate com mais inteligência.</h1>
            <p className="hero-lead">
              Centralize vagas e candidatos em um ATS simples, com triagem por IA, entrevistas pelo WhatsApp e critérios que ajudam seu RH a contratar com mais qualidade.
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
            <h2>Contratar bem pode ser mais simples do que administrar ferramentas desconectadas.</h2>
            <p>A JobForged reúne vagas, currículos, mensagens, critérios e decisões em um único fluxo. Seu RH reduz o trabalho manual sem perder controle sobre quem avança.</p>
            <div className="problem-points">
              <span><X size={17} /> Informações espalhadas</span>
              <span><X size={17} /> Triagem totalmente manual</span>
              <span><X size={17} /> Experiência sem identidade</span>
            </div>
          </Reveal>
          <Reveal className="solution-card" delay={0.12}>
            <div className="solution-card__top">
              <span className="solution-icon"><Sparkles /></span>
              <span>Com a JobForged</span>
            </div>
            <h3>Um fluxo simples, automatizado e orientado à qualidade de cada contratação.</h3>
            <div className="solution-list">
              <span><CircleCheck /> Vagas e candidatos centralizados</span>
              <span><CircleCheck /> IA aplicada à triagem de currículos</span>
              <span><CircleCheck /> Entrevistas e retornos pelo WhatsApp</span>
              <span><CircleCheck /> Critérios claros para decidir com segurança</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="features-section" id="diferenciais">
        <div className="container">
          <SectionIntro
            eyebrow="Tecnologia que trabalha pelo seu RH"
            title="Automação onde há repetição. Controle humano onde a decisão importa."
            text="Recursos conectados para simplificar a rotina do RH, identificar candidatos aderentes e sustentar contratações com critérios mais claros."
            align="center"
          />
          <div className="features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal className={feature.className} delay={(index % 3) * 0.08} key={feature.title}>
                  <div className="feature-icon"><Icon /></div>
                  <span className="feature-eyebrow">{feature.eyebrow}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </Reveal>
              );
            })}
          </div>
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
                <div className="chat-bubble chat-bubble--bot">Olá, Marina! 👋 Podemos começar a primeira etapa da vaga de Analista?</div>
                <div className="chat-bubble chat-bubble--user">Sim, podemos!</div>
                <div className="chat-bubble chat-bubble--bot">Perfeito. Você possui experiência com atendimento B2B?</div>
                <div className="chat-options"><span>Sim, possuo</span><span>Ainda não</span></div>
              </div>
            </div>
            <motion.div className="phone-status" animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
              <CircleCheck /><span><strong>Resposta registrada</strong><small>Perfil atualizado no ATS</small></span>
            </motion.div>
          </Reveal>
          <Reveal className="whatsapp-copy" delay={0.1}>
            <span className="eyebrow eyebrow--light">Entrevistas pelo WhatsApp</span>
            <h2>Menos atrito para o candidato. Mais velocidade para o seu time.</h2>
            <p>Envie perguntas objetivas, registre respostas e avance candidatos pelo canal mais presente na rotina deles. Tudo retorna organizado ao ATS para o RH avaliar sem copiar informações manualmente.</p>
            <div className="whatsapp-benefits">
              <span><Clock3 /> Respostas mais ágeis</span>
              <span><Database /> Histórico centralizado</span>
              <span><Gauge /> Menos tarefas repetitivas</span>
              <span><ShieldCheck /> Processo padronizado</span>
            </div>
            <a className="text-link text-link--light" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Conhecer as automações <ArrowRight /></a>
          </Reveal>
        </div>
      </section>

      <section className="steps-section" id="como-funciona">
        <div className="container">
          <SectionIntro
            eyebrow="Simples desde o primeiro dia"
            title="Em apenas 3 passos, sua empresa já melhora o recrutamento e a seleção."
            text="A JobForged conduz a configuração com seu time. Sem projeto longo: organizamos o processo, ativamos as automações e colocamos sua operação para funcionar."
            align="center"
          />
          <div className="steps-grid">
            <Reveal className="step-card">
              <span className="step-number">01</span><Paintbrush />
              <h3>Entendemos e personalizamos</h3>
              <p>Mapeamos o processo essencial e aplicamos marca, cores, conteúdo, domínio e página de carreiras.</p>
            </Reveal>
            <Reveal className="step-card" delay={0.1}>
              <span className="step-number">02</span><Workflow />
              <h3>Ativamos as automações</h3>
              <p>Configuramos etapas, critérios, triagem por IA e entrevistas pelo WhatsApp para reduzir tarefas manuais.</p>
            </Reveal>
            <Reveal className="step-card" delay={0.2}>
              <span className="step-number">03</span><Zap />
              <h3>Seu RH começa melhor</h3>
              <p>O time publica vagas, recebe candidatos priorizados e acompanha cada decisão com clareza e suporte contínuo.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="white-label-section" id="white-label">
        <div className="container white-label-layout">
          <Reveal className="white-label-copy">
            <span className="eyebrow">Tecnologia invisível. Sua marca em primeiro plano.</span>
            <h2>A experiência é da sua empresa. A tecnologia é JobForged.</h2>
            <p>Ofereça uma jornada simples e consistente do primeiro acesso do candidato até a decisão do gestor, sem expor a marca do fornecedor.</p>
            <div className="check-grid">
              <span><Check /> Logo e identidade visual</span>
              <span><Check /> Página de carreiras</span>
              <span><Check /> Domínio personalizado</span>
              <span><Check /> Textos e conteúdos</span>
              <span><Check /> Etapas do processo</span>
              <span><Check /> Perfis e permissões</span>
            </div>
            <a className="button button--blue" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Ver a JobForged com a minha marca <ArrowRight /></a>
          </Reveal>
          <Reveal className="customizer" delay={0.12}>
            <div className="customizer-head"><span><Paintbrush /> Personalização</span><small>Pré-visualização ao vivo</small></div>
            <div className="customizer-body">
              <div className="custom-controls">
                <label>Identidade da empresa</label>
                <div className="upload-box"><span className="custom-brand"><span>J</span> SuaMarca Jobs</span><small>Logo principal</small></div>
                <label>Cor principal</label>
                <div className="color-options"><span className="color-one" /><span className="color-two" /><span className="color-three" /><span className="color-four" /><span>+</span></div>
                <label>Domínio</label>
                <div className="domain-field"><Globe2 /> carreiras.suaempresa.com.br</div>
              </div>
              <div className="custom-preview">
                <div className="preview-nav"><span className="custom-brand custom-brand--small"><span>J</span> SuaMarca Jobs</span><span>Vagas &nbsp; Sobre nós</span></div>
                <div className="preview-hero"><small>FAÇA PARTE DO NOSSO TIME</small><strong>Encontre um trabalho que combina com você.</strong><span>Ver vagas abertas <ArrowRight /></span></div>
                <div className="preview-cards"><i /><i /><i /></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="audience-section">
        <div className="container">
          <SectionIntro
            eyebrow="Feita para operações que querem evoluir"
            title="Uma operação simples para diferentes modelos de recrutamento."
            text="Do RH interno às consultorias com múltiplos clientes, cada equipe organiza seus critérios sem aumentar a complexidade."
            align="center"
          />
          <div className="audience-grid">
            {audiences.map((audience, index) => {
              const Icon = audience.icon;
              return <Reveal className="audience-card" delay={index * 0.08} key={audience.title}><Icon /><h3>{audience.title}</h3><p>{audience.text}</p><span>Explorar solução <ArrowRight /></span></Reveal>;
            })}
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="container faq-layout">
          <Reveal className="faq-copy">
            <span className="eyebrow">Perguntas frequentes</span>
            <h2>O que você precisa saber antes de transformar seu recrutamento.</h2>
            <p>Ainda tem alguma dúvida? Fale com a JobForged e veja como as automações podem apoiar a qualidade das contratações da sua empresa.</p>
            <a className="text-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Conversar com a JobForged <ArrowRight /></a>
          </Reveal>
          <div className="faq-list">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <Reveal className={`faq-item ${isOpen ? "faq-item--open" : ""}`} delay={index * 0.04} key={faq.question}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)}>
                    <span>{faq.question}</span><ChevronDown />
                  </button>
                  {isOpen && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>{faq.answer}</motion.p>}
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
              <h2>Veja como a JobForged simplifica o processo sem simplificar a decisão.</h2>
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
            <p>ATS white label para empresas que querem simplificar o recrutamento e contratar com mais tecnologia, critérios e identidade.</p>
          </div>
          <div className="footer-column"><strong>Produto</strong><a href="#diferenciais">Recursos</a><a href="#white-label">White label</a><a href="#como-funciona">Como funciona</a></div>
          <div className="footer-column"><strong>Soluções</strong><a href="#produto">RH interno</a><a href="#produto">Consultorias</a><a href="#produto">Grupos empresariais</a></div>
          <div className="footer-column"><strong>Contato</strong><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Solicitar demonstração</a><a href="#faq">Perguntas frequentes</a></div>
        </div>
        <div className="container footer-bottom"><span>© {new Date().getFullYear()} JobForged. Todos os direitos reservados.</span><span>Recrutamento sob medida para a sua marca.</span></div>
      </footer>
    </main>
  );
}

import { PhoneFrame } from "./components/ui/PhoneFrame";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { BrandAsset } from "@/app/components/BrandAsset";
import { ArrowRight, BarChart3, Bot, BrainCircuit, BriefcaseBusiness, Check, CircleCheck, FileText, LayoutTemplate, Mail, MessageCircle, Paintbrush, PanelTop, ShieldCheck, SquareKanban, Sparkles, UsersRound } from "lucide-react";
import { DecorativeMotion } from "./components/DecorativeMotion";
import LandingHeader from "./components/landing/LandingHeader";
import LandingPricingCards from "./components/landing/LandingPricingCards";
import FaqList from "./components/landing/FaqList";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5561991630130&text=Ol%C3%A1%2C+quero+conhecer+a+JobForged.&type=phone_number&app_absent=0";

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

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return <div className={`lp-reveal ${className ?? ''}`} style={{'--reveal-delay': `${delay}s`} as CSSProperties}>{children}</div>;
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
    <div className="product-scene">
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
                    <DecorativeMotion
                      className="candidate-card"
                      key={candidate}
                      animate={{ y: [0, -3, 0, 2, 0] }}
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
                    </DecorativeMotion>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DecorativeMotion
        className="floating-card floating-card--whatsapp"
        animate={{ x: [0, 14, -7, 18, 0], y: [0, -19, 7, -11, 0] }}
        transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="floating-icon"><MessageCircle size={20} /></span>
        <span><small>Entrevista enviada</small><strong>WhatsApp conectado</strong></span>
      </DecorativeMotion>

      <DecorativeMotion
        className="floating-card floating-card--match"
        animate={{ x: [0, -16, 8, -12, 0], y: [0, 15, -9, 10, 0] }}
        transition={{ duration: 8.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <span className="match-value" role="img" aria-label="92% de aderência"><span aria-hidden="true">92%</span></span>
        <span><small>Aderência à vaga</small><strong>Perfil recomendado</strong></span>
      </DecorativeMotion>
    </div>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <LandingHeader />

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
        <div className="hero-orb hero-orb--two" aria-hidden="true" />
        <div className="container hero-layout">
          <div className="hero-copy">
            <h1>Recrute com a <BrandPair blue="sua" teal="marca." /><br />Contrate com inteligência.</h1>
            <p className="hero-lead">
              Centralize vagas, currículos, triagem automática, Kanban e histórico de candidatos em uma plataforma feita para PMEs que querem mais controle e menos retrabalho.
            </p>
            <div className="hero-actions">
              <a className="button button--primary jf-action jf-action--primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Quero uma demonstração <ArrowRight size={19} /></a>
              <a className="button button--ghost jf-action jf-action--secondary" href="#como-funciona"><span className="play-dot">▶</span> Ver como funciona</a>
            </div>
          </div>
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
            <PhoneFrame className="phone" label="Prévia da entrevista pelo WhatsApp">
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
            </PhoneFrame>
            <DecorativeMotion
              className="phone-status"
              animate={{ x: [0, 9, -5, 7, 0], y: [0, -12, 5, -8, 0] }}
              transition={{ repeat: Infinity, duration: 7.4, ease: "easeInOut" }}
            >
              <CircleCheck /><span><strong>Resposta registrada</strong><small>Perfil atualizado no ATS</small></span>
            </DecorativeMotion>
            <DecorativeMotion
              className="phone-quality"
              animate={{ x: [0, -10, 6, -7, 0], y: [0, 9, -6, 11, 0] }}
              transition={{ repeat: Infinity, duration: 8.2, ease: "easeInOut", delay: 0.6 }}
            >
              <Bot /><span><strong>Agente de triagem</strong><small>Currículo analisado no WhatsApp</small></span>
            </DecorativeMotion>
          </Reveal>
          <Reveal className="whatsapp-copy" delay={0.1}>
            <span className="eyebrow eyebrow--light">Agente de triagem no WhatsApp</span>
            <h2><BrandPair blue="Triamos" teal="e organizamos" light /> cada candidato.<br />Seu RH decide.</h2>
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
            <h2 className="brand-promise"><span className="brand-promise__sua">Sua</span> <span className="brand-promise__marca">marca,</span><br />com a <span className="brand-promise__nossa">nossa</span> <span className="brand-promise__tecnologia">tecnologia.</span></h2>
            <p>Uma experiência de recrutamento com a identidade da sua empresa.</p>
            <div className="check-grid">
              <span><Check /> Logo, cores e página de carreiras</span>
              <span><Check /> Domínio e comunicação próprios</span>
              <span><Check /> Jornada adaptada ao seu processo</span>
            </div>
            <a className="button button--blue jf-action jf-action--accent" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Ver com minha marca <ArrowRight /></a>
          </Reveal>
          <Reveal className="personalization-scene" delay={0.12}>
            <DecorativeMotion className="brand-studio-badge brand-studio-badge--white-label" aria-hidden="true"
              animate={{ x: [0, -16, 8, -12, 0], y: [0, 15, -9, 10, 0] }}
              transition={{ duration: 8.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>
              <span className="brand-studio-badge__icon"><LayoutTemplate /></span>
              <span><strong>White Label</strong><small>Exiba a sua marca</small></span>
            </DecorativeMotion>
            <div className="product-window personalization-window brand-studio-window">
              <div className="window-bar">
                <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
                <span className="window-address">carreiras.suaempresa.com.br</span>
                <ShieldCheck size={16} aria-hidden="true" />
              </div>
              <div className="brand-studio">
                <aside className="brand-studio__sidebar" aria-label="Menu do portal">
                  <span className="brand-studio__sidebar-mark">S</span>
                  <i><PanelTop /></i>
                  <i><BriefcaseBusiness /></i>
                  <i className="is-active"><Paintbrush /></i>
                  <i><BarChart3 /></i>
                </aside>
                <div className="brand-studio__panel">
                  <span className="brand-studio__eyebrow"><Paintbrush /> Identidade da sua marca</span>
                  <div className="brand-studio__company"><b>S</b><span><strong>Sua empresa</strong></span></div>
                  <small className="brand-studio__palette-label">Sua paleta de cores</small>
                  <div className="brand-studio__swatches" aria-label="Cores da marca"><i /><i /><i /></div>
                  <span className="brand-studio__domain">jobs.suaempresa | jobforged.suaempresa</span>
                </div>
                <div className="brand-studio__preview">
                  <div className="brand-studio__nav"><span><b>S</b> Sua empresa</span><small>Vagas&nbsp;&nbsp; Cultura</small></div>
                  <div className="brand-studio__hero"><span>TRABALHE CONOSCO</span><strong>Um time com espaço para você crescer.</strong><button type="button" tabIndex={-1}>Ver vagas <ArrowRight /></button></div>
                  <div className="brand-studio__cards"><span>Produto</span><span>Comercial</span><span>Operações</span></div>
                </div>
              </div>
            </div>
            <DecorativeMotion className="brand-studio-badge brand-studio-badge--on-demand" aria-hidden="true"
              animate={{ x: [0, 14, -7, 18, 0], y: [0, -19, 7, -11, 0] }}
              transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut" }}>
              <span className="brand-studio-badge__icon"><Sparkles /></span>
              <span><strong>Sob demanda</strong><small>Flexível para seu RS.</small></span>
            </DecorativeMotion>
          </Reveal>
        </div>
      </section>

      <section className="difference-section" id="diferenciais">
        <div className="container">
          <SectionIntro
            eyebrow="Três diferenciais. Um só processo."
            title={<>Uma experiência mais <BrandPair blue="próxima" teal="e inteligente." /></>}
            text="Identidade própria, conversas pelo WhatsApp e triagem assistida trabalhando de forma integrada."
            align="center"
          />
          <div className="difference-grid">
            <Reveal className="difference-card difference-card--brand">
              <span className="difference-number">01</span>
              <Paintbrush />
              <h3>Sua marca em toda a jornada.</h3>
              <p>Logo, cores, domínio e portal de carreiras criam uma experiência realmente própria.</p>
              <div className="difference-visual difference-mini-brand">
                <span className="difference-visual__label"><ShieldCheck /> White label ativo</span>
                <div className="difference-brand-row"><i>S</i><span><strong>Sua Empresa</strong><small>Portal de carreiras personalizado</small></span></div>
                <em>carreiras.suaempresa.com.br</em>
              </div>
            </Reveal>
            <Reveal className="difference-card difference-card--whatsapp" delay={0.08}>
              <span className="difference-number">02</span>
              <MessageCircle />
              <h3>WhatsApp conectado ao processo.</h3>
              <p>Currículos, respostas e confirmações chegam pelo canal que o candidato já utiliza.</p>
              <div className="difference-visual difference-mini-chat">
                <span className="difference-visual__label"><MessageCircle /> Conversa integrada</span>
                <div className="difference-chat-bubble">Olá, Júlia! Envie seu currículo.</div>
                <div className="difference-chat-bubble difference-chat-bubble--reply">Currículo enviado <i>✓✓</i></div>
                <small className="difference-visual__status"><CircleCheck /> Resposta salva no ATS</small>
              </div>
            </Reveal>
            <Reveal className="difference-card difference-card--ai" delay={0.16}>
              <span className="difference-number">03</span>
              <Bot />
              <h3>Triagem por IA com contexto.</h3>
              <p>O agente lê cada perfil, organiza a aderência e destaca quem merece atenção primeiro.</p>
              <div className="difference-visual difference-mini-score">
                <span className="difference-visual__label"><Sparkles /> Agente de triagem</span>
                <div className="difference-score-row"><strong>92%</strong><span><b>Alta aderência</b><small>Perfil recomendado</small></span></div>
                <i><b /></i>
                <small className="difference-visual__status"><FileText /> Currículo e respostas analisados</small>
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
          <LandingPricingCards />
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
          <FaqList />
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
              <a className="jf-action jf-action--on-dark" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Solicitar demonstração <ArrowRight /></a>
              <span><ShieldCheck /> Demonstração personalizada e sem compromisso.</span>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-shell">
          <div className="footer-grid">
            <div className="footer-brand">
              { }
              <BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={636} height={184} />
              <p>ATS white label com WhatsApp integrado e agente de triagem por IA.</p>
              <address>
                CNPJ 65.703.328/0001-10<br />
                © {new Date().getFullYear()} JobForged. Todos os direitos reservados.
              </address>
            </div>
            <div className="footer-contact">
              <span className="eyebrow">Vamos conversar?</span>
              <h2>Veja a JobForged funcionando na sua operação.</h2>
              <div className="footer-contact__links">
                <a href="mailto:jobforged@gmail.com"><Mail /> <span><small>E-mail</small><strong>jobforged@gmail.com</strong></span></a>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><MessageCircle /> <span><small>WhatsApp</small><strong>+55 61 9 9163-0130</strong></span></a>
              </div>
            </div>
          </div>
          <div className="footer-navigation">
            <nav aria-label="Navegação institucional e documentos legais">
              <Link href="/design-system">Design System</Link>
              <Link href="/termos-servico">Termos de serviço</Link>
              <Link href="/politicas-privacidade">Privacidade</Link>
              <Link href="/politicas-exclusao">Exclusão de dados</Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}

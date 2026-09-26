"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { MetricCard, Panel, useThemePreference } from "@/app/components/ui";
import { BrandAsset } from "@/app/components/BrandAsset";
import { JobForgedLoadingAnimation } from "@/app/components/JobForgedLoadingAnimation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  Copy,
  Download,
  FileText,
  House,
  Info,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Menu,
  MoreHorizontal,
  MousePointerClick,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Plus,
  Ruler,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Type,
  UserRound,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { AdvancedCharts, BackgroundsSection, ButtonSpecs, EmptyStatesSection, IconLibrary } from "./DesignSystemAdditions";
import {
  CheckboxField,
  AppToast,
  DateField,
  DateRangeField,
  FileUploadField,
  MultiFileUploadField,
  MultiSelectField,
  RadioField,
  RichTextField,
  SelectField,
  TextField,
  ToggleSwitch,
  ThemeSelector,
  type ToastNotice,
  type DateRangeValue,
  type SelectOption,
} from "@/app/components/ui";

type Theme = "light" | "dark";
type AlertKind = "success" | "info" | "warning" | "danger";

const navigation = [
  { id: "fundamentos", label: "Fundamentos", icon: BookOpen },
  { id: "marca", label: "Ativos da marca", icon: Sparkles },
  { id: "cores", label: "Cores", icon: Palette },
  { id: "tipografia", label: "Tipografia", icon: Type },
  { id: "botoes", label: "Botões", icon: MousePointerClick },
  { id: "formularios", label: "Formulários", icon: SlidersHorizontal },
  { id: "componentes", label: "Biblioteca", icon: Layers3 },
  { id: "fundos", label: "Background", icon: PanelsTopLeft },
  { id: "espacamento", label: "Espaçamento", icon: Ruler },
  { id: "empty-states", label: "Empty States", icon: FileText },
  { id: "dashboards", label: "Dashboards", icon: LayoutDashboard },
  { id: "aplicacao", label: "Aplicação", icon: PanelsTopLeft },
];

const dashboardFunnel = [
  { label: "Candidaturas", value: 486, width: 100 },
  { label: "Triagem", value: 218, width: 72 },
  { label: "Entrevistas", value: 94, width: 48 },
  { label: "Propostas", value: 28, width: 29 },
  { label: "Contratações", value: 17, width: 20 },
];

const spacingScale = [
  { token: "--jf-ui-space-1", value: 4, label: "Micro" },
  { token: "--jf-ui-space-2", value: 8, label: "Ícone e texto" },
  { token: "--jf-ui-space-3", value: 12, label: "Controles próximos" },
  { token: "--jf-ui-space-4", value: 16, label: "Gutter móvel" },
  { token: "--jf-ui-space-6", value: 24, label: "Grupos" },
  { token: "--jf-ui-space-7", value: 32, label: "Cards" },
  { token: "--jf-ui-space-8", value: 48, label: "Blocos" },
  { token: "--jf-ui-space-9", value: 64, label: "Seções" },
];

const applicationMenu = [
  { label: "Home", icon: House },
  { label: "Dashboards", icon: LayoutDashboard },
  { label: "Vagas", icon: BriefcaseBusiness },
  { label: "Candidaturas", icon: UsersRound },
  { label: "Agenda", icon: CalendarDays },
  { label: "Personalização", icon: Palette },
  { label: "Administradores", icon: ShieldCheck },
  { label: "Financeiro", icon: WalletCards },
  { label: "Configurações", icon: Settings2 },
];

const colorUsage = [
  { title: "Backgrounds", token: "--ds-bg", text: "Base das páginas e áreas amplas, sempre com baixo contraste visual." },
  { title: "Containers", token: "--ds-surface", text: "Cards, painéis, tabelas e grupos de campos sobre o background." },
  { title: "Pop-ups", token: "--ds-surface-raised", text: "Menus, modais e notificações que precisam se destacar com sombra." },
  { title: "Linhas", token: "--ds-border", text: "Divisores e contornos discretos; nunca devem competir com o conteúdo." },
  { title: "Ações", token: "--ds-brand", text: "Ações principais, progresso e pontos positivos da experiência." },
  { title: "Informação", token: "--ds-accent", text: "Links, navegação ativa, tecnologia e destaques complementares." },
  { title: "Foco", token: "--jf-ui-focus", text: "Indicador de foco compartilhado pelos controles do aplicativo." },
];

const colorTokens = [
  { name: "Turquesa JobForged", variable: "--jf-ui-brand", group: "brand", use: "Ações principais e progresso" },
  { name: "Azul JobForged", variable: "--jf-ui-accent", group: "brand", use: "Navegação e informação" },
  { name: "Background", variable: "--jf-ui-surface-soft", group: "foundation", use: "Base da página" },
  { name: "Surface", variable: "--jf-ui-surface", group: "foundation", use: "Cards e containers" },
  { name: "Border", variable: "--jf-ui-border", group: "foundation", use: "Linhas e divisores" },
  { name: "Text primary", variable: "--jf-ui-text", group: "foundation", use: "Texto de maior contraste" },
  { name: "Success", variable: "--jf-ui-success", group: "feedback", use: "Conclusão positiva" },
  { name: "Warning", variable: "--jf-ui-warning", group: "feedback", use: "Atenção necessária" },
  { name: "Danger", variable: "--jf-ui-danger", group: "feedback", use: "Erro ou bloqueio" },
  { name: "Informação", variable: "--jf-ui-accent", group: "feedback", use: "Observações e casos especiais" },
  { name: "Foco de controles", variable: "--jf-ui-focus", group: "interaction", use: "Borda e indicador de foco compartilhados" },
];

const animatedBrandAssets: Array<{ title: string; description: string; asset: string; reusable?: boolean; variant?: "primary" | "inverted" }> = [
  { title: "Carregamento JobForged", description: "Ícone central pulsante; mira turquesa em rotação suave de 1,5 segundo.", asset: "/brand/jobforged-loader-rotating.svg", reusable: true, variant: "primary" },
  { title: "Carregamento JobForged — cores invertidas", description: "Mira azul e personagem turquesa, com o mesmo movimento suave.", asset: "/brand/jobforged-loader-rotating-alternate.svg", reusable: true, variant: "inverted" },
  { title: "Animação principal", description: "Turquesa na mira e azul na pessoa.", asset: "/brand/jobforged-loader.svg" },
  { title: "Animação alternativa", description: "Azul na mira e turquesa na pessoa.", asset: "/brand/jobforged-loader-alternate.svg" },
];

const quickAlerts: Array<{ kind: AlertKind; label: string; title: string; text: string }> = [
  { kind: "success", label: "Sucesso", title: "Alterações salvas", text: "As informações foram atualizadas com sucesso." },
  { kind: "info", label: "Informação", title: "Novo candidato", text: "Uma nova candidatura chegou para avaliação." },
  { kind: "warning", label: "Atenção", title: "Perfil incompleto", text: "Revise os critérios obrigatórios antes de avançar." },
  { kind: "danger", label: "Erro", title: "Não foi possível concluir", text: "Tente novamente ou fale com o suporte." },
];

const workModelOptions: SelectOption[] = [
  { value: "Híbrido", label: "Híbrido", description: "Presencial e remoto" },
  { value: "Remoto", label: "Remoto", description: "Trabalho a distância" },
  { value: "Presencial", label: "Presencial", description: "Atuação no escritório" },
];

const skillOptions: SelectOption[] = [
  { value: "SaaS", label: "SaaS" },
  { value: "B2B", label: "B2B" },
  { value: "Customer Success", label: "Customer Success" },
  { value: "People Analytics", label: "People Analytics" },
];

const initialStageOptions: SelectOption[] = [
  { value: "Triagem", label: "Triagem", description: "Análise inicial dos perfis" },
  { value: "Entrevista", label: "Entrevista", description: "Conversa com o candidato" },
  { value: "Teste técnico", label: "Teste técnico", description: "Avaliação prática" },
];

const initialBenefitOptions: SelectOption[] = [
  { value: "Vale alimentação", label: "Vale alimentação" },
  { value: "Plano de saúde", label: "Plano de saúde" },
  { value: "Auxílio home office", label: "Auxílio home office" },
];

const brandFamilies = [
  {
    number: "01",
    title: "Assinatura principal",
    description: "Turquesa conduz a mira; azul destaca a pessoa e o nome Job.",
    logo: "/brand/jobforged-logo-primary.svg",
    symbol: "/brand/jobforged-symbol.svg",
  },
  {
    number: "02",
    title: "Assinatura alternativa",
    description: "Azul conduz a mira; turquesa destaca a pessoa e o nome Job.",
    logo: "/brand/jobforged-logo-alternate.svg",
    symbol: "/brand/jobforged-icon-alternate.svg",
  },
];

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="ds-section-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function ExampleCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`ds-example-card ${className}`}>
      <div className="ds-example-card__header">
        <span>{title}</span>
      </div>
      <div className="ds-example-card__body">{children}</div>
    </article>
  );
}

function PaletteColor({ token, copied, onCopy, featured = false }: { token: (typeof colorTokens)[number]; theme: Theme; copied: string | null; onCopy: (value: string, label: string) => void; featured?: boolean }) {
  const swatchColor = `var(${token.variable})`;
  function copyTokenValue() {
    const page = document.querySelector<HTMLElement>(".ds-page");
    const value = page ? getComputedStyle(page).getPropertyValue(token.variable).trim() : "";
    if (value) onCopy(value, token.name);
  }
  return (
    <button type="button" className={`ds-palette-color ${featured ? "ds-palette-color--featured" : ""}`} style={{ "--palette-color": swatchColor } as CSSProperties} onClick={copyTokenValue} aria-label={`Copiar o valor de ${token.name}`}>
      <span className="ds-palette-color__swatch" aria-hidden="true" />
      <span className="ds-palette-color__content"><strong>{token.name}</strong><small>{token.use}</small><code>{token.variable}</code></span>
      <span className="ds-palette-color__value">{copied === token.name ? <><Check size={14} />Copiado</> : <><Copy size={14} />Copiar valor</>}</span>
    </button>
  );
}

function AlertIcon({ kind, size = 18 }: { kind: AlertKind; size?: number }) {
  if (kind === "success") return <CircleCheck size={size} aria-hidden="true" />;
  if (kind === "warning") return <CircleAlert size={size} aria-hidden="true" />;
  if (kind === "danger") return <CircleX size={size} aria-hidden="true" />;
  return <Info size={size} aria-hidden="true" />;
}

export default function DesignSystemClient() {
  const { theme, changeTheme } = useThemePreference();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [appSidebarExpanded, setAppSidebarExpanded] = useState(true);
  const [activePage, setActivePage] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<ToastNotice | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [workModel, setWorkModel] = useState("Híbrido");
  const [selectedSkills, setSelectedSkills] = useState(["SaaS", "B2B"]);
  const [stageOptions, setStageOptions] = useState<SelectOption[]>(initialStageOptions);
  const [selectedStage, setSelectedStage] = useState("Entrevista");
  const [benefitOptions, setBenefitOptions] = useState<SelectOption[]>(initialBenefitOptions);
  const [selectedBenefits, setSelectedBenefits] = useState(["Vale alimentação"]);
  const [interviewRange, setInterviewRange] = useState<DateRangeValue>({ start: "2026-08-20", end: "" });
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadedPicture, setUploadedPicture] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPictures, setUploadedPictures] = useState<File[]>([]);

  useEffect(() => {
    const syncPageFromPath = () => {
      const segments = window.location.pathname.split("/").filter(Boolean);
      const requestedSection = segments[0] === "design-system" && segments.length === 2 ? segments[1] : "";
      const index = navigation.findIndex((item) => item.id === requestedSection);
      const resolvedIndex = index >= 0 ? index : 0;
      const canonicalPath = `/design-system/${navigation[resolvedIndex].id}`;
      setActivePage(resolvedIndex);
      if (window.location.pathname !== canonicalPath || window.location.hash) {
        window.history.replaceState(null, "", canonicalPath);
      }
    };
    const frame = window.requestAnimationFrame(syncPageFromPath);
    window.addEventListener("popstate", syncPageFromPath);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", syncPageFromPath);
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!activeAlert) return;
    const timer = window.setTimeout(() => setActiveAlert(null), 3600);
    return () => window.clearTimeout(timer);
  }, [activeAlert]);

  function changePage(index: number) {
    setActivePage(index);
    setMenuOpen(false);
    window.history.pushState(null, "", `/design-system/${navigation[index].id}`);
    document.querySelector(".ds-content")?.scrollTo({ top: 0, behavior: "auto" });
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(label);
    setActiveAlert({ kind: "success", title: "Conteúdo copiado", text: `${label} foi copiado para a área de transferência.` });
  }

  function addStage(label: string) {
    const existing = stageOptions.find((option) => option.label.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"));
    const value = existing?.value ?? label;
    if (!existing) setStageOptions((current) => [...current, { value, label }]);
    setSelectedStage(value);
  }

  function addBenefit(label: string) {
    const existing = benefitOptions.find((option) => option.label.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"));
    const value = existing?.value ?? label;
    if (!existing) setBenefitOptions((current) => [...current, { value, label }]);
    setSelectedBenefits((current) => current.includes(value) ? current : [...current, value]);
  }

  const currentPage = navigation[activePage];
  const sidebarExpanded = sidebarPinned || menuOpen;

  return (
    <main className={`ds-page ${sidebarPinned ? "is-sidebar-pinned" : "is-sidebar-compact"}`} data-theme={theme} suppressHydrationWarning>
      <a className="ds-skip-link" href="#painel-atual">Ir para o conteúdo</a>

      <header className="ds-header">
        <div className="ds-header__inner">
          <Link className="ds-brand" href="/" aria-label="Voltar para a página inicial da JobForged">
            <BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={636} height={184} />
            <span>Manual da marca</span>
          </Link>
          <div className="ds-header__actions">
            <ThemeSelector theme={theme} onChange={changeTheme} />
            <button type="button" className="ds-mobile-menu" aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={20} aria-hidden="true" /></button>
          </div>
        </div>
      </header>

      <div className="ds-layout">
        <aside
          className={`ds-sidebar ${menuOpen ? "is-open" : ""} ${sidebarExpanded ? "is-expanded" : "is-compact"}`}
        >
          <div className="ds-sidebar__top">
            <span className="ds-sidebar__title"><BrandAsset src="/brand/jobforged-symbol.svg" alt="" />{sidebarExpanded && <strong>Manual</strong>}</span>
            <button
              type="button"
              className="ds-sidebar__pin"
              aria-label={sidebarPinned ? "Recolher menu para ícones" : "Fixar menu expandido"}
              aria-pressed={sidebarPinned}
              onClick={() => setSidebarPinned((pinned) => !pinned)}
            >
              {sidebarPinned ? <PanelLeftClose size={17} aria-hidden="true" /> : <PanelLeftOpen size={17} aria-hidden="true" />}
            </button>
          </div>
          <nav aria-label="Páginas do manual da marca">
            {navigation.map((item, index) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" title={!sidebarExpanded ? item.label : undefined} className={activePage === index ? "is-active" : ""} aria-current={activePage === index ? "page" : undefined} onClick={() => changePage(index)}>
                  <span className="ds-sidebar__icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  <strong>{item.label}</strong>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="ds-content" id="painel-atual">
          <div className="ds-content__inner">
          <div className="ds-page-meta"><strong><span>{String(activePage + 1).padStart(2, "0")} -</span> {currentPage.label}</strong></div>

          <section className="ds-hero" hidden={activePage !== 0} aria-label="Fundamentos da marca">
            <div className="ds-hero__copy"><span className="ds-kicker">Identidade visual · v1.3</span><h1>Interfaces <em className="ds-highlight-pair"><span className="ds-highlight-blue">claras</span> <span className="ds-highlight-teal">e humanas.</span></em><br />Decisões mais inteligentes.</h1><p>O sistema visual da JobForged une precisão, proximidade e tecnologia. Esta base mantém o produto consistente em qualquer tela, nos temas claro e escuro.</p><div className="ds-hero__tags" aria-label="Princípios da marca"><span>Humano</span><span>Confiável</span><span>Objetivo</span><span>Adaptável</span></div></div>
            <div className="ds-hero__visual" aria-hidden="true"><div className="ds-orbit ds-orbit--one" /><div className="ds-orbit ds-orbit--two" /><JobForgedLoadingAnimation className="ds-hero__loader" size={112} /><span className="ds-visual-label ds-visual-label--one">Dados organizados</span><span className="ds-visual-label ds-visual-label--two">Entrevistas no WhatsApp</span><span className="ds-visual-label ds-visual-label--three">Triagem inteligente</span><span className="ds-visual-label ds-visual-label--four">Marca própria</span><span className="ds-visual-label ds-visual-label--five">Decisões seguras</span><span className="ds-visual-label ds-visual-label--six">Processos ágeis</span></div>
          </section>
          <section className="ds-llm-manual" hidden={activePage !== 0} aria-label="Manual da marca para LLM">
            <div><FileText size={22} aria-hidden="true"/><span><strong>Manual da marca para LLM</strong><small>Este documento será ampliado quando o Design System estiver concluído e servirá para transportar as regras visuais da JobForged entre ferramentas e modelos de linguagem.</small></span></div>
            <a className="ds-button ds-button--outline" href="/manual-da-marca-jobforged-llm.md" download><Download size={16}/>Baixar documento para LLM</a>
          </section>

          <section className="ds-section" hidden={activePage !== 0} aria-label="Indicador do painel">
            <SectionHeading title="Indicadores do painel" description="Mesmo componente utilizado na Home, nas vagas e nos dashboards. Tipografia, superfície e espaçamento seguem os tokens oficiais." />
            <MetricCard label="Vagas ativas" value="24" detail="Indicador demonstrativo"/><Panel style={{padding:"var(--jf-ui-space-6)",marginTop:"var(--jf-ui-space-6)"}}><h3>Grupo de conteúdo</h3><p>Superfície compartilhada pelas telas do painel empresarial.</p></Panel>
          </section>
          <section className="ds-section ds-section--first" hidden={activePage !== 1} aria-label="Ativos da marca">
            <SectionHeading title="Arquivos oficiais, prontos para usar." description="Escolha a versão adequada e baixe o arquivo original sem alterar proporções ou cores." />
            <div className="ds-asset-section">
              <header><span>01</span><div><h3>Logos</h3><p>Assinaturas horizontais para cabeçalhos, documentos e comunicações.</p></div></header>
              <div className="ds-brand-families">
                {brandFamilies.map((family) => (
                  <article className="ds-brand-family" key={family.title}>
                    <header><span>{family.number}</span><div><strong>{family.title}</strong><p>{family.description}</p></div></header>
                    <div className="ds-brand-family__preview ds-brand-family__preview--logo"><div className="ds-brand-family__logo"><small>Logo horizontal</small><BrandAsset src={family.logo} alt={`${family.title} da JobForged`} /></div></div>
                    <footer><span>Arquivo vetorial oficial</span><div><a href={family.logo} download className="ds-download-button"><Download size={15} />Logo SVG</a></div></footer>
                  </article>
                ))}
              </div>
            </div>
            <div className="ds-asset-section">
              <header><span>02</span><div><h3>Ícones</h3><p>Símbolos compactos para favicons, menus, avatares e estados reduzidos.</p></div></header>
              <div className="ds-brand-icons">{brandFamilies.map((family) => <article key={family.symbol}><BrandAsset src={family.symbol} alt={`Ícone da ${family.title.toLowerCase()}`} /><span><strong>{family.title}</strong><small>SVG vetorial · fundo transparente</small></span><a href={family.symbol} download className="ds-download-button"><Download size={15} />Ícone SVG</a></article>)}</div>
            </div>
            <div className="ds-asset-section">
              <header><span>03</span><div><h3>Animações</h3><p>Assets de carregamento para transições, inicialização e processamento.</p></div></header>
              <div className="ds-animated-assets">{animatedBrandAssets.map((asset) => <article className="ds-animated-asset" key={asset.title}><div>{asset.reusable ? <JobForgedLoadingAnimation size={76} variant={asset.variant} /> : <BrandAsset src={asset.asset} alt={`${asset.title} da JobForged`} />}<span><strong>{asset.title}</strong><small>{asset.description}</small>{asset.reusable && <code className="ds-animated-asset__example">&lt;JobForgedLoadingAnimation size={112}{asset.variant === "inverted" ? ' variant="inverted"' : ""} /&gt;</code>}</span></div><a href={asset.asset} download className="ds-download-button"><Download size={15} />Baixar SVG animado</a></article>)}</div>
            </div>
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 2} aria-label="Cores da marca">
            <SectionHeading title="Cores com função clara em cada camada." description="A marca aparece nas ações e nos destaques. Neutros organizam o conteúdo; cores semânticas comunicam estados sem ambiguidade." />
            <div className="ds-color-workbench">
              <div className="ds-color-overview"><div><span>Sistema cromático</span><h3>Uma paleta orientada por função.</h3><p>As cores de marca conduzem ações; os neutros constroem hierarquia; as cores semânticas comunicam estados. Clique em qualquer token para copiar o valor do tema atual.</p></div><div className="ds-color-overview__rules"><span><b>01</b> Marca</span><span><b>02</b> Estrutura</span><span><b>03</b> Feedback</span></div></div>
              <div className="ds-palette-group ds-palette-group--brand"><div className="ds-palette-group__heading"><span>01</span><div><strong>Cores da marca</strong><small>Ações, navegação e pontos de destaque</small></div></div><div className="ds-palette-group__colors ds-palette-group__colors--brand">{colorTokens.filter((token) => token.group === "brand").map((token) => <PaletteColor key={token.variable} token={token} theme={theme} copied={copied} onCopy={copyValue} featured />)}</div></div>
              <div className="ds-palette-group"><div className="ds-palette-group__heading"><span>02</span><div><strong>Base da interface</strong><small>Fundos, superfícies, linhas e leitura</small></div></div><div className="ds-palette-group__colors">{colorTokens.filter((token) => token.group === "foundation").map((token) => <PaletteColor key={token.variable} token={token} theme={theme} copied={copied} onCopy={copyValue} />)}</div></div>
              <div className="ds-palette-group"><div className="ds-palette-group__heading"><span>03</span><div><strong>Cores de feedback</strong><small>Estados que exigem interpretação rápida</small></div></div><div className="ds-palette-group__colors ds-palette-group__colors--feedback">{colorTokens.filter((token) => token.group === "feedback").map((token) => <PaletteColor key={token.variable} token={token} theme={theme} copied={copied} onCopy={copyValue} />)}</div></div>
              <div className="ds-palette-group"><div className="ds-palette-group__heading"><span>04</span><div><strong>Interação</strong><small>Foco visível para navegação por teclado</small></div></div><div className="ds-palette-group__colors">{colorTokens.filter((token) => token.group === "interaction").map((token) => <PaletteColor key={token.variable} token={token} theme={theme} copied={copied} onCopy={copyValue} />)}</div></div>
              <div className="ds-color-guidance"><div><strong>Contraste é obrigatório</strong><p>Texto e ícones devem manter leitura adequada sobre qualquer cor white label. Cores de feedback não devem ser substituídas por cores de marca.</p></div><div className="ds-color-guidance__samples"><span className="is-approved"><Check size={14}/> Combinação aprovada</span><span className="is-restricted"><CircleAlert size={14}/> Validar contraste</span></div></div>
            </div>
            <div className="ds-color-usage"><div className="ds-color-usage__heading"><Palette size={20} aria-hidden="true" /><div><strong>Mapa de aplicação</strong><span>Use os tokens pelo papel que exercem, não apenas pela aparência.</span></div></div><div className="ds-color-usage__grid">{colorUsage.map((usage) => <article key={usage.title}><i className="ds-color-usage__sample" style={{ "--usage-color": `var(${usage.token})` } as CSSProperties} /><div><span>{usage.title}</span><code>{usage.token}</code><p>{usage.text}</p></div></article>)}</div></div>
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 3} aria-label="Tipografia">
            <SectionHeading title="Duas fontes, uma hierarquia fácil de reconhecer." description="Montserrat lidera; Open Sans sustenta a leitura. A combinação equilibra personalidade de marca e clareza em interfaces densas." />
            <div className="ds-type-families"><article className="ds-type-family ds-type-family--montserrat"><span>Aa</span><div><strong>Montserrat Variable</strong><em>Fonte primária</em><p>Títulos, navegação, botões, métricas e labels curtas. Use pesos de 600 a 780 para dar direção e presença.</p></div></article><article className="ds-type-family ds-type-family--opensans"><span>Aa</span><div><strong>Open Sans Variable</strong><em>Fonte secundária</em><p>Parágrafos, campos, tabelas, descrições e conteúdos longos. Use pesos de 400 a 650 para maximizar a leitura.</p></div></article></div>
            <div className="ds-type-scale"><div><span>Display · Montserrat 52/58</span><strong>Talentos que movem negócios.</strong></div><div><span>Heading · Montserrat 32/40</span><strong>Visão completa do processo.</strong></div><div><span>Body · Open Sans 15/24</span><p>Informação organizada para o RH decidir com mais segurança, contexto e agilidade.</p></div><div><span>Label · Montserrat 12/16</span><small>ETAPA ATUAL · ENTREVISTA</small></div></div>
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 4} aria-label="Botões">
            <SectionHeading title="Botões compactos, claros e consistentes." description="Cantos discretos e cores leves mantêm as ações acessíveis sem competir com o conteúdo." />
            <div className="ds-examples-grid">
              <ExampleCard title="Principais · com e sem ícone"><div className="ds-button-row"><button type="button" className="ds-button ds-button--primary"><Plus size={16} />Nova vaga</button><button type="button" className="ds-button ds-button--accent">Ver candidatos</button></div><p className="ds-component-spec">Altura 40 px · padding 14 px · gap 8 px · raio 8 px. Use ícone de 16 px quando ele acelerar o reconhecimento da ação.</p></ExampleCard>
              <ExampleCard title="Transparentes · com e sem ícone"><div className="ds-button-row"><button type="button" className="ds-button ds-button--outline"><Sparkles size={16} />Editar processo</button><button type="button" className="ds-button ds-button--ghost">Cancelar</button><button type="button" className="ds-icon-button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></div><p className="ds-component-spec">Outline para ações secundárias; ghost para baixa ênfase; somente ícone em ações reconhecíveis, sempre com nome acessível.</p></ExampleCard>
              <ExampleCard title="Botão de menu"><div className="ds-menu-button-showcase"><button type="button" className="ds-menu-button-demo" aria-label={sidebarPinned ? "Reduzir menu" : "Expandir menu"} onClick={() => setSidebarPinned((pinned) => !pinned)}>{sidebarPinned ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}</button><span><strong>{sidebarPinned ? "Reduzir menu lateral" : "Expandir menu lateral"}</strong><small>40 × 40 px · alterna entre navegação completa e compacta com ícones.</small></span></div></ExampleCard>
              <ExampleCard title="Navegação do cabeçalho"><div className="ds-header-link-showcase"><button type="button" className="ds-header-link-demo">Como funciona</button><span><strong>Link de navegação</strong><small>Texto com mudança de cor e linha inferior no hover.</small></span></div></ExampleCard>
              <ExampleCard title="Tamanhos"><div className="ds-size-showcase"><div><span>Preenchido</span><div className="ds-button-row ds-button-row--sizes"><button type="button" className="ds-button ds-button--primary ds-button--small">Pequeno</button><button type="button" className="ds-button ds-button--primary">Padrão</button><button type="button" className="ds-button ds-button--primary ds-button--large">Grande</button></div></div><div><span>Contornado</span><div className="ds-button-row ds-button-row--sizes"><button type="button" className="ds-button ds-button--outline ds-button--small">Pequeno</button><button type="button" className="ds-button ds-button--outline">Padrão</button><button type="button" className="ds-button ds-button--outline ds-button--large">Grande</button></div></div><div><span>Transparente</span><div className="ds-button-row ds-button-row--sizes"><button type="button" className="ds-button ds-button--ghost ds-button--small">Pequeno</button><button type="button" className="ds-button ds-button--ghost">Padrão</button><button type="button" className="ds-button ds-button--ghost ds-button--large">Grande</button></div></div></div></ExampleCard>
              <ExampleCard title="Estados"><div className="ds-button-states"><div><button type="button" className="ds-button ds-button--primary">Salvar</button><span><strong>Padrão</strong><small>Pronto para interação</small></span></div><div><button type="button" className="ds-button ds-button--primary is-hover">Salvar</button><span><strong>Hover</strong><small>Elevação e contraste suave</small></span></div><div><button type="button" className="ds-button ds-button--primary is-focus">Salvar</button><span><strong>Focus</strong><small>Contorno visível pelo teclado</small></span></div><div><button type="button" className="ds-button ds-button--primary" disabled>Salvar</button><span><strong>Desabilitado</strong><small>Ação temporariamente indisponível</small></span></div></div></ExampleCard>
            </div>
            <ButtonSpecs />
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 5} aria-label="Formulários">
            <SectionHeading title="Controles limpos, previsíveis e prontos para o produto." description="O manual agora utiliza a mesma biblioteca oficial das futuras telas. Estados, dimensões, foco e comportamento serão reaproveitados sem reconstruir componentes por página." />
            <div className="ds-form-showcase">
              <ExampleCard title="Inputs essenciais" className="ds-example-card--form ds-form-card--wide">
                <div className="ds-modern-field-grid">
                  <TextField label="Nome da vaga" requiredLabel="Obrigatório" icon={BriefcaseBusiness} placeholder="Ex.: Analista de Customer Success" defaultValue="Analista de Customer Success" helpText="Use um título reconhecido pelo mercado." />
                  <TextField label="Foco compartilhado" className="is-focus-demo" icon={Check} defaultValue="Token único · tema atual" readOnly helpText="Usa --jf-ui-focus, o mesmo token dos formulários do app." />
                  <TextField label="E-mail do responsável" icon={Mail} type="email" placeholder="nome@empresa.com" helpText="Usado apenas nas comunicações sobre a vaga." />
                  <TextField label="Buscar candidato" icon={Search} type="search" placeholder="Nome, e-mail ou competência" helpText="Pesquise por dados ou competências do perfil." />
                  <TextField label="Senha de acesso" icon={LockKeyhole} type="password" placeholder="Digite ao menos 8 caracteres" defaultValue="12345" error="A senha precisa ter pelo menos 8 caracteres." />
                  <TextField label="Desabilitado" icon={LockKeyhole} defaultValue="Indisponível" disabled helpText="Estado inativo do mesmo componente compartilhado." />
                </div>
              </ExampleCard>
              <ExampleCard title="Dropdowns">
                <div className="ds-modern-stack">
                  <SelectField label="Modelo de trabalho" icon={BriefcaseBusiness} value={workModel} options={workModelOptions} onValueChange={setWorkModel} helpText="Selecione uma modalidade para a vaga." />
                </div>
              </ExampleCard>
              <ExampleCard title="MultiDropdown">
                <MultiSelectField label="Competências desejadas" icon={Sparkles} values={selectedSkills} options={skillOptions} onValuesChange={setSelectedSkills} helpText="Selecione mais de uma competência sem perder contexto." />
              </ExampleCard>
              <ExampleCard title="Calendários" className="ds-form-card--wide">
                <div className="ds-calendar-grid">
                  <DateField label="Data da entrevista" min="2026-01-01" max="2030-12-31" defaultValue="" helpText="Escolha uma data no calendário da JobForged." />
                  <DateRangeField label="Período de entrevistas" min="2026-01-01" max="2030-12-31" value={interviewRange} onValueChange={setInterviewRange} helpText="Escolha a data inicial e depois a data final do período." />
                </div>
              </ExampleCard>
              <ExampleCard title="Variações com novas opções" className="ds-form-card--wide">
                <div className="ds-addable-grid">
                  <SelectField label="Etapa do processo" icon={Layers3} value={selectedStage} options={stageOptions} onValueChange={setSelectedStage} allowCreate createPlaceholder="Criar nova etapa" onCreateOption={addStage} helpText="Selecione uma etapa existente ou crie outra." />
                  <MultiSelectField label="Benefícios da vaga" icon={Sparkles} values={selectedBenefits} options={benefitOptions} onValuesChange={setSelectedBenefits} allowCreate createPlaceholder="Adicionar novo benefício" onCreateOption={addBenefit} helpText="Selecione benefícios existentes ou adicione novos." />
                </div>
              </ExampleCard>
              <ExampleCard title="Checkbox e rádio">
                <div className="ds-selection-columns">
                  <div className="ds-choice-list"><CheckboxField label="Experiência com SaaS" defaultChecked /><CheckboxField label="Inglês avançado" /></div>
                  <div className="ds-choice-list"><RadioField label="Pleno" name="seniority" defaultChecked /><RadioField label="Sênior" name="seniority" /></div>
                </div>
              </ExampleCard>
              <ExampleCard title="Toggle button">
                <ToggleSwitch label="Notificações de candidatos" description="Receber um alerta sempre que um novo perfil entrar no funil." checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                <small className="ds-example-hint">Estado atual: {notificationsEnabled ? "ativado" : "desativado"}.</small>
              </ExampleCard>
              <ExampleCard title="Uploads individuais" className="ds-form-card--wide">
                <div className="ds-upload-grid">
                  <FileUploadField label="Arquivo do candidato" value={uploadedFile} accept=".pdf,.doc,.docx" emptyHint="PDF, DOC ou DOCX · até 10 MB" onFileChange={(file) => setUploadedFile(file?.name ?? null)} />
                  <FileUploadField label="Imagem do perfil" value={uploadedPicture} accept="image/png,image/jpeg,image/webp" emptyHint="PNG, JPG ou WEBP · até 5 MB" variant="picture" onFileChange={(file) => setUploadedPicture(file?.name ?? null)} />
                </div>
              </ExampleCard>
              <ExampleCard title="Uploads múltiplos" className="ds-form-card--wide">
                <div className="ds-upload-grid">
                  <MultiFileUploadField label="Documentos da candidatura" files={uploadedFiles} accept=".pdf,.doc,.docx" emptyHint="Arraste ou selecione até 6 documentos" maxFiles={6} onFilesChange={setUploadedFiles} helpText="Novos arquivos são adicionados à lista sem substituir os anteriores." />
                  <MultiFileUploadField label="Galeria da empresa" files={uploadedPictures} accept="image/png,image/jpeg,image/webp" emptyHint="Arraste ou selecione até 8 imagens" variant="picture" maxFiles={8} onFilesChange={setUploadedPictures} helpText="As imagens aparecem em miniaturas e podem ser removidas individualmente." />
                </div>
              </ExampleCard>
              <ExampleCard title="Rich text">
                <RichTextField label="Descrição da vaga" initialHtml="<strong>Sobre a oportunidade</strong><br />Descreva responsabilidades, resultados esperados e como o time trabalha." />
              </ExampleCard>
            </div>
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 6} aria-label="Biblioteca">
            <SectionHeading title="Peças pequenas que formam experiências completas." description="Combine status, pessoas e notificações com o mesmo vocabulário visual em todo o produto." />
            <div className="ds-components-grid">
              <ExampleCard title="Status"><div className="ds-badge-list"><span className="ds-badge ds-badge--success"><CircleCheck size={14} />Aprovado</span><span className="ds-badge ds-badge--warning"><Clock3 size={14} />Em avaliação</span><span className="ds-badge ds-badge--danger"><CircleX size={14} />Não selecionado</span><span className="ds-badge ds-badge--info"><CircleAlert size={14} />Novo</span></div></ExampleCard>
              <ExampleCard title="Pessoas"><div className="ds-person-list"><div className="ds-person"><span className="ds-avatar ds-avatar--teal">BS</span><div><strong>Beatriz Souza</strong><small>Product Designer</small></div><button type="button" className="ds-icon-button ds-icon-button--subtle ds-person__settings" aria-label="Configurações de Beatriz Souza"><Settings2 size={17} /></button></div><div className="ds-person"><span className="ds-avatar ds-avatar--blue">AM</span><div><strong>André Martins</strong><small>Customer Success</small></div><button type="button" className="ds-icon-button ds-icon-button--subtle" aria-label="Opções de André Martins"><MoreHorizontal size={17} /></button></div></div></ExampleCard>
              <ExampleCard title="Alertas rápidos"><div className="ds-alert-actions">{quickAlerts.map((alert) => <button key={alert.kind} type="button" className={`ds-alert-trigger ds-alert-trigger--${alert.kind}`} onClick={() => setActiveAlert(alert)}><AlertIcon kind={alert.kind} size={16} />{alert.label}</button>)}</div><small className="ds-example-hint">Clique para visualizar a notificação.</small></ExampleCard>
            </div>
            <IconLibrary/>
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 7} aria-label="Background"><BackgroundsSection/></section>

          <section className="ds-section ds-section--first" hidden={activePage !== 8} aria-label="Espaçamento">
            <SectionHeading title="Espaço também comunica hierarquia." description="A interface deve respirar. Margens, gutters e intervalos consistentes separam contextos, reduzem a sensação de sufoco e ajudam cada informação a ocupar o espaço certo." />
            <div className="ds-spacing-principle"><div><span>Princípio prioritário</span><h3>Organizar sem comprimir.</h3><p>Proximidade indica relação; distância indica mudança de assunto. Nunca compense excesso de conteúdo diminuindo indiscriminadamente os espaços. Reorganize, agrupe e priorize.</p></div><div className="ds-spacing-breath" aria-label="Comparação entre conteúdo comprimido e conteúdo com respiro"><article className="is-tight"><span/><span/><span/><span/></article><i>→</i><article className="is-correct"><span/><span/><span/><span/></article></div></div>
            <div className="ds-spacing-scale" aria-label="Escala oficial de espaçamento">{spacingScale.map(({token,value,label})=><article key={token}><span style={{"--space":`var(${token})`} as CSSProperties}/><strong>{value} px</strong><small>{label}</small><code>{token}</code></article>)}</div>
            <div className="ds-layout-rules">
              <article className="ds-layout-anatomy"><header><span>Envelope principal</span><strong>Desktop como referência</strong></header><div className="ds-layout-canvas"><i className="is-gutter-left"/><div><span>Conteúdo até 1180 px</span><b>Área útil ampla, centralizada e protegida por gutters.</b><small>Em monitores maiores, o espaço externo cresce igualmente dos dois lados.</small></div><i className="is-gutter-right"/></div><footer><span>Viewport</span><i/><strong>gutter</strong><i/><b>conteúdo</b></footer></article>
              <article className="ds-layout-table"><header><span>Limites por contexto</span><strong>Largura não é densidade</strong></header><div><span>Página pública / Landing</span><b>1180 px</b><small>Conteúdo comercial e institucional</small></div><div><span>Autenticação e adesão</span><b>1180 px</b><small>Formulário + contexto lado a lado</small></div><div><span>Documentos legais</span><b>1180 px</b><small>Envelope amplo; leitura interna até 900 px</small></div><div><span>Aplicação administrativa</span><b>Fluido</b><small>Limitado conforme densidade do módulo</small></div></article>
            </div>
            <div className="ds-responsive-spacing"><header><span>Responsividade</span><strong>O conteúdo se adapta; o gutter nunca desaparece.</strong></header><div><article><b>Desktop</b><strong>≥ 1180 px</strong><span>Conteúdo máximo de 1180 px</span><span>Gutter mínimo de 24 px</span><span>Seções: 64–112 px</span></article><article><b>Tablet</b><strong>681–1179 px</strong><span>Envelope fluido</span><span>Gutter de 24 px</span><span>Grids reorganizados</span></article><article><b>Mobile</b><strong>330–680 px</strong><span>Envelope fluido</span><span>Gutter mínimo de 16 px</span><span>Cards com 16–24 px internos</span></article></div></div>
            <div className="ds-spacing-guidance"><article className="is-do"><span><Check/> Faça</span><ul><li>Separe seções antes de adicionar bordas.</li><li>Use 24–32 px dentro de containers principais.</li><li>Mantenha alinhamento vertical entre blocos relacionados.</li><li>Reduza colunas antes de reduzir o espaço interno.</li></ul></article><article className="is-avoid"><span><CircleX/> Evite</span><ul><li>Conteúdo encostado na borda do viewport.</li><li>Cards dentro de cards sem necessidade.</li><li>Intervalos diferentes para relações equivalentes.</li><li>Comprimir formulários para ocupar menos altura.</li></ul></article></div>
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 9} aria-label="Empty States"><EmptyStatesSection/></section>

          <section className="ds-section ds-section--first" hidden={activePage !== 10} aria-label="Dashboards">
            <SectionHeading title="Elementos para dashboards." description="Referências visuais reutilizáveis para indicadores e gráficos da aplicação." />
            <div className="ds-dashboard-catalog">
              <article className="ds-dashboard-template ds-dashboard-template--funnel">
                <header><div><strong>Funil compacto</strong><small>Use em resumos quando o objetivo for identificar rapidamente a queda entre etapas.</small></div></header>
                <div className="ds-funnel-chart">{dashboardFunnel.map((stage) => <div key={stage.label}><span>{stage.label}</span><i style={{ "--funnel-width": `${stage.width}%` } as CSSProperties} /><strong>{stage.value}</strong></div>)}</div>
              </article>

              <article className="ds-dashboard-template ds-dashboard-template--jobs">
                <header><div><strong>Tabela comparativa</strong><small>Combine métricas exatas por vaga quando a leitura detalhada for mais importante que a tendência.</small></div></header>
                <div className="ds-jobs-performance"><div className="is-head"><span>Vaga</span><span>Candidatos</span><span>Tempo</span><span>Match</span></div><div><strong>Product Designer</strong><span>142</span><span>18 dias</span><b>92%</b></div><div><strong>Customer Success</strong><span>98</span><span>24 dias</span><b>87%</b></div><div><strong>People Analyst</strong><span>76</span><span>16 dias</span><b>89%</b></div></div>
              </article>

              <article className="ds-dashboard-template ds-dashboard-template--source">
                <header><div><strong>Gráfico de rosca</strong><small>Mostre a participação de poucos canais dentro de um total conhecido.</small></div></header>
                <div className="ds-source-chart"><div className="ds-source-donut"><span><strong>1.284</strong><small>total</small></span></div><ul><li><i className="is-brand" />LinkedIn <strong>38%</strong></li><li><i className="is-blue" />Portal de vagas <strong>31%</strong></li><li><i className="is-success" />Indicações <strong>19%</strong></li><li><i className="is-muted" />Outros <strong>12%</strong></li></ul></div>
              </article>

              <article className="ds-dashboard-template ds-dashboard-template--rhythm">
                <header><div><strong>Gráfico de barras</strong><small>Compare volumes discretos por período, vaga, área ou responsável.</small></div></header>
                <div className="ds-week-chart" aria-label="Candidaturas das últimas seis semanas"><div style={{ "--bar": "42%" } as CSSProperties}><i /><span>S1</span></div><div style={{ "--bar": "58%" } as CSSProperties}><i /><span>S2</span></div><div style={{ "--bar": "51%" } as CSSProperties}><i /><span>S3</span></div><div style={{ "--bar": "74%" } as CSSProperties}><i /><span>S4</span></div><div style={{ "--bar": "67%" } as CSSProperties}><i /><span>S5</span></div><div style={{ "--bar": "92%" } as CSSProperties}><i /><span>S6</span></div></div>
              </article>
            </div>
            <AdvancedCharts />
          </section>

          <section className="ds-section ds-section--first" hidden={activePage !== 11} aria-label="Aplicação">
            <SectionHeading title="Uma miniatura fiel da aplicação." description="A proporção, a navegação e a densidade de informação antecipam a tela real do produto — com o dashboard como primeira experiência." />
            <div className={`ds-app-preview ${appSidebarExpanded ? "is-menu-expanded" : "is-menu-collapsed"}`}>
              <aside className="ds-app-preview__sidebar" aria-label="Menu da aplicação demonstrativa">
              <div className="ds-app-preview__brand"><span><BrandAsset src="/brand/jobforged-symbol.svg" alt="" /><strong>JobForged</strong></span><button type="button" className="ds-app-preview__collapse" aria-label={appSidebarExpanded ? "Reduzir menu lateral" : "Expandir menu lateral"} aria-pressed={!appSidebarExpanded} onClick={() => setAppSidebarExpanded((expanded) => !expanded)}>{appSidebarExpanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}</button></div>
                <nav>{applicationMenu.map(({ label, icon: Icon }, index) => <button type="button" key={label} className={index === 1 ? "is-active" : ""}><Icon size={15} strokeWidth={1.8} /><span>{label}</span></button>)}</nav>
                <button type="button" className="ds-app-preview__profile" aria-label="Abrir meu perfil"><span><UserRound size={15} /></span><strong>Mateus</strong></button>
              </aside>

              <div className="ds-app-preview__main">
                <header className="ds-app-preview__topbar"><div><span>Dashboards / Visão geral</span><strong>Bom dia, Mateus 👋</strong><small>Acompanhe os resultados da sua operação de talentos.</small></div><div><button type="button" className="ds-app-preview__period"><CalendarDays size={14} />Últimos 30 dias</button><button type="button" className="ds-app-preview__notice" aria-label="Notificações"><Bell size={15} /><i /></button></div></header>

                <div className="ds-app-preview__kpis"><article><span><BriefcaseBusiness size={14} />Vagas ativas</span><strong>18</strong><small><TrendingUp size={12} />3 novas neste mês</small></article><article><span><UsersRound size={14} />Candidaturas</span><strong>1.284</strong><small><TrendingUp size={12} />18,4% no período</small></article><article><span><CalendarDays size={14} />Entrevistas</span><strong>96</strong><small>24 nesta semana</small></article><article><span><UserRoundCheck size={14} />Taxa de contratação</span><strong>12,8%</strong><small><TrendingUp size={12} />2,1 p.p.</small></article></div>

                <div className="ds-app-preview__analytics">
                  <article className="ds-app-panel ds-app-panel--funnel"><header><div><strong>Funil de recrutamento</strong><small>Conversão por etapa</small></div><button type="button"><MoreHorizontal size={14} /></button></header><div>{dashboardFunnel.map((stage) => <div key={stage.label}><span>{stage.label}</span><i style={{ "--funnel-width": `${stage.width}%` } as CSSProperties} /><strong>{stage.value}</strong></div>)}</div></article>
                  <article className="ds-app-panel ds-app-panel--weekly"><header><div><strong>Candidaturas</strong><small>Volume nas últimas 6 semanas</small></div><span>+18,4%</span></header><div className="ds-app-bars"><i style={{ "--bar": "36%" } as CSSProperties} /><i style={{ "--bar": "53%" } as CSSProperties} /><i style={{ "--bar": "47%" } as CSSProperties} /><i style={{ "--bar": "69%" } as CSSProperties} /><i style={{ "--bar": "62%" } as CSSProperties} /><i style={{ "--bar": "88%" } as CSSProperties} /></div><footer><span>S1</span><span>S2</span><span>S3</span><span>S4</span><span>S5</span><span>S6</span></footer></article>
                </div>

                <div className="ds-app-preview__bottom">
                  <article className="ds-app-panel ds-app-panel--vacancies"><header><div><strong>Vagas em destaque</strong><small>Maior volume de candidatos</small></div><button type="button">Ver todas</button></header><div><span>Product Designer</span><strong>142 candidatos</strong><i><b style={{ width: "92%" }} /></i><small>92% aderência média</small></div><div><span>Customer Success</span><strong>98 candidatos</strong><i><b style={{ width: "78%" }} /></i><small>87% aderência média</small></div><div><span>People Analyst</span><strong>76 candidatos</strong><i><b style={{ width: "66%" }} /></i><small>89% aderência média</small></div></article>
                  <article className="ds-app-panel ds-app-panel--activity"><header><div><strong>Atividade recente</strong><small>Atualizações do time</small></div></header><ul><li><span className="ds-avatar ds-avatar--teal">BS</span><p><strong>Beatriz Souza</strong> avançou para entrevista<small>Há 12 minutos</small></p></li><li><span className="ds-avatar ds-avatar--blue">AM</span><p><strong>André Martins</strong> enviou o teste técnico<small>Há 38 minutos</small></p></li><li><span className="ds-avatar ds-avatar--green">LR</span><p><strong>Larissa Rocha</strong> recebeu uma proposta<small>Há 1 hora</small></p></li></ul></article>
                </div>
              </div>
            </div>
          </section>

          <nav className="ds-pager" aria-label="Navegação entre páginas"><button type="button" onClick={() => changePage(activePage - 1)} disabled={activePage === 0}><ArrowLeft size={16} /><span>Anterior</span></button><div>{navigation.map((item, index) => <button key={item.id} type="button" className={activePage === index ? "is-active" : ""} onClick={() => changePage(index)} aria-label={`Abrir página ${index + 1}: ${item.label}`}>{index + 1}</button>)}</div><button type="button" onClick={() => changePage(activePage + 1)} disabled={activePage === navigation.length - 1}><span>Próxima</span><ArrowRight size={16} /></button></nav>
          </div>
        </div>
      </div>

      {activeAlert && <AppToast notice={activeAlert} onClose={() => setActiveAlert(null)} />}
    </main>
  );
}

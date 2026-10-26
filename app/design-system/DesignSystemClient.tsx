"use client";



import Link from "next/link";
import { WorkspaceShell } from "../components/ui/WorkspaceShell";
import { InlineBrandLoader } from "../components/InlineBrandLoader";
import { WidgetsIcon } from "../components/ui/Icons";
import { WidgetsSection } from "./WidgetsSection";
import { ApplicationStatesSection } from "./ApplicationStatesSection";
import { EmailTemplatesSection } from "./EmailTemplatesSection";
import { useThemePreference } from "@/app/components/ui";
import { BrandAsset } from "@/app/components/BrandAsset";
import { JobForgedLoadingAnimation } from "@/app/components/JobForgedLoadingAnimation";
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, Check, CircleAlert, CircleCheck, CircleX, Clock3, Copy, Download, FileText, Info, Layers3, LayoutDashboard, LockKeyhole, Mail, MoreHorizontal, MousePointerClick, Palette, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, Plus, Ruler, Search, Settings2, SlidersHorizontal, Sparkles, Type } from "lucide-react";
import { AdvancedCharts, BackgroundsSection, ButtonSpecs, EmptyStatesSection, IconLibrary } from "./DesignSystemAdditions";
import { CheckboxField, StatusBadge, ColorField, MultilineInput, AppToast, DateField, DateRangeField, FileUploadField, InlineNotice, MultiFileUploadField, MultiSelectField, Panel, PanelHeading, RadioField, DisplayValue, RichTextField, SelectField, TextField, ToggleSwitch, WorkspacePageHeader, createToastNotice, type ToastNotice, type DateRangeValue, type SelectOption, WorkspaceState, WorkspaceTabs, WorkspaceActionMenu, WidgetDialog, ActionButton } from "@/app/components/ui";
import { setStatusSoundEnabled, useStatusSoundPreference } from "@/app/components/ui/status-sound";
import { fontPairs } from "@/app/components/ui/font-pairs";
import { CommunicationsDemo } from './CommunicationsDemo';
import { BrandingDesignSystemDemo } from '../components/personalization/BrandingDesignSystemDemo';

type AlertKind = "success" | "info" | "warning" | "danger";

const navigation = [
  { id: "fundamentos", label: "Fundamentos", icon: BookOpen },
  { id: "marca", label: "Ativos da marca", icon: Sparkles },
  { id: "cores", label: "Cores", icon: Palette },
  { id: "tipografia", label: "Tipografia", icon: Type },
  { id: "botoes", label: "Botões", icon: MousePointerClick },
  { id: "formularios", label: "Formulários", icon: SlidersHorizontal },
  { id: "componentes", label: "Biblioteca", icon: Layers3 },
  { id: "widgets", label: "Widgets", icon: WidgetsIcon },
  { id: "fundos", label: "Background", icon: PanelsTopLeft },
  { id: "espacamento", label: "Espaçamento", icon: Ruler },
  { id: "empty-states", label: "Empty States", icon: FileText },
  { id: "dashboards", label: "Dashboards", icon: LayoutDashboard },
  { id: "emails", label: "E-mails", icon: Mail },
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


const colorTokens = [
  { name: "Turquesa JobForged", variable: "--jf-ui-brand", group: "brand", use: "Ações principais e progresso" },
  { name: "Azul JobForged", variable: "--jf-ui-accent", group: "brand", use: "Navegação e informação" },
  { name: "Fundo da página", variable: "--jf-ui-surface-soft", group: "foundation", use: "Base da página" },
  { name: "Superfície", variable: "--jf-ui-surface", group: "foundation", use: "Cards e containers" },
  { name: "Bordas e divisores", variable: "--jf-ui-border", group: "foundation", use: "Linhas e divisores" },
  { name: "Texto principal", variable: "--jf-ui-text", group: "foundation", use: "Texto de maior contraste" },
  { name: "Sucesso", variable: "--jf-ui-success", group: "feedback", use: "Conclusão positiva" },
  { name: "Atenção", variable: "--jf-ui-warning", group: "feedback", use: "Atenção necessária" },
  { name: "Erro", variable: "--jf-ui-danger", group: "feedback", use: "Erro ou bloqueio" },
  { name: "Informação", variable: "--jf-ui-accent", group: "feedback", use: "Observações e casos especiais" },
  { name: "Foco de controles", variable: "--jf-ui-focus", group: "interaction", use: "Borda e indicador de foco compartilhados" },
];

const animatedBrandAssets: Array<{ title: string; description: string; asset: string; reusable?: boolean; variant?: "primary" | "inverted" }> = [
  { title: "Carregamento JobForged", description: "Ícone central pulsante; mira turquesa em rotação suave de 1,5 segundo.", asset: "/brand/jobforged-loader-rotating.svg", reusable: true, variant: "primary" },
  { title: "Carregamento JobForged — cores invertidas", description: "Mira azul e personagem turquesa, com o mesmo movimento suave.", asset: "/brand/jobforged-loader-rotating-alternate.svg", reusable: true, variant: "inverted" },
  { title: "Animação principal", description: "Turquesa na mira e azul na pessoa.", asset: "/brand/jobforged-loader.svg" },
  { title: "Animação alternativa", description: "Azul na mira e turquesa na pessoa.", asset: "/brand/jobforged-loader-alternate.svg" },
];

const quickAlerts: Array<{ kind: AlertKind; label: string; title: string; text: string; sound: string }> = [
  { kind: "success", label: "Sucesso", title: "Alterações salvas", text: "As informações foram atualizadas com sucesso.", sound: "Som padrão de sucesso" },
  { kind: "info", label: "Informação", title: "Novo candidato", text: "Uma nova candidatura chegou para avaliação.", sound: "Som padrão de informação" },
  { kind: "warning", label: "Atenção", title: "Perfil incompleto", text: "Revise os critérios obrigatórios antes de avançar.", sound: "Som padrão de atenção" },
  { kind: "danger", label: "Erro", title: "Não foi possível concluir", text: "Tente novamente ou fale com o suporte.", sound: "Som padrão de erro" },
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
    logoPng: "/brand/jobforged-logo.png",
    symbol: "/brand/jobforged-symbol.svg",
    symbolPng: "/brand/jobforged-symbol-download.png",
  },
  {
    number: "02",
    title: "Assinatura alternativa",
    description: "Azul conduz a mira; turquesa destaca a pessoa e o nome Job.",
    logo: "/brand/jobforged-logo-alternate.svg",
    logoPng: "/brand/jobforged-logo-alternate-download.png",
    symbol: "/brand/jobforged-icon-alternate.svg",
    symbolPng: "/brand/jobforged-icon-alternate-download.png",
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

function subscribeToPalette(onChange: () => void) {
  const page = document.querySelector<HTMLElement>(".ds-page");
  if (!page) return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(page, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function PaletteColor({ token, copied, onCopy }: { token: (typeof colorTokens)[number]; copied: string | null; onCopy: (value: string, label: string) => void }) {
  const readValue = useCallback(() => {
    const page = document.querySelector<HTMLElement>(".ds-page");
    return page ? getComputedStyle(page).getPropertyValue(token.variable).trim() : "";
  }, [token.variable]);
  const value = useSyncExternalStore(subscribeToPalette, readValue, () => "");
  return <button type="button" className="ds-swatch" style={{"--swatch":`var(${token.variable})`} as CSSProperties} onClick={() => value && onCopy(value,token.name)} aria-label={`Copiar ${token.name}: ${value}`}>
    <span className="ds-swatch__color" aria-hidden="true"/>
    <span className="ds-swatch__body"><strong>{token.name}</strong><span>{token.use}</span><code>{token.variable}</code></span>
    <span className="ds-swatch__footer"><code>{value || "—"}</code><span>{copied===token.name?<><Check size={16}/>Copiado</>:<><Copy size={16}/>Copiar</>}</span></span>
  </button>;
}

function AlertIcon({ kind, size = 18 }: { kind: AlertKind; size?: number }) {
  if (kind === "success") return <CircleCheck size={size} aria-hidden="true" />;
  if (kind === "warning") return <CircleAlert size={size} aria-hidden="true" />;
  if (kind === "danger") return <CircleX size={size} aria-hidden="true" />;
  return <Info size={size} aria-hidden="true" />;
}

export default function DesignSystemClient({initialSection="fundamentos"}:{initialSection?:string}) {
  const { theme } = useThemePreference();
  const statusSoundEnabled = useStatusSoundPreference();
  const [workspaceState,setWorkspaceState] = useState<"loading"|"error"|"empty"|"forbidden">("loading");
  const [demoRange,setDemoRange] = useState(50);
  const [demoColor,setDemoColor] = useState("#20B2AA");
  const [demoRich,setDemoRich]=useState("");
  const [wideDialogOpen,setWideDialogOpen] = useState(false);
  const [nestedDialogOpen,setNestedDialogOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [activePage, setActivePage] = useState(() => Math.max(0,navigation.findIndex(item=>item.id===initialSection)));
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
    window.history.pushState(null, "", `/design-system/${navigation[index].id}`);
    document.querySelector(".admin-workspace")?.scrollTo({ top: 0, behavior: "auto" });
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
    setActiveAlert(createToastNotice({ kind: "success", title: "Conteúdo copiado", text: `${label} foi copiado para a área de transferência.` }));
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

  return (
    <WorkspaceShell fullLogo="/brand/jobforged-logo-primary.svg" logo="/brand/jobforged-symbol.svg" brand="JobForged" title="Design System" subtitle="Manual da marca" collapsed={!sidebarPinned} onCollapsedChange={value=>setSidebarPinned(!value)} items={navigation.map((item,index)=>({label:item.label,href:`/design-system/${item.id}`,icon:item.icon,active:activePage===index,onSelect:()=>changePage(index)}))} footer={<div className="ds-sidebar-return"><Link className="jf-action jf-action--secondary" href="/" aria-label="Voltar à LP" title="Voltar à LP"><ArrowLeft aria-hidden="true"/><span>Voltar à LP</span></Link></div>}>
      <div className="ds-page ds-page--workspace" data-theme={theme} suppressHydrationWarning>
      <a className="ds-skip-link" href="#painel-atual">Ir para o conteúdo</a>
      <div className="ds-content" id="painel-atual">
          <div className="ds-content__inner">
          <div className="ds-page-meta"><strong><span>{String(activePage + 1).padStart(2, "0")} -</span> {currentPage.label}</strong></div>

          <section className="ds-hero" hidden={currentPage.id !== "fundamentos"} aria-label="Fundamentos da marca">
            <div className="ds-hero__copy"><span className="ds-kicker">Identidade visual · v1.3</span><h1>Interfaces <em className="ds-highlight-pair"><span className="ds-highlight-blue">claras</span> <span className="ds-highlight-teal">e humanas.</span></em><br />Decisões mais inteligentes.</h1><p>O sistema visual da JobForged une precisão, proximidade e tecnologia. Esta base mantém o produto consistente em qualquer tela, nos temas claro e escuro.</p><div className="ds-hero__tags" aria-label="Princípios da marca"><span>Humano</span><span>Confiável</span><span>Objetivo</span><span>Adaptável</span></div></div>
            <div className="ds-hero__visual" aria-hidden="true"><div className="ds-orbit ds-orbit--one" /><div className="ds-orbit ds-orbit--two" /><div className="ds-hero__loader"><InlineBrandLoader /></div><span className="ds-visual-label ds-visual-label--one">Dados organizados</span><span className="ds-visual-label ds-visual-label--two">Entrevistas no WhatsApp</span><span className="ds-visual-label ds-visual-label--three">Triagem inteligente</span><span className="ds-visual-label ds-visual-label--four">Marca própria</span><span className="ds-visual-label ds-visual-label--five">Decisões seguras</span><span className="ds-visual-label ds-visual-label--six">Processos ágeis</span></div>
          </section>
          <section className="ds-llm-manual" hidden={currentPage.id !== "fundamentos"} aria-label="Manual da marca para LLM">
            <div><FileText size={22} aria-hidden="true"/><span><strong>Manual da marca para LLM</strong><small>Este documento será ampliado quando o Design System estiver concluído e servirá para transportar as regras visuais da JobForged entre ferramentas e modelos de linguagem.</small></span></div>
            <a className="jf-action jf-action--secondary" href="/manual-da-marca-jobforged-llm.md" download><Download size={16}/>Baixar documento para LLM</a>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "marca"} aria-label="Ativos da marca">
            <SectionHeading title="Arquivos oficiais, prontos para usar." description="Escolha a versão adequada e baixe o arquivo original sem alterar proporções ou cores." />
            <div className="ds-asset-section">
              <header><span>01</span><div><h3>Logos</h3><p>Assinaturas horizontais para cabeçalhos, documentos e comunicações.</p></div></header>
              <div className="ds-brand-families">
                {brandFamilies.map((family) => (
                  <article className="ds-brand-family" key={family.title}>
                    <header><span>{family.number}</span><div><strong>{family.title}</strong><p>{family.description}</p></div></header>
                    <div className="ds-brand-family__preview ds-brand-family__preview--logo"><div className="ds-brand-family__logo"><small>Logo horizontal</small><BrandAsset src={family.logo} alt={`${family.title} da JobForged`} /></div></div>
                    <footer><span>Arquivos oficiais</span><div><a href={family.logo} download className="ds-download-button"><Download size={15} />Logo SVG</a><a href={family.logoPng} download className="ds-download-button"><Download size={15} />Logo PNG</a></div></footer>
                  </article>
                ))}
              </div>
            </div>
            <div className="ds-asset-section">
              <header><span>02</span><div><h3>Ícones</h3><p>Símbolos compactos para favicons, menus, avatares e estados reduzidos.</p></div></header>
              <div className="ds-brand-icons">{brandFamilies.map((family) => <article key={family.symbol}><BrandAsset src={family.symbol} alt={`Ícone da ${family.title.toLowerCase()}`} /><span><strong>{family.title}</strong><small>SVG vetorial · PNG transparente</small></span><div className="ds-brand-icons__downloads"><a href={family.symbol} download className="ds-download-button"><Download size={15} />Ícone SVG</a><a href={family.symbolPng} download className="ds-download-button"><Download size={15} />Ícone PNG</a></div></article>)}</div>
            </div>
            <div className="ds-asset-section">
              <header><span>03</span><div><h3>Animações</h3><p>Assets de carregamento para transições, inicialização e processamento.</p></div></header>
              <div className="ds-animated-assets">{animatedBrandAssets.map((asset) => <article className="ds-animated-asset" key={asset.title}><div>{asset.reusable ? <JobForgedLoadingAnimation size={76} variant={asset.variant} /> : <BrandAsset src={asset.asset} alt={`${asset.title} da JobForged`} />}<span><strong>{asset.title}</strong><small>{asset.description}</small>{<code className="ds-animated-asset__example">{asset.reusable ? `<JobForgedLoadingAnimation size={112}${asset.variant === "inverted" ? ' variant="inverted"' : ""} />` : `<BrandAsset src="${asset.asset}" width={112} height={112} alt="Carregando" />`}</code>}</span></div><a href={asset.asset} download className="ds-download-button"><Download size={15} />Baixar SVG animado</a></article>)}</div>
            </div>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "cores"} aria-label="Cores da marca">
            <SectionHeading title="Paleta da JobForged" description="Escolha a cor pela sua função. As amostras e os valores acompanham o tema selecionado no cabeçalho." />
            <div className="ds-colors-mode"><span>Tema {theme === "dark" ? "escuro" : "claro"}</span><p>Clique em uma amostra para copiar seu valor.</p></div>
            <div className="ds-colors-catalog">
              {[
                {id:"brand",title:"Identidade da marca",description:"Turquesa para ações principais. Azul para informação e destaques complementares."},
                {id:"foundation",title:"Estrutura e leitura",description:"Fundo, superfície, bordas e texto formam as camadas da interface."},
                {id:"feedback",title:"Estados e mensagens",description:"Mantenha essas cores em todas as marcas. Combine-as com texto e ícones para comunicar o estado."},
                {id:"interaction",title:"Foco e interação",description:"Indica qual controle está selecionado ao navegar pelo teclado."},
              ].map((group,index)=><section className={`ds-color-family ds-color-family--${group.id}`} key={group.id} aria-labelledby={`color-${group.id}`}>
                <header><span>{String(index+1).padStart(2,"0")}</span><div><h3 id={`color-${group.id}`}>{group.title}</h3><p>{group.description}</p></div></header>
                <div className="ds-swatches">{colorTokens.filter(token=>token.group===group.id).map(token=><PaletteColor key={token.variable} token={token} copied={copied} onCopy={copyValue}/>)}</div>
              </section>)}
            </div>
            <aside className="ds-colors-note"><CircleAlert size={20} aria-hidden="true"/><p><strong>Antes de aplicar uma cor</strong>Verifique o contraste entre texto e fundo nos dois temas. Na personalização da empresa, altere as cores de marca e preserve os significados de sucesso, atenção e erro.</p></aside>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "tipografia"} aria-label="Tipografia">
            <SectionHeading title="Duas fontes, uma hierarquia fácil de reconhecer." description="Montserrat lidera; Open Sans sustenta a leitura. A combinação equilibra personalidade de marca e clareza em interfaces densas." />
            <div className="ds-type-families"><article className="ds-type-family ds-type-family--montserrat"><span>Aa</span><div><strong>Montserrat Variable</strong><em>Fonte primária</em><p>Títulos, navegação, botões, métricas e labels curtas. Use pesos de 600 a 780 para dar direção e presença.</p></div></article><article className="ds-type-family ds-type-family--opensans"><span>Aa</span><div><strong>Open Sans Variable</strong><em>Fonte secundária</em><p>Parágrafos, campos, tabelas, descrições e conteúdos longos. Use pesos de 400 a 650 para maximizar a leitura.</p></div></article></div>
            <div className="ds-type-scale"><div><span>Display · Montserrat 52/58</span><strong>Talentos que movem negócios.</strong></div><div><span>Heading · Montserrat 32/40</span><strong>Visão completa do processo.</strong></div><div><span>Body · Open Sans 15/24</span><p>Informação organizada para o RH decidir com mais segurança, contexto e agilidade.</p></div><div><span>Label · Montserrat 12/16</span><small>ETAPA ATUAL · ENTREVISTA</small></div></div>
            <BrandingDesignSystemDemo theme={theme}/><div className="ds-type-pairs"><header><h3>Pares de tipografia para empresas</h3><p>A identidade JobForged é a referência. As outras três combinações estão disponíveis para a identidade do painel empresarial e das prévias de vagas.</p></header><div className="ds-type-pairs__grid">{fontPairs.map((pair) => <article key={pair.id} className="ds-type-pair" style={{"--pair-heading":pair.heading,"--pair-body":pair.body} as CSSProperties}><span>{pair.label}</span><h4>Uma vaga que combina com você.</h4><p>Conheça a equipe, os desafios e as oportunidades de crescimento antes de se candidatar.</p><small>{pair.headingName} + {pair.bodyName}</small></article>)}</div></div>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "botoes"} aria-label="Botões">
            <SectionHeading title="Botões compactos, claros e consistentes." description="Cantos discretos e cores leves mantêm as ações acessíveis sem competir com o conteúdo." />
            <div className="ds-examples-grid">
              <ExampleCard title="Principais · com e sem ícone"><div className="ds-button-row"><button type="button" className="jf-action jf-action--primary"><Plus size={16} />Nova vaga</button><button type="button" className="jf-action jf-action--accent">Ver candidatos</button></div><p className="ds-component-spec">Use ícone quando ele acelerar o reconhecimento da ação.</p></ExampleCard>
              <ExampleCard title="Transparentes · com e sem ícone"><div className="ds-button-row"><button type="button" className="jf-action jf-action--secondary"><Sparkles size={16} />Editar processo</button><button type="button" className="jf-action jf-action--quiet">Cancelar</button><button type="button" className="ds-icon-button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></div><p className="ds-component-spec">Outline para ações secundárias; ghost para baixa ênfase; somente ícone em ações reconhecíveis, sempre com nome acessível.</p></ExampleCard>
              <ExampleCard title="Ações de risco e fundos escuros"><div className="ds-button-row"><button type="button" className="jf-action jf-action--danger">Excluir</button><span style={{background:"var(--jf-ui-night)",padding:12,borderRadius:"var(--jf-ui-control-radius)"}}><button type="button" className="jf-action jf-action--inverse">Falar com a equipe</button></span></div><p className="ds-component-spec">Mesmas variantes compartilhadas com o painel e a Landing Page.</p><div style={{background:"var(--jf-ui-fixed-dark)",padding:16,borderRadius:"var(--jf-ui-control-radius)"}}><button type="button" className="jf-action jf-action--on-dark">Solicitar demonstração</button></div><p className="ds-component-spec">Fundo escuro fixo: contraste preservado nos dois temas.</p></ExampleCard>
              <ExampleCard title="Botão de menu"><div className="ds-menu-button-showcase"><button type="button" className="ds-menu-button-demo" aria-label={sidebarPinned ? "Reduzir menu" : "Expandir menu"} onClick={() => setSidebarPinned((pinned) => !pinned)}>{sidebarPinned ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}</button><span><strong>{sidebarPinned ? "Reduzir menu lateral" : "Expandir menu lateral"}</strong><small>40 × 40 px · alterna entre navegação completa e compacta com ícones.</small></span></div></ExampleCard>
              <ExampleCard title="Navegação do cabeçalho"><div className="ds-header-link-showcase"><button type="button" className="ds-header-link-demo">Como funciona</button><span><strong>Link de navegação</strong><small>Texto com mudança de cor e linha inferior no hover.</small></span></div></ExampleCard>
              <ExampleCard title="Tamanhos"><div className="ds-size-showcase"><div><span>Preenchido</span><div className="ds-button-row ds-button-row--sizes"><button type="button" className="jf-action jf-action--primary jf-action--small">Pequeno</button><button type="button" className="jf-action jf-action--primary">Padrão</button><button type="button" className="jf-action jf-action--primary jf-action--large">Grande</button></div></div><div><span>Contornado</span><div className="ds-button-row ds-button-row--sizes"><button type="button" className="jf-action jf-action--secondary jf-action--small">Pequeno</button><button type="button" className="jf-action jf-action--secondary">Padrão</button><button type="button" className="jf-action jf-action--secondary jf-action--large">Grande</button></div></div><div><span>Transparente</span><div className="ds-button-row ds-button-row--sizes"><button type="button" className="jf-action jf-action--quiet jf-action--small">Pequeno</button><button type="button" className="jf-action jf-action--quiet">Padrão</button><button type="button" className="jf-action jf-action--quiet jf-action--large">Grande</button></div></div></div></ExampleCard>
              <ExampleCard title="Estados"><div className="ds-button-states"><div><button type="button" className="jf-action jf-action--primary">Salvar</button><span><strong>Padrão</strong><small>Pronto para interação</small></span></div><div><button type="button" className="jf-action jf-action--primary is-hover">Salvar</button><span><strong>Hover</strong><small>Elevação e contraste suave</small></span></div><div><button type="button" className="jf-action jf-action--primary is-focus">Salvar</button><span><strong>Focus</strong><small>Contorno visível pelo teclado</small></span></div><div><button type="button" className="jf-action jf-action--primary" disabled>Salvar</button><span><strong>Desabilitado</strong><small>Ação temporariamente indisponível</small></span></div></div></ExampleCard>
            </div>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "formularios"} aria-label="Formulários">
            <SectionHeading title="Controles limpos, previsíveis e prontos para o produto." description="Todo campo vazio orienta o próximo passo. Todo valor ausente comunica seu estado." />
            <div className="ds-form-showcase ds-placeholder-guidance" aria-label="Regra global de placeholders e valores">
              <ExampleCard title="Placeholder · curto e direto"><div className="ds-modern-stack"><p><strong>Verbo + dado + ...</strong><br/>Use 2–4 palavras. Prefira até 28 caracteres.</p><TextField label="Nome"/><TextField label="E-mail" type="email"/><p>Label sempre visível. Formatos e requisitos ficam na ajuda.</p></div></ExampleCard>
              <ExampleCard title="Valores · mostre o estado"><div className="ds-modern-stack"><p>Campo vazio orienta. Valor ausente informa.</p><dl className="ds-value-examples"><div><dt>Sem dado</dt><dd><DisplayValue value={null}/></dd></div><div><dt>Em carregamento</dt><dd><DisplayValue value={null} state="loading"/></dd></div><div><dt>Indisponível</dt><dd><DisplayValue value={null} state="unavailable"/></dd></div><div><dt>Zero real</dt><dd><DisplayValue value={0}/></dd></div></dl><p>Não preencha com dados fictícios.</p></div></ExampleCard>
            </div>
            <div className="ds-form-showcase ds-placeholder-guidance" aria-label="Campos obrigatórios">
              <ExampleCard title="Preenchimento obrigatório" className="ds-form-card--wide"><div className="ds-modern-stack"><p>O asterisco vermelho em negrito junto ao título indica um campo obrigatório. Campos sem asterisco são opcionais.</p><p>Mantenha a indicação no título, nunca no placeholder. Informe o que falta na validação.</p><div className="ds-modern-field-grid"><TextField label="Nome completo" required/><TextField label="Complemento"/><MultilineInput label="Motivo" required rows={3}/></div></div></ExampleCard>
            </div>
            <div className="ds-form-showcase">
              <ExampleCard title="Inputs essenciais" className="ds-example-card--form ds-form-card--wide">
                <div className="ds-modern-field-grid">
                  <TextField label="Nome da vaga" required icon={BriefcaseBusiness} placeholder="Ex.: Analista de Customer Success" defaultValue="Analista de Customer Success" helpText="Use um título reconhecido pelo mercado." />
                  <TextField label="Foco compartilhado" className="is-focus-demo" icon={Check} defaultValue="Token único · tema atual" readOnly helpText="Usa --jf-ui-focus, o mesmo token dos formulários do app." />
                  <TextField label="E-mail do responsável" icon={Mail} type="email" placeholder="nome@empresa.com" helpText="Usado apenas nas comunicações sobre a vaga." />
                  <TextField label="Buscar candidato" icon={Search} type="search" placeholder="Nome, e-mail ou competência" helpText="Pesquise por dados ou competências do perfil." />
                  <TextField label="Senha de acesso" icon={LockKeyhole} type="password" placeholder="Digite ao menos 8 caracteres" defaultValue="12345" error="A senha precisa ter pelo menos 8 caracteres." />
                  <TextField label="Desabilitado" labelAdornment={<StatusBadge>Em breve</StatusBadge>} icon={LockKeyhole} defaultValue="Indisponível" disabled helpText="Estado inativo do mesmo componente compartilhado." />
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
              <ExampleCard title="Range Input · controle de faixa"><TextField label={`Intensidade: ${demoRange}%`} type="range" min={0} max={100} step={1} value={demoRange} onChange={e=>setDemoRange(Number(e.target.value))} helpText="Arraste ou use as setas para ajustar o valor."/></ExampleCard>
              <ExampleCard title="Color Input · HEX e picker"><ColorField label="Cor principal" value={demoColor} previous="#20B2AA" onChange={setDemoColor}/></ExampleCard>
              <ExampleCard title="Multiline Input · texto multilinha">
                <MultilineInput label="Apresentação" placeholder="Escreva a apresentação..." rows={4}/>
              </ExampleCard>
              <ExampleCard title="Rich Text · parâmetros no texto">
                <RichTextField textOnly label="Descrição da vaga" placeholder="Escreva a descrição..." value={demoRich} onChange={setDemoRich}/>
              </ExampleCard>
            </div>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "componentes"} aria-label="Biblioteca">
            <SectionHeading title="Peças pequenas que formam experiências completas." description="Combine status, pessoas e notificações com o mesmo vocabulário visual em todo o produto." />
            <div className="ds-components-grid">
              <ExampleCard title="Estrutura das páginas internas"><div className="ds-workspace-example"><WorkspacePageHeader section="Painel / Organização" title="Dados da empresa" description="Ações e informações seguem o mesmo padrão em todas as áreas."/><Panel><PanelHeading title="Identificação da empresa" description="Título e contexto do módulo"/><div className="jf-panel-body"><InlineNotice>Alterações da organização aparecem neste espaço.</InlineNotice></div></Panel></div></ExampleCard>
              <ExampleCard title="Status e pessoas"><div className="ds-status-people"><div><h3>Status</h3><div className="ds-badge-list"><span className="ds-badge ds-badge--success"><CircleCheck size={14} />Aprovado</span><span className="ds-badge ds-badge--warning"><Clock3 size={14} />Em avaliação</span><span className="ds-badge ds-badge--danger"><CircleX size={14} />Não selecionado</span><span className="ds-badge ds-badge--info"><CircleAlert size={14} />Novo</span></div></div><div><h3>Pessoas</h3><div className="ds-person-list"><div className="ds-person"><span className="ds-avatar ds-avatar--teal">BS</span><div><strong>Beatriz Souza</strong><small>Product Designer</small></div><button type="button" className="ds-icon-button ds-icon-button--subtle ds-person__settings" aria-label="Configurações de Beatriz Souza"><Settings2 size={17} /></button></div><div className="ds-person"><span className="ds-avatar ds-avatar--blue">AM</span><div><strong>André Martins</strong><small>Customer Success</small></div><button type="button" className="ds-icon-button ds-icon-button--subtle" aria-label="Opções de André Martins"><MoreHorizontal size={17} /></button></div></div></div></div></ExampleCard>
              <ExampleCard title="Notificação do aplicativo"><p className="ds-example-hint">Esta demonstração usa os quatro sons padrão nas notificações de autenticação, empresa, vagas e backoffice.</p><div className="ds-alert-actions">{quickAlerts.map(({sound,...alert}) => <button key={alert.kind} type="button" className={`ds-alert-trigger ds-alert-trigger--${alert.kind}`} title={sound} aria-label={`${alert.label}: ${sound}`} onClick={() => setActiveAlert(createToastNotice(alert))}><AlertIcon kind={alert.kind} size={16} />{alert.label}</button>)}</div><ToggleSwitch label="Som dos alertas" description="Ative ou silencie os sons de status neste navegador." checked={statusSoundEnabled} onCheckedChange={setStatusSoundEnabled} /><small className="ds-example-hint">Clique em um status para ver o popup e ouvir o som associado.</small></ExampleCard>
              <ExampleCard title="Navegação e estados do painel" className="ds-workspace-patterns"><div className="jf-workspace-stack"><WorkspaceTabs label="Estados da demonstração" value={workspaceState} onValueChange={setWorkspaceState} items={[{id:"loading",label:"Carregando"},{id:"empty",label:"Vazio"},{id:"error",label:"Erro"},{id:"forbidden",label:"Sem permissão"}]}/><WorkspaceState kind={workspaceState} title={workspaceState==="loading"?"Carregando informações…":workspaceState==="empty"?"Nenhum registro encontrado":workspaceState==="error"?"Não foi possível carregar os dados":"Acesso indisponível"} description={workspaceState==="forbidden"?"Sua conta não tem permissão para acessar este conteúdo.":"O mesmo componente é utilizado no painel empresarial e no backoffice."}/><div className="ds-button-row ds-workspace-demo-actions"><ActionButton variant="secondary" onClick={()=>setWideDialogOpen(true)}>Abrir janela ampla</ActionButton><WorkspaceActionMenu label="Ações da demonstração"><ActionButton variant="quiet" onClick={()=>setWideDialogOpen(true)}>Abrir detalhes</ActionButton><ActionButton variant="quiet" onClick={()=>setWorkspaceState("empty")}>Ver estado vazio</ActionButton></WorkspaceActionMenu></div></div></ExampleCard>
            </div>
            <WidgetDialog open={wideDialogOpen} onClose={()=>setWideDialogOpen(false)} title="Janela ampla" description="Pré-visualizações, histórico e comparações usam a mesma estrutura." size="wide" footer={<ActionButton variant="secondary" onClick={()=>setWideDialogOpen(false)}>Fechar demonstração</ActionButton>}><div className="jf-workspace-grid"><Panel><PanelHeading title="Conteúdo principal"/><div className="jf-panel-body"><TextField label="Título" defaultValue="Prévia da oportunidade"/></div></Panel><Panel><PanelHeading title="Informações relacionadas"/><div className="jf-panel-body"><InlineNotice>A janela mantém o foco e a rolagem no próprio conteúdo.</InlineNotice><ActionButton variant="secondary" onClick={()=>setNestedDialogOpen(true)}>Abrir confirmação</ActionButton></div></Panel></div></WidgetDialog>
            <WidgetDialog open={nestedDialogOpen} onClose={()=>setNestedDialogOpen(false)} title="Confirmar exemplo" description="Esta confirmação usa a mesma janela compartilhada." footer={<ActionButton variant="secondary" onClick={()=>setNestedDialogOpen(false)}>Voltar à janela ampla</ActionButton>}><p>Ao fechar as duas janelas, a rolagem da página volta ao normal.</p></WidgetDialog>
            <IconLibrary/>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "fundos"} aria-label="Background"><BackgroundsSection/></section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "espacamento"} aria-label="Espaçamento">
            <SectionHeading title="Espaço também comunica hierarquia." description="A interface deve respirar. Margens, gutters e intervalos consistentes separam contextos, reduzem a sensação de sufoco e ajudam cada informação a ocupar o espaço certo." />
            <div className="ds-spacing-principle"><div><span>Princípio prioritário</span><h3>Organizar sem comprimir.</h3><p>Proximidade indica relação; distância indica mudança de assunto. Nunca compense excesso de conteúdo diminuindo indiscriminadamente os espaços. Reorganize, agrupe e priorize.</p></div><div className="ds-spacing-breath" aria-label="Comparação entre conteúdo comprimido e conteúdo com respiro"><article className="is-tight"><span/><span/><span/><span/></article><i>→</i><article className="is-correct"><span/><span/><span/><span/></article></div></div>
            <div className="ds-spacing-scale" aria-label="Escala oficial de espaçamento">{spacingScale.map(({token,value,label})=><article key={token}><span style={{"--space":`var(${token})`} as CSSProperties}/><strong>{value} px</strong><small>{label}</small><code>{token}</code></article>)}</div>
            <div className="ds-spacing-context"><h3>Composição de widgets</h3><p>Em coleções de cartões, use 8 px entre detalhes próximos, 16 px entre controles, 24 px dentro de grupos e 32 px entre assuntos. Divisórias separam contextos; espaço em branco conecta elementos do mesmo grupo.</p><div>{[8,16,24,32].map(value=><span key={value}><i style={{width:value}}/>{value} px</span>)}</div></div>
            <div className="ds-spacing-context"><h3>Dimensões dos botões</h3><p>Altura, espaçamento interno e distância entre ícone e texto seguem a escala de cada tamanho.</p><ButtonSpecs/></div>
            <div className="ds-layout-rules">
              <article className="ds-layout-anatomy"><header><span>Envelope principal</span><strong>Desktop como referência</strong></header><div className="ds-layout-canvas"><i className="is-gutter-left"/><div><span>Conteúdo até 1180 px</span><b>Área útil ampla, centralizada e protegida por gutters.</b><small>Em monitores maiores, o espaço externo cresce igualmente dos dois lados.</small></div><i className="is-gutter-right"/></div><footer><span>Viewport</span><i/><strong>gutter</strong><i/><b>conteúdo</b></footer></article>
              <article className="ds-layout-table"><header><span>Limites por contexto</span><strong>Largura não é densidade</strong></header><div><span>Página pública / Landing</span><b>1180 px</b><small>Conteúdo comercial e institucional</small></div><div><span>Autenticação e adesão</span><b>1180 px</b><small>Formulário + contexto lado a lado</small></div><div><span>Documentos legais</span><b>1180 px</b><small>Envelope amplo; leitura interna até 900 px</small></div><div><span>Aplicação administrativa</span><b>Fluido</b><small>Limitado conforme densidade do módulo</small></div></article>
            </div>
            <div className="ds-responsive-spacing"><header><span>Responsividade</span><strong>O conteúdo se adapta; o gutter nunca desaparece.</strong></header><div><article><b>Desktop</b><strong>≥ 1180 px</strong><span>Conteúdo máximo de 1180 px</span><span>Gutter mínimo de 24 px</span><span>Seções: 64–112 px</span></article><article><b>Tablet</b><strong>681–1179 px</strong><span>Envelope fluido</span><span>Gutter de 24 px</span><span>Grids reorganizados</span></article><article><b>Mobile</b><strong>330–680 px</strong><span>Envelope fluido</span><span>Gutter mínimo de 16 px</span><span>Cards com 16–24 px internos</span></article></div></div>
            <div className="ds-spacing-guidance"><article className="is-do"><span><Check/> Faça</span><ul><li>Separe seções antes de adicionar bordas.</li><li>Use 24–32 px dentro de containers principais.</li><li>Mantenha alinhamento vertical entre blocos relacionados.</li><li>Reduza colunas antes de reduzir o espaço interno.</li></ul></article><article className="is-avoid"><span><CircleX/> Evite</span><ul><li>Conteúdo encostado na borda do viewport.</li><li>Cards dentro de cards sem necessidade.</li><li>Intervalos diferentes para relações equivalentes.</li><li>Comprimir formulários para ocupar menos altura.</li></ul></article></div>
          </section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "empty-states"} aria-label="Empty States"><EmptyStatesSection/></section>

          <section className="ds-section ds-section--first" hidden={currentPage.id !== "dashboards"} aria-label="Dashboards">
            <SectionHeading title="Elementos para dashboards." description="Referências visuais reutilizáveis para indicadores e gráficos da aplicação." />
            <CommunicationsDemo/><div className="ds-dashboard-catalog">
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

          {currentPage.id === "emails" && <EmailTemplatesSection />}
          {currentPage.id === "aplicacao" && <ApplicationStatesSection />}

          {currentPage.id === "widgets" && <WidgetsSection />}

          <nav className="ds-pager" aria-label="Navegação entre páginas"><button type="button" onClick={() => changePage(activePage - 1)} disabled={currentPage.id === "fundamentos"}><ArrowLeft size={16} /><span>Anterior</span></button><div>{navigation.map((item, index) => <button key={item.id} type="button" className={activePage === index ? "is-active" : ""} onClick={() => changePage(index)} aria-label={`Abrir página ${index + 1}: ${item.label}`}>{index + 1}</button>)}</div><button type="button" onClick={() => changePage(activePage + 1)} disabled={activePage === navigation.length - 1}><span>Próxima</span><ArrowRight size={16} /></button></nav>
          </div>
        </div>
      </div>

      {activeAlert && <AppToast notice={activeAlert} onClose={() => setActiveAlert(null)} />}
    </WorkspaceShell>
  );
}

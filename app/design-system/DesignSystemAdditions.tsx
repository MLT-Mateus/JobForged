"use client";

import { useMemo, useState, type CSSProperties, type ComponentType } from "react";
import {
  Activity, AppWindow, Archive, ArrowDownToLine, AtSign, BadgeCheck, BarChart3, Bell, Bot, BriefcaseBusiness,
  Building2, CalendarDays, Camera, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight, CircleDollarSign,
  ClipboardCheck, Clock3, CloudUpload, Columns3, Contact, Copy, CreditCard, Database, Download, Eye, FileCheck2,
  FileSearch, FileText, Filter, Flag, FolderKanban, Funnel, Gauge, Globe2, GraduationCap, Handshake,
  HardDriveUpload, House, Image, KeyRound, Laptop, Link2, ListChecks, LockKeyhole, Mail, MapPin, MessageCircle,
  Monitor, Moon, Palette, PanelLeft, PencilRuler, Phone, PieChart, Search, Settings2, ShieldCheck, Smartphone,
  Sparkles, Sun, Target, Type, Upload, UserCog, UserRound, UserRoundCheck, UsersRound, Video, WandSparkles,
} from "lucide-react";
import { SelectField, TextField, type SelectOption } from "@/app/components/ui";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;

export const iconCatalog: Array<{ id: string; name: string; category: string; meaning: string; example: string; icon: IconType }> = [
  ["home","Home","Navegação","Página inicial","Menu principal",House],
  ["dashboard","Dashboard","Dados","Visão analítica","Indicadores",BarChart3],
  ["empresa","Empresa","Organização","Empresa cliente","Cadastro",Building2],
  ["organizacao","Organização","Organização","Contexto ativo","Seletor de organização",Globe2],
  ["usuarios","Usuários","Pessoas","Grupo de pessoas","Equipe",UsersRound],
  ["administrador","Administrador","Pessoas","Gestão administrativa","Administradores",UserCog],
  ["recrutador","Recrutador","Pessoas","Responsável por seleção","Responsável da vaga",Contact],
  ["avaliador","Avaliador","Pessoas","Pessoa avaliadora","Banca de avaliação",UserRoundCheck],
  ["candidato","Candidato","Pessoas","Perfil candidato","Candidatura",UserRound],
  ["permissoes","Permissões","Segurança","Controle de acesso","Papéis",KeyRound],
  ["seguranca","Segurança","Segurança","Proteção de dados","Configurações",ShieldCheck],
  ["bloqueio","Bloqueio","Segurança","Conteúdo restrito","Sem permissão",LockKeyhole],
  ["vaga","Vaga","Recrutamento","Oportunidade de trabalho","Listagem de vagas",BriefcaseBusiness],
  ["curriculo","Currículo","Documentos","Documento profissional","Perfil do candidato",FileSearch],
  ["documento","Documento","Documentos","Arquivo de texto","Anexos",FileText],
  ["documento-validado","Documento validado","Documentos","Arquivo aprovado","Compliance",FileCheck2],
  ["candidatura","Candidatura","Recrutamento","Inscrição recebida","Funil",ClipboardCheck],
  ["kanban","Kanban","Recrutamento","Quadro por etapas","Candidaturas",FolderKanban],
  ["pipeline","Pipeline","Recrutamento","Fluxo de etapas","Processo seletivo",Columns3],
  ["filtro","Filtro","Ações","Restringir resultados","Listas",Filter],
  ["pesquisa","Pesquisa","Ações","Encontrar conteúdo","Busca global",Search],
  ["calendario","Calendário","Agenda","Data ou compromisso","Agenda",CalendarDays],
  ["horario","Horário","Agenda","Tempo e prazo","Entrevistas",Clock3],
  ["entrevista","Entrevista","Agenda","Conversa avaliativa","Agenda",MessageCircle],
  ["videochamada","Videochamada","Comunicação","Reunião remota","Entrevista",Video],
  ["email","E-mail","Comunicação","Mensagem por e-mail","Contato",Mail],
  ["mensagem","Mensagens","Comunicação","Conversa","Candidato",AtSign],
  ["whatsapp","Comunicação","Comunicação","Canal instantâneo","Notificações",Phone],
  ["localizacao","Localização","Contexto","Lugar ou endereço","Vaga",MapPin],
  ["link","Link","Ações","Destino externo","Compartilhamento",Link2],
  ["upload","Upload","Arquivos","Enviar arquivo","Currículo",Upload],
  ["upload-nuvem","Upload em nuvem","Arquivos","Envio em progresso","Uploader",CloudUpload],
  ["download","Download","Arquivos","Baixar arquivo","Exportação",Download],
  ["imagem","Imagem","Arquivos","Arquivo visual","Personalização",Image],
  ["identidade","Identidade visual","Personalização","Ativos da marca","Marca",BadgeCheck],
  ["paleta","Paleta de cores","Personalização","Cores da organização","Tema",Palette],
  ["personalizacao","Personalização","Personalização","Ajustes de marca","Menu",WandSparkles],
  ["background","Background","Personalização","Fundo visual","Tema",PanelLeft],
  ["preview","Pré-visualização","Personalização","Ver antes de publicar","Editor",Eye],
  ["desktop","Desktop","Dispositivos","Tela grande","Prévia",Monitor],
  ["notebook","Notebook","Dispositivos","Tela intermediária","Prévia",Laptop],
  ["celular","Celular","Dispositivos","Tela pequena","Prévia",Smartphone],
  ["tema-claro","Tema claro","Tema","Aparência clara","Alternador",Sun],
  ["tema-escuro","Tema escuro","Tema","Aparência escura","Alternador",Moon],
  ["grafico","Gráfico","Dados","Série analítica","Dashboard",ChartNoAxesCombined],
  ["pizza","Distribuição","Dados","Participação no total","Dashboard",PieChart],
  ["funil","Funil","Dados","Conversão por etapa","Recrutamento",Funnel],
  ["indicador","Indicador","Dados","Métrica monitorada","KPI",Gauge],
  ["meta","Meta","Dados","Objetivo definido","Desempenho",Target],
  ["ia","Inteligência artificial","Tecnologia","Recurso assistido","Triagem",Bot],
  ["automacao","Automações","Tecnologia","Ação automática","Regras",Sparkles],
  ["configuracoes","Configurações","Ações","Preferências do sistema","Menu",Settings2],
  ["notificacoes","Notificações","Comunicação","Novo evento","Cabeçalho",Bell],
  ["financeiro","Financeiro","Financeiro","Valores e cobranças","Módulo",CircleDollarSign],
  ["pagamento","Pagamento","Financeiro","Cartão ou cobrança","Faturas",CreditCard],
  ["contrato","Contrato","Documentos","Acordo formal","Financeiro",Handshake],
  ["formacao","Formação","Pessoas","Escolaridade","Perfil",GraduationCap],
  ["meta-sinalizador","Sinalizador","Ações","Prioridade ou marco","Vagas",Flag],
  ["arquivo","Arquivo","Arquivos","Conteúdo arquivado","Gestão",Archive],
  ["atividade","Atividade","Dados","Evento recente","Histórico",Activity],
].map(([id,name,category,meaning,example,icon]) => ({ id, name, category, meaning, example, icon })) as never;

export function IconLibrary() {
  const [query,setQuery]=useState(""); const [category,setCategory]=useState("Todos"); const [page,setPage]=useState(1);
  const categories=["Todos",...Array.from(new Set(iconCatalog.map(x=>x.category)))];
  const categoryOptions:SelectOption[]=categories.map(value=>({value,label:value}));
  const filtered=useMemo(()=>iconCatalog.filter(x=>(category==="Todos"||x.category===category)&&`${x.name} ${x.id} ${x.meaning}`.toLowerCase().includes(query.toLowerCase())),[query,category]);
  const pageSize=20; const pages=Math.max(1,Math.ceil(filtered.length/pageSize)); const visible=filtered.slice((Math.min(page,pages)-1)*pageSize,Math.min(page,pages)*pageSize);
  const updateQuery=(value:string)=>{setQuery(value);setPage(1)}; const updateCategory=(value:string)=>{setCategory(value);setPage(1)};
  return <div className="ds-icon-library">
    <div className="ds-icon-library__heading"><div><strong>Biblioteca de ícones</strong><span>60 símbolos SVG distintos, auditados por significado</span></div><code>16 / 20 / 24 px · stroke 1.8 · currentColor</code></div>
    <div className="ds-icon-tools"><TextField className="ds-icon-filter-field" label="Pesquisar ícones" icon={Search} type="search" value={query} onChange={e=>updateQuery(e.target.value)} placeholder="Pesquisar por nome ou uso"/><SelectField className="ds-icon-filter-field" label="Categoria" value={category} options={categoryOptions} onValueChange={updateCategory}/><strong>{filtered.length} resultado{filtered.length===1?"":"s"}</strong></div>
    {visible.length?<div className="ds-icon-grid ds-icon-grid--documented">{visible.map(({id,name,icon:Icon})=><article key={id}><span className="ds-icon-preview"><Icon size={24} strokeWidth={1.8} aria-hidden={true}/></span><div><strong>{name}</strong><code>{id}</code></div></article>)}</div>:<div className="ds-icon-empty"><Search size={28}/><strong>Nenhum ícone encontrado</strong><span>Revise a busca ou escolha outra categoria.</span><button onClick={()=>{updateQuery("");updateCategory("Todos")}}>Limpar filtros</button></div>}
    <nav className="ds-icon-pagination" aria-label="Paginação da biblioteca de ícones"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={15}/>Anterior</button><div>{Array.from({length:pages},(_,i)=>i+1).map(n=><button aria-current={page===n?"page":undefined} className={page===n?"is-active":""} onClick={()=>setPage(n)} key={n}>{n}</button>)}</div><button disabled={page===pages} onClick={()=>setPage(p=>p+1)}>Próxima<ChevronRight size={15}/></button></nav>
  </div>;
}

const emptyStates=[
  {id:"jobs",icon:BriefcaseBusiness,title:"Nenhuma vaga criada ainda",text:"Crie a primeira vaga da sua organização para começar a receber candidaturas.",action:"Criar primeira vaga",use:"Primeiro uso do módulo Vagas.",avoid:"Quando filtros ocultam vagas existentes."},
  {id:"applications",icon:UserRoundCheck,title:"Ainda não recebemos candidaturas",text:"Quando alguém se candidatar a esta vaga, o perfil aparecerá aqui.",action:"Adicionar primeira candidatura",use:"Vaga publicada sem candidaturas.",avoid:"Quando houve erro ao carregar dados."},
  {id:"calendar",icon:CalendarDays,title:"Sua agenda está livre",text:"As entrevistas e compromissos do processo seletivo aparecerão neste espaço.",action:"Agendar primeira entrevista",use:"Agenda válida, sem eventos.",avoid:"Em períodos filtrados incorretamente."},
  {id:"admins",icon:UsersRound,title:"Sua equipe administrativa ainda está vazia",text:"Convide outros profissionais para colaborar nos processos seletivos da organização.",action:"Convidar primeiro administrador",use:"Somente o titular está cadastrado.",avoid:"Para acesso negado por permissão."},
  {id:"results",icon:Search,title:"Nenhum resultado corresponde aos filtros",text:"Revise os termos pesquisados ou inicie um novo cadastro para alimentar esta área.",action:"Adicionar primeiro registro",use:"Pesquisa concluída sem correspondência e coleção vazia.",avoid:"Quando existem dados ocultos apenas pelos filtros."},
  {id:"activity",icon:Bell,title:"Nenhuma atividade recente",text:"Novas publicações, candidaturas e atualizações aparecerão aqui.",action:"",use:"Histórico válido, ainda sem eventos.",avoid:"Quando o histórico ainda está carregando."},
];

export function EmptyStatesSection(){const [compact,setCompact]=useState(false);return <><div className="ds-section-heading"><h2>Empty States com contexto e próximo passo.</h2><p>Use apenas quando os dados foram carregados com sucesso e não há conteúdo a apresentar.</p></div><div className="ds-empty-toolbar"><span>Variação da demonstração</span><button className={!compact?"is-active":""} onClick={()=>setCompact(false)}>Completa</button><button className={compact?"is-active":""} onClick={()=>setCompact(true)}>Compacta</button></div><div className={`ds-empty-grid ${compact?"is-compact":""}`}>{emptyStates.map(({id,icon:Icon,title,text,action,use,avoid})=><article className="ds-empty-card" key={id}><div className="ds-empty-visual" aria-hidden="true"><i/><Icon size={compact?24:34}/></div><strong>{title}</strong><p>{text}</p>{action&&<button type="button" className="ds-button ds-button--primary">{action}</button>}<footer><span><Check size={13}/> Use: {use}</span><span>Evite: {avoid}</span></footer></article>)}</div></>}

const backgrounds=[
  {name:"Base da aplicação",category:"Cor sólida",className:"is-solid",tokens:"var(--ds-bg)",themes:"Claro + escuro",goal:"Sustentar páginas extensas sem competir com o conteúdo.",apply:"Painel, formulários e páginas de gestão.",avoid:"Como destaque de ação.",page:"Todas as páginas administrativas",css:"background: var(--ds-bg);"},
  {name:"Superfície elevada",category:"Cor sólida",className:"is-surface",tokens:"var(--ds-surface-raised)",themes:"Claro + escuro",goal:"Separar conteúdo temporário da base.",apply:"Modais, menus e notificações.",avoid:"Em todas as áreas da página.",page:"Alertas do Design System",css:"background: var(--ds-surface-raised);"},
  {name:"Halo da marca",category:"Degradê radial",className:"is-halo",tokens:"--ds-brand-soft + --ds-accent-soft",themes:"Claro + escuro",goal:"Criar foco suave em áreas institucionais.",apply:"Hero e prévias de marca.",avoid:"Atrás de tabelas ou texto denso.",page:"Fundamentos",css:"background: radial-gradient(circle at 70% 30%, var(--ds-accent-soft), transparent 52%);"},
  {name:"Transição JobForged",category:"Degradê linear",className:"is-gradient",tokens:"--ds-brand + --ds-accent",themes:"Claro + escuro",goal:"Conectar as duas cores da identidade.",apply:"Banners e indicadores especiais.",avoid:"Como fundo geral do painel.",page:"Banners da Home",css:"background: linear-gradient(135deg, var(--ds-brand), var(--ds-accent));"},
  {name:"Grade técnica",category:"Grade",className:"is-grid",tokens:"--ds-border · célula 24 px",themes:"Claro + escuro",goal:"Sugerir estrutura e precisão sem ruído.",apply:"Previews técnicos e documentação.",avoid:"Em formulários longos.",page:"Pré-visualizações do manual",css:"background-image: linear-gradient(var(--ds-border) 1px, transparent 1px), linear-gradient(90deg, var(--ds-border) 1px, transparent 1px); background-size: 24px 24px;"},
  {name:"Pontos de contexto",category:"Padrão repetido",className:"is-dots",tokens:"--ds-text-muted · 16 px",themes:"Claro + escuro",goal:"Dar profundidade a áreas vazias compactas.",apply:"Empty states e onboarding.",avoid:"Atrás de dados ou gráficos.",page:"Estados vazios",css:"background-image: radial-gradient(var(--ds-text-muted) 1px, transparent 1px); background-size: 16px 16px;"},
  {name:"Órbitas abstratas",category:"Elementos abstratos",className:"is-orbits",tokens:"--ds-brand · --ds-accent",themes:"Claro + escuro",goal:"Reforçar o conceito de mira da marca.",apply:"Fundamentos e áreas institucionais.",avoid:"Em superfícies operacionais pequenas.",page:"Hero de Fundamentos",css:"background: radial-gradient(circle at 30% 40%, var(--ds-brand-soft), transparent 34%), radial-gradient(circle at 75% 65%, var(--ds-accent-soft), transparent 30%);"},
];

export function BackgroundsSection(){return <><div className="ds-section-heading"><h2>Fundos que organizam sem distrair.</h2><p>Catálogo auditado dos padrões usados na JobForged. Cada miniatura utiliza o próprio CSS documentado.</p></div><div className="ds-background-grid">{backgrounds.map(bg=><article key={bg.name}><div className={`ds-background-preview ${bg.className}`}><span>Claro</span><span>Escuro</span></div><div className="ds-background-copy"><small>{bg.category}</small><strong>{bg.name}</strong><code>{bg.tokens}</code><p>{bg.goal}</p><dl><div><dt>Use</dt><dd>{bg.apply}</dd></div><div><dt>Evite</dt><dd>{bg.avoid}</dd></div><div><dt>Tema</dt><dd>{bg.themes}</dd></div><div><dt>Em uso</dt><dd>{bg.page}</dd></div></dl></div></article>)}</div></>}

export function AdvancedCharts(){
  const xs=[20,96,172,248,324,400];
  const [funnel,setFunnel]=useState([2480,1320,840,486,164,42,18]);
  const [area,setArea]=useState([36,48,67,82,95,104]);
  const [line,setLine]=useState([42,58,51,74,83,106]);
  const [gauge,setGauge]=useState(78);
  const [copied,setCopied]=useState("");
  const normalize=(values:number[],top=150)=>values.map(value=>Math.max(28,160-(value/Math.max(...values))*top));
  const areaY=normalize(area,122); const lineA=normalize(line,125); const lineB=normalize(line.map(v=>Math.round(v*.68)),100);
  const update=(values:number[],index:number,value:string,setter:(next:number[])=>void)=>{const next=[...values];next[index]=Math.max(0,Number(value)||0);setter(next)};
  const copyCode=async(name:string,values:number[])=>{const code=`<JobForgedChart type="${name}" data={${JSON.stringify(values)}} />`;await navigator.clipboard.writeText(code);setCopied(name);window.setTimeout(()=>setCopied(""),1600)};
  const Editor=({values,setter,label}:{values:number[];setter:(next:number[])=>void;label:string})=><div className="ds-chart-editor" aria-label={`Valores do gráfico ${label}`}>{values.map((value,index)=><label key={index}><span>{index+1}</span><input type="number" min="0" value={value} onChange={event=>update(values,index,event.target.value,setter)} aria-label={`${label}, valor ${index+1}`}/></label>)}</div>;
  return <div className="ds-chart-docs">
  <article><ChartHeader icon={Funnel} title="Funil de recrutamento" text="Compare volume e conversão entre etapas sequenciais. Exemplo: da visualização da vaga até a contratação." copied={copied==="funnel"} onCopy={()=>copyCode("funnel",funnel)}/><div className="ds-advanced-funnel">{["Visualizações","Inícios","Currículos","Triagem","Entrevistas","Aprovados","Contratados"].map((label,i)=><div style={{"--w":`${Math.max(16,(funnel[i]/Math.max(...funnel))*100)}%`} as CSSProperties} key={label}><i/><span>{label} <b>{funnel[i]}</b><small>{i?Math.round((funnel[i]/Math.max(1,funnel[i-1]))*100):100}%</small></span></div>)}</div><Editor values={funnel} setter={setFunnel} label="funil"/><ChartNote use="Processos com etapas em ordem e perda de volume." avoid="Categorias independentes ou sem sequência."/></article>
  <article><ChartHeader icon={ChartNoAxesCombined} title="Gráfico de área" text="Evidencie a evolução de uma métrica e seu volume ao longo do tempo. Exemplo: candidaturas recebidas por mês." copied={copied==="area"} onCopy={()=>copyCode("area",area)}/><svg className="ds-area-chart" viewBox="0 0 420 190" role="img" aria-label={`Candidaturas por mês: ${area.join(", ")}`}><defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ds-brand)" stopOpacity=".32"/><stop offset="1" stopColor="var(--ds-brand)" stopOpacity=".03"/></linearGradient></defs><path d={`M${xs.map((x,i)=>`${x} ${areaY[i]}`).join(" L")} L400 160 L20 160Z`} fill="url(#area-fill)"/><polyline points={xs.map((x,i)=>`${x},${areaY[i]}`).join(" ")}/><g>{xs.map((x,i)=><g key={x}><circle cx={x} cy={areaY[i]} r="3"/><text className="ds-chart-value" x={x} y={areaY[i]-9}>{area[i]}</text><text x={x} y="181">{["Mai","Jun","Jul","Ago","Set","Out"][i]}</text></g>)}</g></svg><Editor values={area} setter={setArea} label="área"/><ChartNote use="Uma série temporal com ênfase no volume." avoid="Comparações exatas entre muitas séries."/></article>
  <article><ChartHeader icon={ChartNoAxesCombined} title="Gráfico de linha" text="Compare tendências em períodos iguais. Exemplo: candidaturas atuais contra a média histórica." copied={copied==="line"} onCopy={()=>copyCode("line",line)}/><svg className="ds-line-chart" viewBox="0 0 420 190" role="img" aria-label={`Série semanal: ${line.join(", ")}`}><polyline points={xs.map((x,i)=>`${x},${lineA[i]}`).join(" ")}/><polyline className="is-accent" points={xs.map((x,i)=>`${x},${lineB[i]}`).join(" ")}/><line x1="20" y1="92" x2="400" y2="92"/><g>{xs.map((x,i)=><g key={x}><circle className="is-brand" cx={x} cy={lineA[i]} r="3"/><circle className="is-accent" cx={x} cy={lineB[i]} r="3"/><text className="ds-chart-value" x={x} y={Math.min(lineA[i],lineB[i])-9}>{line[i]}</text><text x={x} y="181">S{i+1}</text></g>)}</g></svg><div className="ds-chart-legend"><span className="is-brand">Período atual</span><span className="is-accent">Média histórica</span><span className="is-goal">Meta</span></div><Editor values={line} setter={setLine} label="linha"/><ChartNote use="Tendências contínuas e comparação entre séries." avoid="Mais de quatro séries concorrentes."/></article>
  <article><ChartHeader icon={Gauge} title="Gauge de completude" text="Mostre um valor único dentro de uma escala conhecida. Exemplo: qualidade de preenchimento de uma vaga." copied={copied==="gauge"} onCopy={()=>copyCode("gauge",[gauge])}/><div className="ds-gauge" role="img" aria-label={`Completude da vaga: ${gauge} de 100`}><svg viewBox="0 0 220 130"><path d="M25 110 A85 85 0 0 1 195 110"/><path className="is-value" pathLength="100" strokeDasharray={`${Math.min(100,gauge)} 100`} d="M25 110 A85 85 0 0 1 195 110"/></svg><span><strong>{gauge}%</strong><small>{gauge<50?"Básica":gauge<80?"Estruturada":"Completa"}</small></span><footer><i>0</i><i>100</i></footer></div><Editor values={[gauge]} setter={next=>setGauge(Math.min(100,next[0]))} label="gauge"/><ChartNote use="Percentuais, progresso e consumo contra um limite." avoid="Comparar muitos indicadores lado a lado."/></article>
  </div>}

function ChartHeader({icon:Icon,title,text,copied,onCopy}:{icon:IconType;title:string;text:string;copied:boolean;onCopy:()=>void}){return <header className="ds-chart-header"><Icon size={18}/><div><strong>{title}</strong><p>{text}</p></div><button type="button" className="ds-button ds-button--outline ds-button--small" onClick={onCopy}><Copy size={14}/>{copied?"Copiado":"Copiar código"}</button></header>}
function ChartNote({use,avoid}:{use:string;avoid:string}){return <footer className="ds-chart-note"><span><b>Use quando:</b> {use}</span><span><b>Evite quando:</b> {avoid}</span></footer>}

export function ButtonSpecs(){return <div className="ds-button-specs"><div className="ds-button-specs__table"><div className="is-head"><span>Tamanho</span><span>Altura</span><span>Padding H/V</span><span>Fonte / linha</span><span>Ícone / gap</span><span>Raio / borda</span><span>Uso</span></div>{[["Extra pequeno","28 px","10 / 5 px","12 / 16 px","14 / 6 px","6 / 1 px","Tabelas"],["Pequeno","32 px","12 / 7 px","12 / 16 px","14 / 6 px","7 / 1 px","Filtros"],["Médio","40 px","14 / 10 px","13 / 18 px","16 / 8 px","8 / 1 px","Padrão geral"],["Grande","48 px","20 / 14 px","14 / 20 px","18 / 8 px","10 / 1 px","Ações principais"]].map(row=><div key={row[0]}>{row.map(cell=><span key={cell}>{cell}</span>)}</div>)}</div></div>}

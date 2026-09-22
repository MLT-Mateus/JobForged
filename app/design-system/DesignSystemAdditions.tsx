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

export function getChartSnippet(type:string,data:number[]){
  const labels=type.includes("funnel")?["Visualizações","Inícios","Currículos","Triagem","Entrevistas","Aprovados","Contratados"].slice(0,data.length):type==="area"?["Mai","Jun","Jul","Ago","Set","Out"].slice(0,data.length):type==="line"?data.map((_,index)=>`S${index+1}`):data.map((_,index)=>`Item ${index+1}`);
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gráfico JobForged</title>
  <style>
    :root{color-scheme:light dark;--primary:#20B2AA;--secondary:#4169E1;--surface:#fff;--text:#142321;--muted:#61716e;--border:#dce8e6}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f5f9f8;color:var(--text);font:500 14px/1.5 system-ui,sans-serif}
    .chart{width:min(760px,100%);padding:24px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:0 18px 50px #14232112}.chart h1{margin:0 0 20px;font-size:20px}.chart svg{display:block;width:100%;height:auto;overflow:visible}.grid{stroke:var(--border);stroke-width:1}.axis-label{fill:var(--muted);font-size:12px;text-anchor:middle}.value-label{fill:var(--text);font-size:12px;font-weight:750;text-anchor:middle}.value-label.secondary{fill:var(--secondary)}.series{fill:none;stroke:var(--primary);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.series.secondary{stroke:var(--secondary)}.area{fill:color-mix(in srgb,var(--primary) 18%,transparent);stroke:none}.point{fill:var(--surface);stroke:var(--primary);stroke-width:3;cursor:help}.point.secondary{stroke:var(--secondary)}.point:hover,.point:focus{r:7;outline:none}.tooltip{position:fixed;z-index:10;padding:7px 10px;border-radius:7px;background:#142321;color:#fff;font-size:12px;pointer-events:none;opacity:0;transform:translate(-50%,-120%);transition:opacity .12s}.tooltip.is-visible{opacity:1}
    .funnel{display:grid;gap:10px}.funnel-row{display:grid;grid-template-columns:minmax(100px,auto) minmax(0,1fr) 44px;align-items:center;gap:12px}.funnel-track{min-width:0}.funnel-bar{position:relative;display:grid;width:max(1px,var(--width));height:34px;place-items:center;border-radius:7px;background:linear-gradient(90deg,var(--primary),var(--secondary));color:#fff;font-size:14px;font-weight:800;overflow:visible}.funnel-bar b{position:absolute;left:50%;white-space:nowrap;text-shadow:0 1px 3px #071412cc;transform:translateX(-50%)}.funnel-row>span{color:var(--muted);font-size:12px}.funnel-row>small{color:var(--primary);font-size:12px;text-align:right}.bars{display:flex;height:260px;align-items:end;gap:12px}.bar{position:relative;flex:1;height:var(--height);min-height:10px;border-radius:8px 8px 3px 3px;background:linear-gradient(var(--primary),var(--secondary))}.bar b{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%)}.donut{display:grid;width:220px;height:220px;margin:auto;place-items:center;border-radius:50%;background:conic-gradient(var(--primary) 0 var(--slice),var(--secondary) var(--slice) 100%)}.donut:before{grid-area:1/1;width:130px;height:130px;border-radius:50%;background:var(--surface);content:""}.donut b{z-index:1;grid-area:1/1;font-size:28px}.gauge{position:relative;max-width:320px;margin:auto}.gauge path{fill:none;stroke:var(--border);stroke-width:18;stroke-linecap:round}.gauge .value{stroke:var(--primary)}.gauge b{position:absolute;inset:58% 0 auto;text-align:center;font-size:30px}
    @media(prefers-color-scheme:dark){:root{--surface:#102522;--text:#f2fbf9;--muted:#a8bbb7;--border:#2a3d3a}body{background:#071412}}@media(max-width:520px){.chart{padding:16px}.value-label{font-size:10px}}
  </style>
</head>
<body>
  <main class="chart"><h1>Gráfico ${type}</h1><div id="chart"></div></main><div class="tooltip" id="tooltip" role="tooltip"></div>
  <script>
    const data=${JSON.stringify(data)};
    const secondary=data.map(value=>Math.round(value*.68));
    const labels=${JSON.stringify(labels)};
    const type=${JSON.stringify(type)};
    const root=document.querySelector('#chart');
    const tooltip=document.querySelector('#tooltip');
    const max=Math.max(...data,1);
    const show=(event,text)=>{tooltip.textContent=text;tooltip.style.left=event.clientX+'px';tooltip.style.top=event.clientY+'px';tooltip.classList.add('is-visible')};
    const hide=()=>tooltip.classList.remove('is-visible');
    function lineChart(area=false){const width=680,height=260,pad=38;const x=i=>pad+i*((width-pad*2)/Math.max(1,data.length-1));const y=v=>height-pad-(v/max)*(height-pad*2);const points=data.map((v,i)=>x(i)+','+y(v)).join(' ');const secondaryPoints=secondary.map((v,i)=>x(i)+','+y(v)).join(' ');const shape=data.map((v,i)=>(i?'L':'M')+x(i)+' '+y(v)).join(' ')+' L '+x(data.length-1)+' '+(height-pad)+' L '+x(0)+' '+(height-pad)+' Z';root.innerHTML=\`<svg viewBox="0 0 \${width} \${height}" aria-label="Série de dados">\${area?'<path class="area" d="'+shape+'"/>':''}<polyline class="series" points="\${points}"/>\${!area?'<polyline class="series secondary" points="'+secondaryPoints+'"/>':''}\${data.map((v,i)=>\`<g><text class="value-label" x="\${x(i)}" y="\${Math.max(16,y(v)-13)}">\${v}</text><circle class="point" tabindex="0" data-label="\${labels[i]} · Atual: \${v}" cx="\${x(i)}" cy="\${y(v)}" r="5"/>\${!area?' <text class="value-label secondary" x="'+x(i)+'" y="'+Math.min(height-pad-4,y(secondary[i])+18)+'">'+secondary[i]+'</text><circle class="point secondary" tabindex="0" data-label="'+labels[i]+' · Média: '+secondary[i]+'" cx="'+x(i)+'" cy="'+y(secondary[i])+'" r="5"/>':''}<text class="axis-label" x="\${x(i)}" y="\${height-8}">\${labels[i]}</text></g>\`).join('')}</svg>\`;}
    function funnelChart(){root.innerHTML='<div class="funnel">'+data.map((v,i)=>\`<div class="funnel-row"><span>\${labels[i]}</span><div class="funnel-track"><div class="funnel-bar" style="--width:\${(v/max*100).toFixed(3)}%"><b>\${v.toLocaleString('pt-BR')}</b></div></div><small>\${i?Math.round(v/Math.max(1,data[i-1])*100):100}%</small></div>\`).join('')+'</div>'}
    function barsChart(){root.innerHTML='<div class="bars">'+data.map((v,i)=>\`<div class="bar" style="--height:\${Math.max(5,v/max*100)}%"><b>\${v}</b></div>\`).join('')+'</div>'}
    function donutChart(){root.innerHTML=\`<div class="donut" style="--slice:\${data[0]}%"><b>\${data.reduce((a,b)=>a+b,0)}</b></div>\`}
    function gaugeChart(){root.innerHTML=\`<div class="gauge"><svg viewBox="0 0 220 130"><path d="M25 110 A85 85 0 0 1 195 110"/><path class="value" pathLength="100" stroke-dasharray="\${data[0]} 100" d="M25 110 A85 85 0 0 1 195 110"/></svg><b>\${data[0]}%</b></div>\`}
    if(type.includes('funnel'))funnelChart();else if(type==='line'||type==='area')lineChart(type==='area');else if(type==='donut')donutChart();else if(type==='gauge')gaugeChart();else barsChart();
    document.querySelectorAll('.point').forEach(point=>{point.addEventListener('pointerenter',e=>show(e,point.dataset.label));point.addEventListener('pointermove',e=>show(e,point.dataset.label));point.addEventListener('pointerleave',hide);point.addEventListener('focus',()=>{const r=point.getBoundingClientRect();show({clientX:r.left+r.width/2,clientY:r.top},point.dataset.label)});point.addEventListener('blur',hide)});
  </script>
</body>
</html>`;
}

export function AdvancedCharts(){
  const xs=[20,96,172,248,324,400];
  const funnel=[2480,1320,840,486,164,42,18];
  const area=[36,48,67,82,95,104];
  const line=[42,58,51,74,83,106];
  const gauge=78;
  const funnelMax=Math.max(...funnel,1);
  const [copied,setCopied]=useState("");
  const normalize=(values:number[],top=150)=>values.map(value=>Math.max(28,160-(value/Math.max(...values))*top));
  const areaY=normalize(area,122); const lineA=normalize(line,125); const lineB=normalize(line.map(v=>Math.round(v*.68)),100);
  const copyCode=async(name:string,values:number[])=>{await navigator.clipboard.writeText(getChartSnippet(name,values));setCopied(name);window.setTimeout(()=>setCopied(""),1600)};
  return <div className="ds-chart-docs">
  <article><ChartHeader icon={Funnel} title="Funil de recrutamento" text="Compare volume e conversão entre etapas sequenciais. Exemplo: da visualização da vaga até a contratação." copied={copied==="funnel"} onCopy={()=>copyCode("funnel",funnel)}/><div className="ds-advanced-funnel" role="img" aria-label={`Funil de recrutamento: ${funnel.join(", ")}`}>{["Visualizações","Inícios","Currículos","Triagem","Entrevistas","Aprovados","Contratados"].map((label,i)=>{const conversion=i?Math.round((funnel[i]/Math.max(1,funnel[i-1]))*100):100;return <div style={{"--w":`${((funnel[i]/funnelMax)*100).toFixed(3)}%`} as CSSProperties} key={label} title={`${label}: ${funnel[i]} · ${conversion}% de conversão`}><span>{label}</span><i><b>{funnel[i].toLocaleString("pt-BR")}</b></i><small>{conversion}%</small></div>})}</div><ChartNote use="Processos com etapas em ordem e perda de volume." avoid="Categorias independentes ou sem sequência."/></article>
  <article><ChartHeader icon={ChartNoAxesCombined} title="Gráfico de área" text="Evidencie a evolução de uma métrica e seu volume ao longo do tempo. Exemplo: candidaturas recebidas por mês." copied={copied==="area"} onCopy={()=>copyCode("area",area)}/><svg className="ds-area-chart" viewBox="0 0 420 190" role="img" aria-label={`Candidaturas por mês: ${area.join(", ")}`}><defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ds-brand)" stopOpacity=".32"/><stop offset="1" stopColor="var(--ds-brand)" stopOpacity=".03"/></linearGradient></defs><path d={`M${xs.map((x,i)=>`${x} ${areaY[i]}`).join(" L")} L400 160 L20 160Z`} fill="url(#area-fill)"/><polyline points={xs.map((x,i)=>`${x},${areaY[i]}`).join(" ")}/><g>{xs.map((x,i)=><text className="ds-chart-value" x={x} y={Math.max(14,areaY[i]-11)} key={`v-${x}`}>{area[i]}</text>)}</g><g>{xs.map((x,i)=><SvgPoint key={x} x={x} y={areaY[i]} label={`${["Mai","Jun","Jul","Ago","Set","Out"][i]}: ${area[i]}`}/>)}</g><g>{xs.map((x,i)=><text x={x} y="181" key={x}>{["Mai","Jun","Jul","Ago","Set","Out"][i]}</text>)}</g></svg><ChartNote use="Uma série temporal com ênfase no volume." avoid="Comparações exatas entre muitas séries."/></article>
  <article><ChartHeader icon={ChartNoAxesCombined} title="Gráfico de linha" text="Compare tendências em períodos iguais. Exemplo: candidaturas atuais contra a média histórica." copied={copied==="line"} onCopy={()=>copyCode("line",line)}/><svg className="ds-line-chart" viewBox="0 0 420 190" role="img" aria-label={`Série semanal: ${line.join(", ")}`}><polyline points={xs.map((x,i)=>`${x},${lineA[i]}`).join(" ")}/><polyline className="is-accent" points={xs.map((x,i)=>`${x},${lineB[i]}`).join(" ")}/><line x1="20" y1="92" x2="400" y2="92"/><g>{xs.map((x,i)=><text className="ds-chart-value" x={x} y={Math.max(14,lineA[i]-11)} key={`va-${x}`}>{line[i]}</text>)}</g><g>{xs.map((x,i)=><text className="ds-chart-value is-accent" x={x} y={Math.min(166,lineB[i]+16)} key={`vb-${x}`}>{Math.round(line[i]*.68)}</text>)}</g><g>{xs.map((x,i)=><SvgPoint key={`a-${x}`} x={x} y={lineA[i]} label={`Semana ${i+1} · Atual: ${line[i]}`}/>)}</g><g>{xs.map((x,i)=><SvgPoint key={`b-${x}`} x={x} y={lineB[i]} label={`Semana ${i+1} · Média: ${Math.round(line[i]*.68)}`} accent/>)}</g><g>{xs.map((x,i)=><text x={x} y="181" key={x}>S{i+1}</text>)}</g></svg><div className="ds-chart-legend"><span className="is-brand">Período atual</span><span className="is-accent">Média histórica</span><span className="is-goal">Meta</span></div><ChartNote use="Tendências contínuas e comparação entre séries." avoid="Mais de quatro séries concorrentes."/></article>
  <article><ChartHeader icon={Gauge} title="Gauge de completude" text="Mostre um valor único dentro de uma escala conhecida. Exemplo: qualidade de preenchimento de uma vaga." copied={copied==="gauge"} onCopy={()=>copyCode("gauge",[gauge])}/><div className="ds-gauge" role="img" aria-label={`Completude da vaga: ${gauge} de 100`} title={`Completude: ${gauge}% · Estruturada`}><svg viewBox="0 0 220 130"><path d="M25 110 A85 85 0 0 1 195 110"/><path className="is-value" pathLength="100" strokeDasharray={`${Math.min(100,gauge)} 100`} d="M25 110 A85 85 0 0 1 195 110"/></svg><span><strong>{gauge}%</strong><small>{gauge<50?"Básica":gauge<80?"Estruturada":"Completa"}</small></span><footer><i>0</i><i>100</i></footer></div><ChartNote use="Percentuais, progresso e consumo contra um limite." avoid="Comparar muitos indicadores lado a lado."/></article>
  </div>}

function SvgPoint({x,y,label,accent=false}:{x:number;y:number;label:string;accent?:boolean}){return <g className={`ds-chart-point ${accent?"is-accent":""}`} tabIndex={0} aria-label={label}><circle cx={x} cy={y} r="7" className="ds-chart-hit"/><circle cx={x} cy={y} r="3"/><g className="ds-svg-tooltip" transform={`translate(${Math.max(40,Math.min(380,x))} ${Math.max(34,y-12)})`}><rect x="-39" y="-28" width="78" height="22" rx="6"/><text x="0" y="-14">{label}</text></g></g>}

function ChartHeader({icon:Icon,title,text,copied,onCopy}:{icon:IconType;title:string;text:string;copied:boolean;onCopy:()=>void}){return <header className="ds-chart-header"><Icon size={18}/><div><strong>{title}</strong><p>{text}</p></div><button type="button" className="ds-button ds-button--outline ds-button--small" onClick={onCopy}><Copy size={14}/>{copied?"Copiado":"Copiar código"}</button></header>}
function ChartNote({use,avoid}:{use:string;avoid:string}){return <footer className="ds-chart-note"><span><b>Use quando:</b> {use}</span><span><b>Evite quando:</b> {avoid}</span></footer>}

export function ButtonSpecs(){return <div className="ds-button-specs"><div className="ds-button-specs__table"><div className="is-head"><span>Tamanho</span><span>Altura</span><span>Padding H/V</span><span>Fonte / linha</span><span>Ícone / gap</span><span>Raio / borda</span><span>Uso</span></div>{[["Extra pequeno","28 px","10 / 5 px","12 / 16 px","14 / 6 px","6 / 1 px","Tabelas"],["Pequeno","32 px","12 / 7 px","12 / 16 px","14 / 6 px","7 / 1 px","Filtros"],["Médio","40 px","14 / 10 px","13 / 18 px","16 / 8 px","8 / 1 px","Padrão geral"],["Grande","48 px","20 / 14 px","14 / 20 px","18 / 8 px","10 / 1 px","Ações principais"]].map(row=><div key={row[0]}>{row.map(cell=><span key={cell}>{cell}</span>)}</div>)}</div></div>}

import {portalChrome,portalMenu,portalFooter,defaultPortalFooter,validPortalMenuLink} from './portal-chrome.ts';
import {renderRichText,richTextPlain} from '../ui/rich-content.ts';
import {careerCopy} from './career-copy.ts';
import {careerDefaults} from './career-defaults.ts';
import {portalPresentation,validPortalPresentation} from './portal-presentation.ts';
import type { CSSProperties } from 'react';
import { fontPairs } from '../ui/font-pairs.ts';
import { defaultCustomization, lightPalette, darkPalette } from './personalization-mocks.ts';
import type { Customization, Palette } from './personalization-types';
export const assetKinds=['logoMain','logoAlternative','logoLight','logoDark','favicon','avatar','shareImage'] as const;
export function brandingDefaults(companyId:string,name:string):Customization {
 const source=structuredClone(defaultCustomization);
 return {...source,organizationId:companyId,displayName:name,shortName:name.slice(0,24),slogan:'',assets:Object.fromEntries(assetKinds.map(key=>[key,null])),banners:[{id:"default-culture",organizationId:companyId,createdAt:"",updatedAt:"",status:"Ativo",title:"Conheça nosso jeito de trabalhar",description:"Pessoas, ideias e oportunidades para construir o próximo capítulo. Conteúdo de exemplo · mock.",buttonText:"Conheça a JobForged",link:"https://jobforged.com",image:"",startAt:"",endAt:"",placement:"Portal",order:0}],
  portal:{...source.portal,footer:defaultPortalFooter(name),layout:'classico',headline:careerDefaults.headline,introduction:careerDefaults.introduction,about:careerDefaults.about,contactEmail:'',contactPhone:'',socialLinkedin:'',socialInstagram:'',footerText:name,customDomain:'',jobforgedDomain:''},draftUpdatedAt:'',publishedAt:'',publishedBy:'',revision:0};
}
export const brandContent=(value:Customization)=>{
 const {organizationId,draftUpdatedAt,publishedAt,publishedBy,revision,...content}=value;
 void organizationId;void draftUpdatedAt;void publishedAt;void publishedBy;void revision;
 return content;
};
export const brandingLogo=(value:Customization,theme:'light'|'dark')=>(theme==='dark'?value.assets.logoDark?.url:value.assets.logoLight?.url)||value.assets.logoMain?.url||value.assets.logoAlternative?.url||'/brand/jobforged-symbol.svg';
export function safeBrandingLink(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined}catch{return undefined}}
export function luminance(value:string){const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
export function contrast(a:string,b:string){const [x,y]=[luminance(a),luminance(b)].sort((m,n)=>n-m);return(x+.05)/(y+.05)}
export const foreground=(background:string)=>contrast(background,'#142321')>=4.5?'#142321':contrast(background,'#000000')>=4.5?'#000000':'#FFFFFF';
export function paletteFor(value:Customization,theme:'light'|'dark'):Palette {return theme==='dark'?value.theme.dark:{...value.palette,background:value.theme.light.background,surface:value.theme.light.surface,text:value.theme.light.text}}
function blendColor(source:string,target:string,amount:number){return '#'+[1,3,5].map(i=>Math.round(parseInt(source.slice(i,i+2),16)*(1-amount)+parseInt(target.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('')}
export function brandingScrollbarStyle(value:Customization,theme:'light'|'dark'):CSSProperties {
 const primary=/^#[0-9A-F]{6}$/i.test(value.palette.primary)?value.palette.primary:lightPalette.primary;
 const p=paletteFor(value,theme),surfaces=[p.background,p.surface],score=(color:string)=>Math.min(...surfaces.map(surface=>contrast(color,surface)));
 const target=score('#000000')>=score('#FFFFFF')?'#000000':'#FFFFFF';
 let thumb=primary;
 for(let step=1;score(thumb)<3&&step<=10;step++)thumb=blendColor(primary,target,step/10);
 const hover=blendColor(thumb,target,.15);
 return {'--app-scrollbar-track':p.background,'--app-scrollbar-edge':p.background,'--app-scrollbar-thumb-start':thumb,'--app-scrollbar-thumb-end':thumb,'--app-scrollbar-thumb-hover-start':hover,'--app-scrollbar-thumb-hover-end':hover,
 '--jf-ui-app-scrollbar-track':p.background,'--jf-ui-app-scrollbar-edge':p.background,'--jf-ui-app-scrollbar-thumb-start':thumb,'--jf-ui-app-scrollbar-thumb-end':thumb,'--jf-ui-app-scrollbar-thumb-hover-start':hover,'--jf-ui-app-scrollbar-thumb-hover-end':hover,
 '--jf-ui-scrollbar-track':p.background,'--jf-ui-scrollbar-thumb':thumb,'--jf-ui-scrollbar-thumb-hover':hover} as CSSProperties;
}
export function brandingStyle(value:Customization,theme:'light'|'dark'):CSSProperties {
 const p=paletteFor(value,theme),pair=fontPairs.find(x=>x.id===value.typography.fontPair)||fontPairs[0];
 const image=value.backgrounds.panelImage||value.backgrounds.textureImage;
 return {...brandingScrollbarStyle(value,theme),'--teal':p.primary,'--teal-deep':p.link,'--teal-soft':p.activeItem,'--blue':p.secondary,'--app-bg':p.background,'--app-panel':p.surface,
  '--jf-ui-brand':p.button,'--jf-ui-brand-strong':p.link,'--jf-ui-brand-soft':p.activeItem,'--jf-ui-on-brand':foreground(p.button),
  '--jf-ui-focus':p.link,'--jf-ui-focus-ring':'color-mix(in srgb,var(--jf-ui-focus) 28%,transparent)','--jf-ui-surface':p.surface,'--jf-ui-surface-soft':p.background,
  '--jf-ui-accent':p.secondary,'--jf-ui-text':p.text,'--jf-ui-text-muted':'color-mix(in srgb,var(--jf-ui-text) 72%,var(--jf-ui-surface))','--jf-ui-text-soft':'var(--jf-ui-text-muted)',
  '--jf-ui-border':'color-mix(in srgb,var(--jf-ui-text) 18%,var(--jf-ui-surface))','--jf-ui-border-strong':'color-mix(in srgb,var(--jf-ui-text) 35%,var(--jf-ui-surface))',
  '--jf-ui-font-heading':pair.heading,'--jf-ui-font-body':pair.body,'--company-line-height':value.typography.density==='Compacta'?'1.4':value.typography.density==='Ampla'?'1.8':'1.6','--company-sidebar':p.sidebar,'--company-button':p.button,'--company-button-hover':p.buttonHover,'--company-on-button':foreground(p.button),'--company-on-button-hover':foreground(p.buttonHover),
  '--company-panel-image':image?`linear-gradient(color-mix(in srgb,${value.backgrounds.overlay} ${value.backgrounds.opacity}%,transparent),color-mix(in srgb,${value.backgrounds.overlay} ${value.backgrounds.opacity}%,transparent)),url("${image}")`:'none','--company-panel-fit':value.backgrounds.fit,'--company-panel-position':value.backgrounds.position,
  '--cp-header-bg':portalChrome(value)[theme].headerBackground,'--cp-header-text':portalChrome(value)[theme].headerText,'--cp-footer-bg':portalChrome(value)[theme].footerBackground,'--cp-footer-text':portalChrome(value)[theme].footerText,'--cp-primary':p.primary,'--cp-secondary':p.secondary,'--cp-accent':p.accent,'--cp-button':p.button,'--cp-button-hover':p.buttonHover,'--cp-sidebar':p.sidebar,'--cp-active':p.activeItem,'--cp-link':p.link,'--cp-bg':p.background,'--cp-surface':p.surface,'--cp-portal':p.portalBackground,'--cp-text':p.text,'--cp-overlay':String(value.backgrounds.opacity/100)} as CSSProperties;
}
/** Reject unknown structure and CSS/URL values before sending data to the database. */
export type BrandingIssue={path:string;message:string};
export function brandingIssue(content:unknown):BrandingIssue|null {
 const issue=(path:string,message:string)=>({path,message});
 if(!content||typeof content!=='object'||Array.isArray(content))return issue('displayName','Configuração inválida.');
 const c=content as ReturnType<typeof brandContent>;
 try {
  for(const [key,limit] of [['displayName',160],['shortName',24],['slogan',110]] as const)if((key!=='slogan'&&!c[key].trim())||c[key].length>limit)return issue(key,'Revise o nome, nome curto e slogan.');
  if(richTextPlain(c.portal.headline).length>90)return issue('portal.headline','Use até 90 caracteres no título principal.');
  if(c.portal.content)for(const [key,value] of Object.entries(c.portal.content))if(!(key in careerCopy)||typeof value!=='string'||value.length>4000)return issue('portal.content.'+key,'Revise os textos das seções.');
  for(const key of ['socialLinkedin','socialInstagram'] as const)if(c.portal[key]&&!safeBrandingLink(c.portal[key]))return issue(`portal.${key}`,'Use um endereço HTTPS válido.');
  for(let i=0;i<c.banners.length;i++)if(c.banners[i].link&&!validContentLink(c.banners[i].link))return issue(`banners.${i}.link`,'Use um endereço HTTPS ou um caminho interno.');
  if(c.portal.footer){const f=c.portal.footer;
   if(f.links.length>6)return issue('portal.footer.links.0.label','Use até seis links no rodapé.');
   for(let i=0;i<f.links.length;i++){const link=f.links[i];if(typeof link.label!=='string'||!richTextPlain(link.label).trim()||richTextPlain(link.label).length>60)return issue(`portal.footer.links.${i}.label`,'Informe um nome de até 60 caracteres.');if(!validContentLink(link.href))return issue(`portal.footer.links.${i}.href`,'Use um endereço HTTPS ou um caminho interno.');}
   if(!validContentLink(f.phoneUrl))return issue('portal.footer.phoneUrl','Revise o link de contato.');
   if(f.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email))return issue('portal.footer.email','Revise o e-mail de contato.');
  }
  if(c.portal.navigation!==undefined){if(!Array.isArray(c.portal.navigation)||c.portal.navigation.length>5)return issue('portal.navigation.0.label','Use até cinco links no cabeçalho.');for(let i=0;i<c.portal.navigation.length;i++){const link=c.portal.navigation[i];if(typeof link.label!=='string'||!link.label.trim()||link.label.length>60)return issue(`portal.navigation.${i}.label`,'Informe um nome de até 60 caracteres.');if(typeof link.href!=='string'||link.href.length>2048||link.href!==''&&!validPortalMenuLink(link.href))return issue(`portal.navigation.${i}.href`,'Use HTTPS ou um caminho interno válido no cabeçalho.');}}
  if(c.portal.chrome!==undefined){const chrome=c.portal.chrome;if(Object.keys(chrome).sort().join(',')!=='dark,light')return issue('portal.chrome.light.headerBackground','Revise as cores do cabeçalho e rodapé.');for(const mode of ['light','dark'] as const){const row=chrome[mode];if(!row||Object.keys(row).sort().join(',')!=='footerBackground,footerText,headerBackground,headerText')return issue(`portal.chrome.${mode}.headerBackground`,'Revise as cores do cabeçalho e rodapé.');for(const [key,color] of Object.entries(row))if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))return issue(`portal.chrome.${mode}.${key}`,'Use cores no formato #RRGGBB.');if(contrast(row.headerBackground,row.headerText)<4.5)return issue(`portal.chrome.${mode}.headerText`,'Ajuste o contraste do cabeçalho e rodapé: pelo menos 4,5:1.');if(contrast(row.footerBackground,row.footerText)<4.5)return issue(`portal.chrome.${mode}.footerText`,'Ajuste o contraste do cabeçalho e rodapé: pelo menos 4,5:1.');}}
  if(c.portal.presentation!==undefined&&!validPortalPresentation(c.portal.presentation))return issue('portal.presentation.imageAlt','Revise a composição da página e a descrição da imagem.');
  if(c.portal.layout!==undefined&&!['classico','equipe','panorama','vagas','essencial'].includes(c.portal.layout))return issue('portal.layout','Escolha um template válido.');
  if(!fontPairs.some(p=>p.id===c.typography.fontPair))return issue('typography.fontPair','Escolha um dos quatro pares tipográficos aprovados.');
  for(const [prefix,palette] of [['palette',c.palette],['theme.light',c.theme.light],['theme.dark',c.theme.dark]] as const)for(const [key,color] of Object.entries(palette))if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))return issue(`${prefix}.${key}`,'Use cores no formato #RRGGBB.');
  for(const mode of ['light','dark'] as const){const p=paletteFor({...c} as Customization,mode);for(const surface of ['surface','background','sidebar','activeItem','portalBackground'] as const)for(const key of ['text','link'] as const)if(contrast(p[key],p[surface])<4.5)return issue(mode==='dark'?`theme.dark.${key}`:key==='text'?'theme.light.text':'palette.link',`Ajuste o contraste do tema ${mode==='light'?'claro':'escuro'}. Texto e links precisam de pelo menos 4,5:1 em todas as superfícies. Use texto e links mais escuros no tema claro e mais claros no escuro, ou restaure as paletas padrão.`);}
  return null;
 }catch{return issue('displayName','Revise os campos da identidade visual.');}
}
export function validateBranding(content:unknown):string|null{return brandingIssue(content)?.message??null}

export {lightPalette,darkPalette};

function validContentLink(value:string){if(value===''||/^\/(?!\/)[a-zA-Z0-9/_#?=.-]*$/.test(value))return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
export function normalizeBrandingRichContent(input:unknown):unknown{
 if(!input||typeof input!=='object'||Array.isArray(input))return input;
 const c=structuredClone(input) as ReturnType<typeof brandContent>;
 if(c.portal&&typeof c.portal==='object'){
  for(const key of ['headline','introduction','buttonText','about','footerText','emptyStateTitle','emptyStateDescription'] as const)if(typeof c.portal[key]==='string')c.portal[key]=renderRichText(c.portal[key]);
  if(c.portal.content&&typeof c.portal.content==='object')for(const [key,value] of Object.entries(c.portal.content))if(typeof value==='string')c.portal.content[key]=renderRichText(value);
  const f=c.portal.footer;if(f&&typeof f==='object'){for(const key of ['description','legal','eyebrow','title'] as const)if(typeof f[key]==='string')f[key]=renderRichText(f[key]);if(Array.isArray(f.links))for(const link of f.links)if(link&&typeof link.label==='string')link.label=renderRichText(link.label);}
 }
 if(Array.isArray(c.banners))for(const b of c.banners)for(const key of ['title','description','buttonText'] as const)if(b&&typeof b[key]==='string')b[key]=renderRichText(b[key]);
 return c;
}

/** Compare effective defaults, ignoring metadata, key order and absent legacy optional fields. */
export function isDefaultBranding(value:Customization,companyName:string){
 const comparable=(row:Customization)=>{const c=brandContent(row);return normalizeBrandingRichContent({...c,portal:{...c.portal,chrome:portalChrome(row),navigation:portalMenu(row),footer:portalFooter(row),presentation:portalPresentation(row.portal),content:{...careerCopy,...row.portal.content}}})};
 const stable=(v:unknown):string=>JSON.stringify(v,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
 return stable(comparable(value))===stable(comparable(brandingDefaults(value.organizationId,companyName)));
}

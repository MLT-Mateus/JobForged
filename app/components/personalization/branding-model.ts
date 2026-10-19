import type { CSSProperties } from 'react';
import { fontPairs } from '../ui/font-pairs.ts';
import { defaultCustomization, lightPalette, darkPalette } from './personalization-mocks.ts';
import type { Customization, Palette } from './personalization-types';
export const assetKinds=['logoMain','logoAlternative','logoLight','logoDark','favicon','avatar','shareImage'] as const;
export function brandingDefaults(companyId:string,name:string):Customization {
 const source=structuredClone(defaultCustomization);
 return {...source,organizationId:companyId,displayName:name,shortName:name.slice(0,24),slogan:'',assets:Object.fromEntries(assetKinds.map(key=>[key,null])),banners:[],
  portal:{...source.portal,headline:'Faça parte da nossa equipe',introduction:'Conheça nossas oportunidades.',about:'',contactEmail:'',contactPhone:'',socialLinkedin:'',socialInstagram:'',footerText:name,customDomain:'',jobforgedDomain:''},draftUpdatedAt:'',publishedAt:'',publishedBy:'',revision:0};
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
export function brandingStyle(value:Customization,theme:'light'|'dark'):CSSProperties {
 const p=paletteFor(value,theme),pair=fontPairs.find(x=>x.id===value.typography.fontPair)||fontPairs[0];
 const image=value.backgrounds.panelImage||value.backgrounds.textureImage;
 return {'--teal':p.primary,'--teal-deep':p.link,'--teal-soft':p.activeItem,'--blue':p.secondary,'--app-bg':p.background,'--app-panel':p.surface,
  '--jf-ui-brand':p.button,'--jf-ui-brand-strong':p.link,'--jf-ui-brand-soft':p.activeItem,'--jf-ui-on-brand':foreground(p.button),
  '--jf-ui-focus':p.link,'--jf-ui-focus-ring':'color-mix(in srgb,var(--jf-ui-focus) 28%,transparent)','--jf-ui-surface':p.surface,'--jf-ui-surface-soft':p.background,
  '--jf-ui-accent':p.secondary,'--jf-ui-text':p.text,'--jf-ui-text-muted':'color-mix(in srgb,var(--jf-ui-text) 72%,var(--jf-ui-surface))','--jf-ui-text-soft':'var(--jf-ui-text-muted)',
  '--jf-ui-border':'color-mix(in srgb,var(--jf-ui-text) 18%,var(--jf-ui-surface))','--jf-ui-border-strong':'color-mix(in srgb,var(--jf-ui-text) 35%,var(--jf-ui-surface))',
  '--jf-ui-font-heading':pair.heading,'--jf-ui-font-body':pair.body,'--company-line-height':value.typography.density==='Compacta'?'1.4':value.typography.density==='Ampla'?'1.8':'1.6','--company-sidebar':p.sidebar,'--company-button':p.button,'--company-button-hover':p.buttonHover,'--company-on-button':foreground(p.button),'--company-on-button-hover':foreground(p.buttonHover),
  '--company-panel-image':image?`linear-gradient(color-mix(in srgb,${value.backgrounds.overlay} ${value.backgrounds.opacity}%,transparent),color-mix(in srgb,${value.backgrounds.overlay} ${value.backgrounds.opacity}%,transparent)),url("${image}")`:'none','--company-panel-fit':value.backgrounds.fit,'--company-panel-position':value.backgrounds.position,
  '--cp-primary':p.primary,'--cp-secondary':p.secondary,'--cp-accent':p.accent,'--cp-button':p.button,'--cp-button-hover':p.buttonHover,'--cp-sidebar':p.sidebar,'--cp-active':p.activeItem,'--cp-link':p.link,'--cp-bg':p.background,'--cp-surface':p.surface,'--cp-portal':p.portalBackground,'--cp-text':p.text,'--cp-overlay':String(value.backgrounds.opacity/100)} as CSSProperties;
}
/** Reject unknown structure and CSS/URL values before sending data to the database. */
export function validateBranding(content:unknown):string|null {
 if(!content||typeof content!=='object'||Array.isArray(content))return 'Configuração inválida.';
 const c=content as ReturnType<typeof brandContent>;
 try {
  if(!c.displayName.trim()||c.displayName.length>160||!c.shortName.trim()||c.shortName.length>24||c.slogan.length>110) return 'Revise o nome, nome curto e slogan.';
  if(!fontPairs.some(p=>p.id===c.typography.fontPair))return 'Escolha um dos quatro pares tipográficos aprovados.';
  for(const palette of [c.palette,c.theme.light,c.theme.dark])for(const color of Object.values(palette))if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))return 'Use cores no formato #RRGGBB.';
  for(const mode of ['light','dark'] as const){const p=paletteFor({...c} as Customization,mode);if(contrast(p.text,p.surface)<4.5||contrast(p.text,p.background)<4.5||contrast(p.text,p.sidebar)<4.5||contrast(p.text,p.activeItem)<4.5||contrast(p.link,p.surface)<4.5)return `Ajuste o contraste do tema ${mode==='light'?'claro':'escuro'}. Texto e links precisam de pelo menos 4,5:1.`;}
  return null;
 }catch{return 'Revise os campos da identidade visual.';}
}
export {lightPalette,darkPalette};

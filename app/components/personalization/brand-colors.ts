import {contrast} from './branding-model.ts';
import type {Customization,Palette} from './personalization-types';
export type BrandColors={primary:string;secondary:string;action:string;lightText:string;darkText:string;lightBackground:string;darkBackground:string};
export const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('').toUpperCase();
export function readableColor(color:string,surfaces:string[],minimum=4.5){const score=(c:string)=>Math.min(...surfaces.map(s=>contrast(c,s)));const target=score('#000000')>score('#FFFFFF')?'#000000':'#FFFFFF';for(let i=0;i<=100;i++){const c=mix(color,target,i/100);if(score(c)>=minimum)return c}return target}
export const brandColors=(v:Customization):BrandColors=>({primary:v.palette.primary,secondary:v.palette.secondary,action:v.palette.button,lightText:v.theme.light.text,darkText:v.theme.dark.text,lightBackground:v.theme.light.background,darkBackground:v.theme.dark.background});
export function applyBrandColors(value:Customization,c:BrandColors):Customization{
 if(Object.values(c).some(v=>!/^#[0-9a-f]{6}$/i.test(v)))return {...value,palette:{...value.palette,primary:c.primary,secondary:c.secondary,button:c.action},theme:{...value.theme,light:{...value.theme.light,text:c.lightText,background:c.lightBackground},dark:{...value.theme.dark,text:c.darkText,background:c.darkBackground}}};
 const make=(dark:boolean):Palette=>{const background=dark?c.darkBackground:c.lightBackground,text=dark?c.darkText:c.lightText,surface=mix(background,'#FFFFFF',dark?.04:.65),activeItem=mix(background,c.primary,.07),link=readableColor(c.action,[background,surface,activeItem]);return {primary:dark?mix(c.primary,'#FFFFFF',.35):c.primary,secondary:dark?mix(c.secondary,'#FFFFFF',.35):c.secondary,accent:c.secondary,button:c.action,buttonHover:mix(c.action,dark?'#FFFFFF':'#000000',.12),sidebar:surface,activeItem,link,background,surface,portalBackground:background,text}};
 const light=make(false),dark=make(true);return {...value,palette:light,theme:{...value.theme,light,dark},portal:{...value.portal,chrome:{light:{headerBackground:light.surface,footerBackground:light.background,headerText:light.text,footerText:light.text},dark:{headerBackground:dark.surface,footerBackground:dark.background,headerText:dark.text,footerText:dark.text}}}};
}
export const colorPresets=[
 {id:'jobforged',name:'JobForged',primary:'#20B2AA',secondary:'#4169E1',action:'#20B2AA'},
 {id:'oceano',name:'Oceano',primary:'#0891B2',secondary:'#4338CA',action:'#087A94'},
 {id:'floresta',name:'Floresta',primary:'#16805D',secondary:'#B77714',action:'#16734C'},
 {id:'ameixa',name:'Ameixa',primary:'#7C3AED',secondary:'#BE185D',action:'#7C3AED'},
 {id:'terracota',name:'Terracota',primary:'#B4532A',secondary:'#477454',action:'#A24123'},
 {id:'grafite',name:'Grafite',primary:'#334155',secondary:'#D97706',action:'#334155'}
].map(p=>({...p,colors:{primary:p.primary,secondary:p.secondary,action:p.action,lightText:'#142321',darkText:'#EFF8F6',lightBackground:'#F5FAF9',darkBackground:'#071411'} as BrandColors}));

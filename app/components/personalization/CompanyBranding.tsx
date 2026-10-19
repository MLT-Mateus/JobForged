"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {BrandAsset} from '../BrandAsset';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {brandingLogo} from './branding-model';
import type {Customization} from './personalization-types';
const Context=createContext<Customization|null>(null);
const ThemeContext=createContext<'light'|'dark'>('light');
export const useCompanyBranding=()=>useContext(Context);
export function CompanyBrandingProvider({value,theme='light',children}:{value:Customization|null;theme?:'light'|'dark';children:ReactNode}){
 useEffect(()=>{
  const icon=document.querySelector<HTMLLinkElement>('link[rel="icon"]');if(!icon||!value?.assets.favicon)return;
  const previous=icon.href,previousType=icon.type;icon.href=value.assets.favicon.url;icon.type='image/png';
  return()=>{icon.href=previous;icon.type=previousType};
 },[value]);
 return <ThemeContext.Provider value={theme}><Context.Provider value={value}>{children}</Context.Provider></ThemeContext.Provider>;
}
export function CompanyJobHeading({fallbackName,fallbackLogo}:{fallbackName:string;fallbackLogo:string}){
 const value=useCompanyBranding(),theme=useContext(ThemeContext);return <><BrandAsset src={value?brandingLogo(value,theme):fallbackLogo} alt=""/><span>{value?.displayName||fallbackName}</span></>;
}
export function CompanyHomeBrand(){const value=useCompanyBranding();return <div className="home-company-mark"><BrandAsset src={value?.assets.logoMain?.url||'/brand/jobforged-symbol.svg'} alt="Logo da empresa"/><span><small>Visão geral de</small><strong>{value?.displayName||'Sua empresa'}</strong></span></div>}
export function CompanyHomeBanners(){
 const value=useCompanyBranding(),[index,setIndex]=useState(0),items=value?.banners.filter(b=>b.status==='Ativo'&&b.placement!=='Portal')||[],count=items.length;
 useEffect(()=>{if(count<2)return;const timer=setInterval(()=>setIndex(i=>(i+1)%count),7000);return()=>clearInterval(timer)},[count]);
 if(!value?.structure.showBanners||!count)return null;const banner=items[index%count];
 return <section className="home-banner" aria-label="Destaques da organização"><div className="home-banner-copy"><h2>{banner.title}</h2><p>{banner.description}</p>{banner.link&&<a href={banner.link}>{banner.buttonText}<ChevronRight/></a>}</div><div className="home-banner-art" aria-hidden="true"><BrandAsset src={banner.image||value.assets.logoMain?.url||'/brand/jobforged-symbol.svg'} alt=""/></div>{count>1&&<div className="home-banner-controls"><button aria-label="Banner anterior" onClick={()=>setIndex(i=>(i-1+count)%count)}><ChevronLeft/></button><span>{index%count+1}/{count}</span><button aria-label="Próximo banner" onClick={()=>setIndex(i=>(i+1)%count)}><ChevronRight/></button></div>}</section>;
}

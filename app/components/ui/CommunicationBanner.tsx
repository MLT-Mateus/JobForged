"use client";
import {useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {ActionButton,Panel} from './AdminPrimitives';
import {BrandAsset} from '../BrandAsset';
import './communications.css';
export type BannerSlide={id:string;title:string;description:string;image:string;mobileImage?:string;link?:string};
export function CommunicationBanner({items,view="responsive"}:{items:BannerSlide[];view?:"responsive"|"desktop"|"mobile"}){
 const [selected,setSelected]=useState(0);if(!items.length)return null;const index=selected%items.length,item=items[index];
 return <Panel className="jf-communication-banner" data-preview-view={view} aria-label="Comunicados JobForged" aria-roledescription="carrossel"><div className="jf-communication-banner__image"><picture>{view==="responsive"&&item.mobileImage&&<source media="(max-width: 680px)" srcSet={item.mobileImage}/>}<BrandAsset src={view==="mobile"?(item.mobileImage||item.image):item.image} alt=""/></picture></div><div className="jf-communication-banner__content"><div aria-live="polite" aria-atomic="true"><h2>{item.title}</h2><p>{item.description}</p></div><footer>{item.link?<a className="jf-action jf-action--secondary" href={item.link} target="_blank" rel="noopener noreferrer">Saiba mais<span className="jf-sr-only">: {item.title}</span></a>:<span/>}{items.length>1&&<nav aria-label="Selecionar banner"><ActionButton type="button" variant="quiet" aria-label="Banner anterior" onClick={()=>setSelected((index-1+items.length)%items.length)}><ChevronLeft/></ActionButton><span>{index+1} / {items.length}</span><ActionButton type="button" variant="quiet" aria-label="Próximo banner" onClick={()=>setSelected((index+1)%items.length)}><ChevronRight/></ActionButton></nav>}</footer></div></Panel>;
}

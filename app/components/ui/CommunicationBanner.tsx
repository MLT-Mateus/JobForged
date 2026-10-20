"use client";
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {ActionButton,Panel} from './AdminPrimitives';
import {BrandAsset} from '../BrandAsset';
import './communications.css';
export type BannerSlide={id:string;title:string;description:string;image:string;mobileImage?:string;link?:string;duration_seconds?:number};
function subscribePageReady(update:()=>void){window.addEventListener('jobforged-page-ready',update);window.addEventListener('load',update);return()=>{window.removeEventListener('jobforged-page-ready',update);window.removeEventListener('load',update)}}
function pageIsReady(){return document.readyState==='complete'&&document.documentElement.dataset.pageReady==='true'}
export function CommunicationBanner({items,view="responsive"}:{items:BannerSlide[];view?:"responsive"|"desktop"|"mobile"}){
 const [selected,setSelected]=useState(0),[loaded,setLoaded]=useState<string[]>([]),[available,setAvailable]=useState(false);
 const pageReady=useSyncExternalStore(subscribePageReady,pageIsReady,()=>false);
 const root=useRef<HTMLElement>(null),count=items.length,index=count?selected%count:0,item=items[index];
 const imageReady=loaded.includes(`${item?.id}:${item?.image}`);
 const seconds=item?.duration_seconds,duration=typeof seconds==='number'&&Number.isInteger(seconds)&&seconds>=5&&seconds<=120?seconds:8;
 useEffect(()=>{
  const element=root.current;if(!element||count<2)return;
  let visible=false;
  const update=()=>setAvailable(visible&&!document.hidden);
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting===true;update()});
  observer.observe(element);document.addEventListener('visibilitychange',update);
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};
 },[count]);
 useEffect(()=>{
  let active=true;const images=Array.from(root.current?.querySelectorAll<HTMLImageElement>('.jf-communication-banner__slide:not([hidden]) img')||[]),key=`${item?.id}:${item?.image}`;
  void Promise.all(images.map(image=>image.decode().catch(()=>{}))).then(()=>{if(active&&images.some(image=>image.complete&&image.naturalWidth>0))setLoaded(value=>value.includes(key)?value:[...value,key])});
  return()=>{active=false};
 },[item?.id,item?.image,item?.mobileImage,view]);
 useEffect(()=>{
  if(count<2||!available||!pageReady||!imageReady)return;
  const timer=window.setTimeout(()=>setSelected(value=>(value+1)%count),duration*1000);
  return()=>window.clearTimeout(timer);
 },[count,item?.id,selected,duration,available,pageReady,imageReady,item?.image]);
 if(!item)return null;
 const renderImage=(slide:BannerSlide)=><picture>{view==="responsive"&&slide.mobileImage&&<source media="(max-width: 680px)" srcSet={slide.mobileImage}/>}<BrandAsset src={view==="mobile"?(slide.mobileImage||slide.image):slide.image} alt={slide.title} loading={slide.id===items[0]?.id?"eager":"lazy"} onLoad={()=>setLoaded(value=>value.includes(`${slide.id}:${slide.image}`)?value:[...value,`${slide.id}:${slide.image}`])}/></picture>;
 return <Panel className="jf-communication-banner" data-preview-view={view} aria-label="Comunicados JobForged" aria-roledescription="carrossel">
 <div ref={element=>{root.current=element}} className="jf-communication-banner__image">{items.map((slide,i)=><div key={slide.id} hidden={i!==index} className="jf-communication-banner__slide">{slide.link?<a href={slide.link} target="_blank" rel="noopener noreferrer" aria-label={slide.title}>{renderImage(slide)}</a>:renderImage(slide)}</div>)}</div>
 {count>1&&<nav className="jf-communication-banner__navigation" aria-label="Navegar pelos banners"><span><ActionButton type="button" variant="secondary" aria-label="Banner anterior" onClick={()=>setSelected((index-1+count)%count)}><ChevronLeft aria-hidden="true"/></ActionButton></span><span><ActionButton type="button" variant="secondary" aria-label="Próximo banner" onClick={()=>setSelected((index+1)%count)}><ChevronRight aria-hidden="true"/></ActionButton></span></nav>}
 </Panel>;
}

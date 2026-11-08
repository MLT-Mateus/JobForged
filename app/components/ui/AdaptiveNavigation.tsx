"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Menu} from 'lucide-react';
import './adaptive-navigation.css';

/** Collapses when the actual labels no longer fit, independently of the viewport. */
export function AdaptiveNavigation({children,label,placement='below'}:{children:ReactNode;label:string;placement?:'above'|'below'}){
 const root=useRef<HTMLDivElement>(null),measure=useRef<HTMLDivElement>(null),menu=useRef<HTMLDetailsElement>(null);
 const [compact,setCompact]=useState(false);
 useEffect(()=>{
  const element=root.current,content=measure.current;if(!element||!content)return;
  const update=()=>setCompact(content.getBoundingClientRect().width>element.clientWidth);
  const observer=new ResizeObserver(update);observer.observe(element);observer.observe(content);update();
  return()=>observer.disconnect();
 },[children]);
 useEffect(()=>{if(!compact&&menu.current)menu.current.open=false},[compact]);
 useEffect(()=>{
  const element=root.current;if(!element)return;
  const close=(event:PointerEvent)=>{if(menu.current&&!element.contains(event.target as Node))menu.current.open=false};
  element.ownerDocument.addEventListener('pointerdown',close);
  return()=>element.ownerDocument.removeEventListener('pointerdown',close);
 },[]);
 return <div ref={root} className="jf-adaptive-nav" data-compact={compact} data-placement={placement}>
  <div className="jf-adaptive-nav__measure" ref={measure} aria-hidden="true" inert>{children}</div>
  <nav className="jf-adaptive-nav__inline" aria-label={label}>{children}</nav>
  <details ref={menu} className="jf-adaptive-nav__menu" onClick={event=>{if((event.target as Element).closest('a'))event.currentTarget.open=false}} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus()}}}>
   <summary className="jf-action jf-action--secondary" aria-label={`Abrir menu: ${label}`}><Menu size={18} aria-hidden="true"/><span>Menu</span></summary>
   <nav className="jf-adaptive-nav__list" aria-label={label}>{children}</nav>
  </details>
 </div>;
}

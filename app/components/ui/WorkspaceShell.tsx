"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from "lucide-react";
import { BrandAsset } from "../BrandAsset";
import { ThemeSelector, useThemePreference } from "./index";
import "../admin/admin.css";

type NavigationItem = {label:string;href:string;icon:LucideIcon;active?:boolean;onSelect?:()=>void};
export function WorkspaceShell({children,items,logo,fullLogo,brand,title,subtitle,footer,actions,style,collapsed:controlled,onCollapsedChange}:{children:ReactNode;items:NavigationItem[];logo:string;fullLogo?:string;brand:string;title:string;subtitle:string;footer?:ReactNode;actions?:ReactNode;style?:CSSProperties;collapsed?:boolean;onCollapsedChange?:(value:boolean)=>void}) {
 const [localCollapsed,setLocalCollapsed]=useState(false),[menu,setMenu]=useState(false);
 const collapsed=controlled??localCollapsed; const {theme,changeTheme}=useThemePreference();
 const trigger=useRef<HTMLButtonElement>(null),side=useRef<HTMLElement>(null);
 useEffect(()=>{const media=matchMedia("(min-width: 901px)");const update=()=>{if(media.matches)setMenu(false)};media.addEventListener("change",update);return()=>media.removeEventListener("change",update)},[]);
 const toggle=()=>{setLocalCollapsed(!collapsed);onCollapsedChange?.(!collapsed)};
 useEffect(()=>{if(!menu)return;const first=side.current?.querySelector<HTMLElement>('button.admin-close');first?.focus();const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(false);trigger.current?.focus();}if(e.key==='Tab'){const nodes=Array.from(side.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')??[]).filter(n=>n.offsetParent!==null);const a=nodes[0],b=nodes.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();b?.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a?.focus()}}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[menu]);
 return <main className={`admin-shell ${collapsed?'is-collapsed':''} ${fullLogo?'has-full-brand':''} ${menu?'is-menu-open':''}`} data-theme={theme} style={style}>
  <aside ref={side} id="workspace-navigation" className={`admin-sidebar ${menu?'is-open':''}`}><div className="admin-brand"><span>{fullLogo?<BrandAsset className="admin-brand__full-logo" src={fullLogo} alt={brand}/>:<><img src={logo} alt=""/><strong>{brand}</strong></>}</span><button type="button" className="jf-action jf-action--quiet" onClick={toggle} aria-label={collapsed?'Expandir menu':'Recolher menu'}>{collapsed?<PanelLeftOpen/>:<PanelLeftClose/>}</button><button type="button" className="jf-action jf-action--quiet admin-close" onClick={()=>{setMenu(false);trigger.current?.focus()}} aria-label="Fechar menu"><X/></button></div><nav aria-label="Navegação principal">{items.map(({label,href,icon:Icon,active,onSelect})=><a key={href} href={href} title={collapsed?label:undefined} className={active?'is-active':''} aria-current={active?'page':undefined} onClick={e=>{if(onSelect&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onSelect()}setMenu(false)}}><Icon/><span>{label}</span></a>)}</nav>{footer}</aside>
  {menu&&<button type="button" className="admin-scrim" onClick={()=>setMenu(false)} aria-label="Fechar menu"/>}
  <section className="admin-workspace" inert={menu||undefined}><header className="admin-topbar"><button ref={trigger} type="button" className="jf-action jf-action--quiet admin-menu" onClick={()=>setMenu(true)} aria-label="Abrir menu" aria-expanded={menu} aria-controls="workspace-navigation"><Menu/></button><div className="admin-org">{fullLogo?<span className="admin-org__brand-icon"><BrandAsset src={logo} alt={brand}/></span>:<img src={logo} alt=""/>}<span><small>{subtitle}</small><strong>{title}</strong></span></div><div><ThemeSelector theme={theme} onChange={changeTheme}/>{actions}</div></header><div className="admin-content">{children}</div></section>
 </main>;
}

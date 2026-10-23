"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { ActionButton } from "./AdminPrimitives";
import "./widgets.css";

const workspaceLocks = new WeakMap<HTMLElement, { count: number; previous: string }>();
function lockWorkspace(workspace: HTMLElement) {
 const lock = workspaceLocks.get(workspace) ?? { count: 0, previous: workspace.style.overflow };
 lock.count += 1; workspaceLocks.set(workspace, lock); workspace.style.overflow = "hidden";
 let released = false;
 return () => { if (released) return; released = true; lock.count -= 1; if (!lock.count) { workspace.style.overflow = lock.previous; workspaceLocks.delete(workspace); } };
}

export function WidgetGroup({variant="card",children,className=""}:{variant?:"card"|"outline"|"plain";children:ReactNode;className?:string}) {return <div className={`jf-widget jf-widget--${variant} ${className}`}>{children}</div>}
export function WidgetDivider({label}:{label?:string}) {return <div className="jf-widget-divider">{label&&<span>{label}</span>}</div>}
export function WidgetDialog({open,onClose,title,description,kind="modal",size="default",children,footer}:{open:boolean;onClose:()=>void;title:string;description?:string;kind?:"modal"|"drawer"|"sheet";size?:"default"|"wide";children:ReactNode;footer?:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null),id=useId(),drag=useRef({start:0,delta:0,time:0}),unlock=useRef<()=>void>(()=>{});
 useEffect(()=>{
  const dialog=ref.current;if(!dialog)return;
  let timer:ReturnType<typeof setTimeout>;
  if(open){
   if(!dialog.open){dialog.showModal();const workspace=document.querySelector<HTMLElement>('.admin-workspace');if(workspace)unlock.current=lockWorkspace(workspace)}
   dialog.dataset.state='open';dialog.style.removeProperty('--sheet-drag');dialog.focus({preventScroll:true});
  }else if(dialog.open){dialog.dataset.state='closing';timer=setTimeout(()=>{dialog.close();unlock.current()},matchMedia('(prefers-reduced-motion: reduce)').matches?0:200)}
  return()=>clearTimeout(timer);
 },[open]);
 useEffect(()=>()=>{ref.current?.close();unlock.current()},[]);
 useEffect(()=>{if(!open)return;const update=()=>ref.current?.style.setProperty('--widget-viewport',`${window.visualViewport?.height??window.innerHeight}px`);update();window.visualViewport?.addEventListener('resize',update);return()=>window.visualViewport?.removeEventListener('resize',update)},[open]);
 function finishDrag(){const dialog=ref.current;if(!dialog)return;const {delta,time}=drag.current;dialog.removeAttribute('data-dragging');if(delta>80||(delta>28&&delta/Math.max(1,performance.now()-time)>.55))onClose();else dialog.style.setProperty('--sheet-drag','0px')}
 return <dialog ref={ref} tabIndex={-1} className={`jf-widget-dialog jf-widget-dialog--${kind} jf-widget-dialog--${size}`} aria-labelledby={id} aria-describedby={description?`${id}-description`:undefined} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget){const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)onClose()}}}>
  {kind==='sheet'&&<button type="button" className="jf-sheet-grip" aria-label="Fechar painel; também é possível arrastar para baixo" onClick={e=>{if(drag.current.delta>4){e.preventDefault();return}onClose()}} onPointerDown={e=>{drag.current={start:e.clientY,delta:0,time:performance.now()};e.currentTarget.setPointerCapture(e.pointerId);ref.current?.setAttribute('data-dragging','true')}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;drag.current.delta=Math.max(0,e.clientY-drag.current.start);ref.current?.style.setProperty('--sheet-drag',`${drag.current.delta}px`)}} onPointerUp={finishDrag} onPointerCancel={()=>{ref.current?.removeAttribute('data-dragging');ref.current?.style.setProperty('--sheet-drag','0px')}}><span className="jf-sheet-handle"/></button>}
  <header className="jf-widget-dialog__header"><div><h3 id={id}>{title}</h3>{description&&<p id={`${id}-description`}>{description}</p>}</div><ActionButton variant="quiet" aria-label="Fechar" onClick={onClose}><X/></ActionButton></header><div className="jf-widget-dialog__body">{children}</div>{footer&&<footer className="jf-widget-dialog__footer">{footer}</footer>}
 </dialog>;
}

export function FocusPopover({label,children,triggerContent,triggerVariant="secondary",triggerClassName="",align="start"}:{align?:"start"|"end";label:string;children:ReactNode;triggerContent?:ReactNode;triggerVariant?:"secondary"|"quiet";triggerClassName?:string}) {
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),id=useId();
 useEffect(()=>{if(!open)return;panel.current?.focus();const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}},[open]);
 return <div className={`jf-focus-group jf-focus-group--${align}`} ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}><button ref={trigger} type="button" className={`jf-action jf-action--${triggerVariant} ${triggerClassName}`} title={label} aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={()=>setOpen(v=>!v)}>{triggerContent??label}</button>{open&&<div id={id} ref={panel} tabIndex={-1} role="dialog" aria-label={label} className="jf-focus-group__panel">{children}<ActionButton variant="quiet" onClick={()=>{setOpen(false);trigger.current?.focus()}}>Concluir</ActionButton></div>}</div>;
}

export function EditorAccordion({title,icon,children,defaultOpen=false}:{title:string;icon?:ReactNode;children:ReactNode;defaultOpen?:boolean}) {
 const [open,setOpen]=useState(defaultOpen);
 return <details className="jf-editor-accordion" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{icon}<span>{title}</span><ChevronDown aria-hidden="true"/></summary><div className="jf-editor-accordion__body">{children}</div></details>;
}
export function EditorWorkbench({editor,preview}:{editor:ReactNode;preview:ReactNode}) {
 return <div className="jf-editor-workbench"><div className="jf-editor-workbench__form">{editor}</div><div className="jf-editor-workbench__preview">{preview}</div></div>;
}

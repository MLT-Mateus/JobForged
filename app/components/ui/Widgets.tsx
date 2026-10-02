"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ActionButton } from "./AdminPrimitives";
import "./widgets.css";

export function WidgetGroup({variant="card",children,className=""}:{variant?:"card"|"outline"|"plain";children:ReactNode;className?:string}) {return <div className={`jf-widget jf-widget--${variant} ${className}`}>{children}</div>}
export function WidgetDivider({label}:{label?:string}) {return <div className="jf-widget-divider">{label&&<span>{label}</span>}</div>}
export function WidgetDialog({open,onClose,title,description,kind="modal",children,footer}:{open:boolean;onClose:()=>void;title:string;description?:string;kind?:"modal"|"drawer"|"sheet";children:ReactNode;footer?:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();else if(!open&&dialog.open)dialog.close();return()=>{if(dialog.open)dialog.close()}},[open]);
 return <dialog ref={ref} className={`jf-widget-dialog jf-widget-dialog--${kind}`} aria-labelledby={id} aria-describedby={description?`${id}-description`:undefined} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget){const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)onClose()}}}>
  {kind==='sheet'&&<div className="jf-sheet-handle" aria-hidden="true"/>}<header className="jf-widget-dialog__header"><div><h3 id={id}>{title}</h3>{description&&<p id={`${id}-description`}>{description}</p>}</div><ActionButton variant="quiet" autoFocus aria-label="Fechar" onClick={onClose}><X/></ActionButton></header><div className="jf-widget-dialog__body">{children}</div>{footer&&<footer className="jf-widget-dialog__footer">{footer}</footer>}
 </dialog>;
}
export function FocusPopover({label,children}:{label:string;children:ReactNode}) {
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),id=useId();
 useEffect(()=>{if(!open)return;panel.current?.focus();const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}},[open]);
 return <div className="jf-focus-group" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}><button ref={trigger} type="button" className="jf-action jf-action--secondary" aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={()=>setOpen(v=>!v)}>{label}</button>{open&&<div id={id} ref={panel} tabIndex={-1} role="dialog" aria-label={label} className="jf-focus-group__panel">{children}<ActionButton variant="quiet" onClick={()=>{setOpen(false);trigger.current?.focus()}}>Concluir</ActionButton></div>}</div>;
}

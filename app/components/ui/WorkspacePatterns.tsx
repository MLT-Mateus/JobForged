"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleAlert, Inbox, MoreHorizontal, ShieldCheck } from "lucide-react";
import { JobForgedLoadingAnimation } from "../JobForgedLoadingAnimation";
import { ActionButton } from "./AdminPrimitives";
import { useStatusSoundForMessage } from "./status-sound";

/** Shared page feedback; never substitutes for server-side authorization. */
export function WorkspaceState({ kind = "loading", title, description, action }: { kind?: "loading" | "error" | "empty" | "forbidden"; title: string; description?: string; action?: ReactNode }) {
  useStatusSoundForMessage(kind === "error" ? title : "", "danger");
  const Icon = kind === "error" ? CircleAlert : kind === "forbidden" ? ShieldCheck : Inbox;
  return <section className={`jf-workspace-state jf-workspace-state--${kind}`} aria-busy={kind === "loading"} role={kind === "error" ? "alert" : "status"}>
    {kind === "loading" ? <JobForgedLoadingAnimation size={48}/> : <Icon size={28} aria-hidden="true"/>}
    <strong>{title}</strong>{description && <p>{description}</p>}{action}
  </section>;
}

export function WorkspaceTabs<T extends string>({ label, items, value, onValueChange }: { label: string; items: ReadonlyArray<{ id: T; label: string; icon?: ReactNode; decoration?: ReactNode }>; value: T; onValueChange: (value: T) => void }) {
  return <nav className="jf-workspace-tabs" aria-label={label}>{items.map(({id,label: text,icon,decoration}) => <ActionButton key={id} variant="quiet" aria-pressed={value === id} onClick={() => onValueChange(id)}>{icon}<span>{text}</span>{decoration}</ActionButton>)}</nav>;
}

export function WorkspaceActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open,setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('.jf-action-menu__panel a, .jf-action-menu__panel button')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown",outside); document.addEventListener("keydown",key);
    return () => { document.removeEventListener("pointerdown",outside); document.removeEventListener("keydown",key); };
  }, [open]);
  return <div className="jf-action-menu" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="jf-action jf-action--quiet" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><MoreHorizontal size={18}/></button>
    {open && <div id={id} className="jf-action-menu__panel" role="group" aria-label={label} onClick={() => { setOpen(false); trigger.current?.focus(); }}>{children}</div>}
  </div>;
}

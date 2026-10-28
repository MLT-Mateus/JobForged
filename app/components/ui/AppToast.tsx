"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { playStatusSound } from "./status-sound";
import { toastChannel, type ActiveToast } from './toast-channel';

export type ToastKind = "success" | "info" | "warning" | "danger";

export type ToastNotice = {
  id?: number;
  kind: ToastKind;
  title: string;
  text: string;
  action?: { label: string; href: string; newTab?: boolean };
};

let nextNoticeId = 0;
export function createToastNotice(notice: Omit<ToastNotice, "id">): ToastNotice {
  return { ...notice, id: ++nextNoticeId };
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === "success") return <CircleCheck size={19} aria-hidden="true" />;
  if (kind === "warning") return <CircleAlert size={19} aria-hidden="true" />;
  if (kind === "danger") return <CircleX size={19} aria-hidden="true" />;
  return <Info size={19} aria-hidden="true" />;
}

/** Compatibility API: callers publish feedback; the root host renders it once. */
export function AppToast({ notice, onClose }: { notice: ToastNotice; onClose: () => void }) {
  const owner = useId();
  const { id, kind, title, text, action } = notice;
  const actionLabel = action?.label, actionHref = action?.href, newTab = action?.newTab;
  useEffect(() => toastChannel.registerClose(owner, onClose), [owner, onClose]);
  useEffect(() => {
    toastChannel.publish(owner, { id, kind, title, text, action: actionLabel && actionHref ? { label: actionLabel, href: actionHref, newTab } : undefined });
    return () => toastChannel.release(owner);
  }, [owner, id, kind, title, text, actionLabel, actionHref, newTab]);
  return null;
}

const serverSnapshot = () => null;
let modalStack: HTMLDialogElement[] = [];
const portalTarget = () => modalStack.filter(dialog => dialog.open && dialog.isConnected).at(-1) ?? document.querySelector<HTMLDialogElement>('dialog[open]') ?? document.body;
const subscribeToDialogs = (listener: () => void) => {
  const changed = (event: Event) => {
    if (!(event.target instanceof HTMLDialogElement)) return;
    modalStack = modalStack.filter(dialog => dialog !== event.target && dialog.open && dialog.isConnected);
    if (event.target.open) modalStack.push(event.target);
    listener();
  };
  document.addEventListener('toggle', changed, true);
  return () => document.removeEventListener('toggle', changed, true);
};
export function AppToastHost() {
  const active = useSyncExternalStore(toastChannel.subscribe, toastChannel.getSnapshot, serverSnapshot);
  const target = useSyncExternalStore(subscribeToDialogs, portalTarget, serverSnapshot);
  return active && target ? <ToastView key={active.serial} active={active} target={target} /> : null;
}

function ToastView({ active, target }: { active: ActiveToast; target: HTMLElement }) {
  const { notice, serial } = active;
  const urgent = notice.kind === "danger" || notice.kind === "warning";
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Native dialogs occupy the browser top layer; a body z-index cannot cover
  // them. A manual popover stays fixed to the viewport and inside modal focus.
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof node.showPopover !== 'function') return;
    node.showPopover();
    return () => { if (node.matches(':popover-open')) node.hidePopover(); };
  }, [target]);
  useEffect(() => { playStatusSound(notice.kind); }, [notice.kind]);
  useEffect(() => {
    if (paused || notice.action) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(() => toastChannel.dismiss(serial), urgent ? 10000 : 6000);
    };
    schedule(); document.addEventListener('visibilitychange', schedule);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [paused, notice.action, serial, urgent]);

  return createPortal(
    <div ref={ref} popover="manual" className={`jf-toast jf-toast--${notice.kind}`} role={urgent ? "alert" : "status"} aria-live={urgent ? "assertive" : "polite"} aria-atomic="true" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <span className="jf-toast__icon"><ToastIcon kind={notice.kind} /></span>
      <div>
        <strong>{notice.title}</strong>
        <span>{notice.text}</span>
        {notice.action && <div className="jf-toast__action"><a className="jf-action jf-action--secondary" href={notice.action.href} target={notice.action.newTab ? '_blank' : undefined} rel={notice.action.newTab ? 'noopener noreferrer' : undefined}>{notice.action.label}</a></div>}
      </div>
      <button type="button" onClick={() => toastChannel.dismiss(serial)} aria-label="Fechar alerta">
        <CircleX size={17} aria-hidden="true" />
      </button>
    </div>,
    target,
  );
}

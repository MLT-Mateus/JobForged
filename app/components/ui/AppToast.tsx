"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { playStatusSound } from "./status-sound";

export type ToastKind = "success" | "info" | "warning" | "danger";

export type ToastNotice = {
  id?: number;
  kind: ToastKind;
  title: string;
  text: string;
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

const subscribeToMount = () => () => {};
const clientMounted = () => true;
const serverMounted = () => false;

export function AppToast({ notice, onClose }: { notice: ToastNotice; onClose: () => void }) {
  const urgent = notice.kind === "danger" || notice.kind === "warning";
  const mounted = useSyncExternalStore(subscribeToMount, clientMounted, serverMounted);

  useEffect(() => {
    playStatusSound(notice.kind);
  }, [notice.id, notice.kind, notice.title, notice.text]);

  if (!mounted) return null;

  return createPortal(
    <div className={`jf-toast jf-toast--${notice.kind}`} role={urgent ? "alert" : "status"} aria-live={urgent ? "assertive" : "polite"}>
      <span className="jf-toast__icon"><ToastIcon kind={notice.kind} /></span>
      <div>
        <strong>{notice.title}</strong>
        <span>{notice.text}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Fechar alerta">
        <CircleX size={17} aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}

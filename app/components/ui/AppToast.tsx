"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";

export type ToastKind = "success" | "info" | "warning" | "danger";

export type ToastNotice = {
  kind: ToastKind;
  title: string;
  text: string;
};

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === "success") return <CircleCheck size={19} aria-hidden="true" />;
  if (kind === "warning") return <CircleAlert size={19} aria-hidden="true" />;
  if (kind === "danger") return <CircleX size={19} aria-hidden="true" />;
  return <Info size={19} aria-hidden="true" />;
}

export function AppToast({ notice, onClose }: { notice: ToastNotice; onClose: () => void }) {
  const urgent = notice.kind === "danger" || notice.kind === "warning";
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

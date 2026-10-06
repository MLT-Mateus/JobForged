import type { ReactNode } from "react";
import "./phone-frame.css";

/** Shared device frame used by the LP and the Design System. */
export function PhoneFrame({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return <div className={`jf-phone-frame ${className}`} role={label ? "group" : undefined} aria-label={label}>
    <div className="jf-phone-frame__notch" aria-hidden="true" />
    <div className="jf-phone-frame__screen">{children}</div>
    <span className="jf-phone-frame__home" aria-hidden="true" />
  </div>;
}

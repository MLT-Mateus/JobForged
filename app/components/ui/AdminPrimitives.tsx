"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ActionButton({ variant = "primary", icon, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" | "accent" | "inverse"; icon?: ReactNode }) {
  return <button {...props} className={`jf-action jf-action--${variant} ${props.className ?? ""}`.trim()}>{icon}{children}</button>;
}

export function StatusBadge({ tone = "neutral", children }: { tone?: "positive" | "warning" | "danger" | "info" | "neutral"; children: ReactNode }) {
  return <span className={`jf-status jf-status--${tone}`}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="jf-empty"><span><Inbox /></span><strong>{title}</strong><p>{description}</p>{action}</div>;
}

export function DataTable({ headers, children, label }: { headers: string[]; children: ReactNode; label: string }) {
  return <div className="jf-table-wrap"><table className="jf-table" aria-label={label}><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return <article className="jf-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

export function Panel({as:Tag="section",className="",...props}:HTMLAttributes<HTMLElement>&{as?:"section"|"article"|"aside"}) {
 return <Tag {...props} className={`jf-panel ${className}`.trim()}/>;
}

export function WorkspacePageHeader({ section, title, description, action, back, meta }: { section: string; title: string; description?: string; action?: ReactNode; back?: { href: string; label: string }; meta?: ReactNode }) {
  return <header className="jf-page-head"><div>{back && <Link className="jf-page-head__back" href={back.href}><ArrowLeft size={16}/>{back.label}</Link>}<span className="jf-page-head__section">{section}</span>{meta && <div className="jf-page-head__meta">{meta}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="jf-page-head__actions">{action}</div>}</header>;
}

export function PanelHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="jf-panel-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>;
}

export function InlineNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "danger" | "success" }) {
  return <p className={`jf-inline-notice jf-inline-notice--${tone}`} role={tone === "danger" ? "alert" : "status"}>{children}</p>;
}

"use client";
import "./globals.css";
import "./components/ui/ui.css";
import {useEffect} from "react";
import {clientFailureKind} from "@/shared/client-error.mjs";
import { SystemPage } from "@/app/components/system/SystemPage";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const kind=clientFailureKind(error); useEffect(()=>{console.error(`[JobForged] ${kind}`)},[kind]); return <html lang="pt-BR"><body><SystemPage code={500} reset={kind==="outdated-assets"?()=>window.location.reload():reset} /></body></html>;
}

"use client";
import {useEffect} from "react";
import {clientFailureKind} from "@/shared/client-error.mjs";
import { SystemPage } from "@/app/components/system/SystemPage";
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) { const kind=clientFailureKind(error); useEffect(()=>{console.error(`[JobForged] ${kind}`)},[kind]); return <SystemPage code={500} reset={kind==="outdated-assets"?()=>window.location.reload():reset} />; }

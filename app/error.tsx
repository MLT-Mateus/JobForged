"use client";
import { SystemPage } from "@/app/components/system/SystemPage";
export default function ErrorPage({ reset }: { reset: () => void }) { return <SystemPage code={500} reset={reset} />; }

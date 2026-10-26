"use client";
import "./globals.css";
import "./components/ui/ui.css";
import { SystemPage } from "@/app/components/system/SystemPage";
export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="pt-BR"><body><SystemPage code={500} reset={reset} /></body></html>;
}

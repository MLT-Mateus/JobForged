import type { Metadata } from "next";
import { PasswordRecoveryClient } from "@/app/components/auth/AuthClient";
export const metadata: Metadata = { title: "JobForged | Recuperar acesso", robots: { index: false, follow: false } };
export default function Page() { return <PasswordRecoveryClient />; }

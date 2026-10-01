import type { Metadata } from "next";
import { PasswordRecoveryClient } from "@/app/components/auth/AuthClient";
export const metadata: Metadata = { title: "JobForged | Recuperar acesso" };
export default function Page() { return <PasswordRecoveryClient />; }

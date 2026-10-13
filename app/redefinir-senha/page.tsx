import type { Metadata } from "next";
import { PasswordRecoveryClient } from "@/app/components/auth/AuthClient";
export const metadata: Metadata = { title: "JobForged | Redefinir senha", robots: { index: false, follow: false } };
export default function Page() { return <PasswordRecoveryClient reset />; }

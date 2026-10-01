import type { Metadata } from "next";
import { PasswordRecoveryClient } from "@/app/components/auth/AuthClient";
export const metadata: Metadata = { title: "JobForged | Redefinir senha" };
export default function Page() { return <PasswordRecoveryClient reset />; }

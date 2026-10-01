import type { Metadata } from "next";
import { PasswordRecoveryClient } from "@/app/components/auth/AuthClient";
export const metadata: Metadata = { title: "Recuperar acesso | JobForged" };
export default function Page() { return <PasswordRecoveryClient />; }

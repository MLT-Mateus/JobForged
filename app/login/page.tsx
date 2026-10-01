import type { Metadata } from "next";
import { LoginClient } from "@/app/components/auth/AuthClient";

export const metadata: Metadata = { title: "JobForged | Entrar", description: "Acesso empresarial à plataforma JobForged." };
export default function LoginPage() { return <LoginClient/>; }


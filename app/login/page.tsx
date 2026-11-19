import type { Metadata } from "next";
import { LoginClient } from "@/app/components/auth/AuthClient";

export const metadata: Metadata = { title: "JobForged | Entrar", description: "Acesso empresarial à plataforma JobForged." };
export default async function LoginPage({searchParams}:{searchParams:Promise<{emailChanged?:string}>}) {
 const query=await searchParams;
 return <LoginClient emailChanged={query.emailChanged==='1'}/>;
}


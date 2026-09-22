import type { Metadata } from "next";
import { SignupClient } from "@/app/components/auth/AuthClient";

export const metadata: Metadata = { title: "Cadastrar empresa | JobForged", description: "Adesão empresarial à plataforma JobForged." };
export default function SignupPage() { return <SignupClient/>; }


import type { Metadata } from "next";
import { SignupClient } from "@/app/components/auth/AuthClient";

export const metadata: Metadata = { title: "JobForged | Cadastro Freemium", description: "Crie a conta empresarial Freemium da JobForged.", robots: { index: false, follow: false } };

export default function SignupPage() {
  return <SignupClient />;
}

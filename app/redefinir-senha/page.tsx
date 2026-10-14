import type { Metadata } from "next";
import { PasswordRecoveryClient } from "@/app/components/auth/AuthClient";
export const metadata: Metadata = { title: "JobForged | Redefinir senha" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const params = await searchParams;
  return <PasswordRecoveryClient reset initialTokenHash={params.token_hash ?? ""} recoveryType={params.type ?? ""} />;
}

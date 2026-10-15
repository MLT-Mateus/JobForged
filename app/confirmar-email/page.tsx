import type { Metadata } from "next";
import { ConfirmEmailClient } from "@/app/components/auth/ConfirmEmailClient";

export const metadata: Metadata = { title: "JobForged | Confirmar e-mail" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const params = await searchParams;
  return <ConfirmEmailClient tokenHash={params.token_hash ?? ""} type={params.type ?? ""} />;
}

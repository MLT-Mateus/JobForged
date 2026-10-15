import type { Metadata } from "next";
import { CompanyInvitationClient } from "@/app/components/auth/CompanyInvitationClient";

export const metadata: Metadata = { title: "JobForged | Convite empresarial" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <CompanyInvitationClient token={params.token ?? ""} />;
}

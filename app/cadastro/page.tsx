import type { Metadata } from "next";
import { isPlanId } from "@/app/data/plans";
import { SignupClient } from "@/app/components/auth/AuthClient";

export const metadata: Metadata = { title: "JobForged | Cadastro", description: "Adesão empresarial à plataforma JobForged." };
export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const direct = (Array.isArray(query.plano) ? query.plano[0] : query.plano) ?? null;
  const cycle = Array.isArray(query.ciclo) ? query.ciclo[0] : query.ciclo;
  const conceptual = `${direct}-${cycle}`;
  const initialPlanId = isPlanId(direct) ? direct : isPlanId(conceptual) ? conceptual : "profissional-anual";
  return <SignupClient initialPlanId={initialPlanId}/>;
}


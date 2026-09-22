export type PlanId = "basico-mensal" | "basico-anual" | "profissional-mensal" | "profissional-anual";

export type CommercialPlan = {
  id: PlanId;
  name: "Básico" | "Profissional";
  billing: "Mensal" | "Anual";
  price: string;
  suffix: "/mês" | "/ano";
};

export const commercialPlans: CommercialPlan[] = [
  { id: "basico-mensal", name: "Básico", billing: "Mensal", price: "288,00", suffix: "/mês" },
  { id: "basico-anual", name: "Básico", billing: "Anual", price: "248,00", suffix: "/ano" },
  { id: "profissional-mensal", name: "Profissional", billing: "Mensal", price: "496,00", suffix: "/mês" },
  { id: "profissional-anual", name: "Profissional", billing: "Anual", price: "449,00", suffix: "/ano" },
];

export const plansById = Object.fromEntries(commercialPlans.map((plan) => [plan.id, plan])) as Record<PlanId, CommercialPlan>;

export function isPlanId(value: string | null): value is PlanId {
  return commercialPlans.some((plan) => plan.id === value);
}


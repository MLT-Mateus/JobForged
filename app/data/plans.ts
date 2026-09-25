export type PlanId = "basico-mensal" | "basico-anual" | "profissional-mensal" | "profissional-anual";

export type CommercialPlan = {
  id: PlanId;
  name: "Básico" | "Profissional";
  billing: "Mensal" | "Anual";
  price: string;
  suffix: "/mês" | "/ano";
  benefits: string[];
};

export const commercialPlans: CommercialPlan[] = [
  { id: "basico-mensal", name: "Básico", billing: "Mensal", price: "288,00", suffix: "/mês", benefits:["Página de carreiras com sua marca","Gestão de vagas e candidatos","Pipeline de recrutamento"] },
  { id: "basico-anual", name: "Básico", billing: "Anual", price: "248,00", suffix: "/ano", benefits:["Página de carreiras com sua marca","Gestão de vagas e candidatos","Pipeline de recrutamento"] },
  { id: "profissional-mensal", name: "Profissional", billing: "Mensal", price: "496,00", suffix: "/mês", benefits:["Todos os recursos do Básico","Triagem e automações inteligentes","Experiência white label completa"] },
  { id: "profissional-anual", name: "Profissional", billing: "Anual", price: "449,00", suffix: "/ano", benefits:["Todos os recursos do Básico","Triagem e automações inteligentes","Experiência white label completa"] },
];

export const plansById = Object.fromEntries(commercialPlans.map((plan) => [plan.id, plan])) as Record<PlanId, CommercialPlan>;

export function isPlanId(value: string | null): value is PlanId {
  return commercialPlans.some((plan) => plan.id === value);
}

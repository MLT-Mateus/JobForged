import type { HomePermission } from "@/app/home/types";

export type AdminModuleId = "dashboards" | "vagas" | "candidaturas" | "agenda" | "personalizacao" | "administradores" | "financeiro" | "configuracoes" | "minha-conta";
export type AdminPermission = HomePermission | "finance.view" | "admins.manage" | "organization.edit" | "candidates.manage";

export const activeOrganization = { id: "org_jobforged_demo", name: "Inside Forge Tecnologia", shortName: "Inside Forge", logo: "/brand/jobforged-symbol.svg" };
export const currentAdmin = { id: "usr_mateus", name: "Mateus", fullName: "Mateus Batista", email: "mateus@insideforge.com.br", phone: "+55 61 99163-0130", role: "Titular da conta", initials: "MB", permissions: ["home.metrics.view","home.activities.view","home.onboarding.view","home.onboarding.continue","vacancies.create","finance.view","admins.manage","organization.edit","candidates.manage"] as AdminPermission[] };

export const vacancies = [
  { id:"vac_1", title:"Analista de Customer Success", area:"Experiência do cliente", model:"Híbrido", status:"Publicada", applications:142, quality:92 },
  { id:"vac_2", title:"Desenvolvedor de Projetos", area:"Tecnologia", model:"Remoto", status:"Publicada", applications:98, quality:88 },
  { id:"vac_3", title:"Pessoa Analista de RH", area:"Pessoas", model:"Presencial", status:"Pausada", applications:76, quality:84 },
  { id:"vac_4", title:"Executivo Comercial", area:"Comercial", model:"Híbrido", status:"Rascunho", applications:0, quality:67 },
];

export const candidates = [
  { id:"can_1", name:"Mariana Costa", vacancy:"Analista de Customer Success", stage:"Entrevista", score:91, applied:"Hoje, 09:42" },
  { id:"can_2", name:"Lucas Ferreira", vacancy:"Desenvolvedor de Projetos", stage:"Triagem", score:87, applied:"Hoje, 08:18" },
  { id:"can_3", name:"Beatriz Almeida", vacancy:"Pessoa Analista de RH", stage:"Avaliação", score:84, applied:"Ontem, 16:35" },
  { id:"can_4", name:"Rafael Lima", vacancy:"Analista de Customer Success", stage:"Novos", score:79, applied:"Ontem, 14:10" },
  { id:"can_5", name:"Carla Mendes", vacancy:"Desenvolvedor de Projetos", stage:"Proposta", score:93, applied:"18 set, 11:20" },
];

export const team = [
  { id:"adm_1", name:"Mateus Batista", email:"mateus@insideforge.com.br", role:"Titular", status:"Ativo", access:"Agora", vacancies:8 },
  { id:"adm_2", name:"Beatriz Souza", email:"beatriz@insideforge.com.br", role:"Recrutadora", status:"Ativo", access:"Há 18 min", vacancies:5 },
  { id:"adm_3", name:"André Martins", email:"andre@insideforge.com.br", role:"Avaliador", status:"Ativo", access:"Ontem", vacancies:3 },
  { id:"adm_4", name:"Larissa Rocha", email:"larissa@insideforge.com.br", role:"Administradora", status:"Convite pendente", access:"—", vacancies:0 },
];

export const invoices = [
  { id:"fat_1048", reference:"Setembro de 2026", due:"10/09/2026", amount:"R$ 449,00", status:"Pago" },
  { id:"fat_1011", reference:"Agosto de 2026", due:"10/08/2026", amount:"R$ 449,00", status:"Pago" },
  { id:"fat_976", reference:"Julho de 2026", due:"10/07/2026", amount:"R$ 449,00", status:"Pago" },
];

export const moduleCopy: Record<AdminModuleId,{title:string;description:string}> = {
  dashboards:{title:"Dashboards",description:"Indicadores que ajudam sua equipe a entender desempenho, conversão e ritmo de contratação."},
  vagas:{title:"Vagas",description:"Crie, publique e acompanhe todas as oportunidades da organização."},
  candidaturas:{title:"Candidaturas",description:"Centralize candidatos, avaliações e movimentações do processo seletivo."},
  agenda:{title:"Agenda",description:"Organize entrevistas, testes e compromissos do time de recrutamento."},
  personalizacao:{title:"Personalização",description:"Aplique a identidade da sua organização em toda a experiência de recrutamento."},
  administradores:{title:"Administradores",description:"Gerencie as pessoas que participam da operação e seus acessos."},
  financeiro:{title:"Financeiro",description:"Acompanhe plano, consumo, faturas e informações contratuais."},
  configuracoes:{title:"Configurações",description:"Defina dados e preferências gerais da organização."},
  "minha-conta":{title:"Minha Conta",description:"Gerencie seus dados pessoais, preferências e segurança de acesso."},
};

export async function getAdminContext(organizationId: string) {
  if (organizationId !== activeOrganization.id) return null;
  return { organization: activeOrganization, user: currentAdmin, vacancies, candidates, team, invoices };
}

import type { AdminModuleId } from "./admin-data";

export type WorkspaceModule = AdminModuleId | "home";
export type FeatureAvailability = {
  status: "beta" | "soon" | "available";
  description: string;
};

// Keep the navigation and the page notice in sync until each module is
// backed by real organization data and has been verified in Test.
export const featureAvailability: Record<WorkspaceModule, FeatureAvailability> = {
  home: {
    status: "beta",
    description: "Indicadores, atividades e dados da organização são exemplos. A Home ainda não mostra os dados da sua empresa.",
  },
  dashboards: {
    status: "soon",
    description: "Os números e gráficos são uma prévia. Indicadores reais ainda não estão disponíveis.",
  },
  vagas: {status: "available", description: "Vagas salvas por empresa e publicadas na página de carreiras."},
  candidaturas: {
    status: "soon",
    description: "Os candidatos exibidos são exemplos. A gestão real de candidaturas ainda não está disponível.",
  },
  agenda: {
    status: "soon",
    description: "Calendário e eventos são uma prévia. Agendamentos reais ainda não estão disponíveis.",
  },
  personalizacao: {
    status: "beta",
    description: "Rascunhos, publicações e histórico são salvos por empresa. O painel recebe a identidade publicada; o portal público permanece em breve.",
  },
  administradores: {
    status: "available",
    description: "Equipe real da empresa: titulares e administradores podem convidar, alterar e suspender acessos. Convites expiram em 24 horas.",
  },
  financeiro: {
    status: "soon",
    description: "Plano, consumo e faturas são exemplos. Eles não representam cobranças reais da sua empresa.",
  },
  configuracoes: {
    status: "available",
    description: "Os dados cadastrais da empresa são reais e auditáveis. Preferências de recrutamento ainda estão em desenvolvimento.",
  },
  "minha-conta": {
    status: "available",
    description: "Nome, empresa, função e e-mail são reais. Você pode editar seu nome e solicitar alteração de senha; mudança de e-mail ainda não está disponível.",
  },
};

export function availabilityLabel(status: FeatureAvailability["status"]) {
  return status === "beta" ? "Beta" : "Em breve";
}

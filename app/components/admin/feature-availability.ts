import type { AdminModuleId } from "./admin-data";

export type WorkspaceModule = AdminModuleId | "home";
export type FeatureAvailability = {
  status: "available";
  description: string;
};

// Keep the navigation and the page notice in sync until each module is
// backed by real organization data and has been verified in Test.
export const featureAvailability: Record<WorkspaceModule, FeatureAvailability> = {
  filiais:{status:'available',description:'Unidades, endereços e fotos da empresa.'},
  home: {
    status: "available",
    description: "Indicadores e atividades da empresa.",
  },
  dashboards: {
    status: "available",
    description: "Indicadores do recrutamento da empresa.",
  },
  vagas: {status: "available", description: "Vagas salvas por empresa e publicadas na página de carreiras."},
  candidaturas: {
    status: "available",
    description: "Candidaturas independentes por vaga e histórico de seleção.",
  },
  agenda: {
    status: "available",
    description: "Entrevistas, responsáveis e lembretes internos.",
  },
  personalizacao: {
    status: "available",
    description: "Identidade visual, domínio e página pública da empresa.",
  },
  administradores: {
    status: "available",
    description: "Equipe real da empresa: titulares e administradores podem convidar, alterar e suspender acessos. Convites expiram em 24 horas.",
  },
  financeiro: {
    status: "available",
    description: "Plano, consumo e faturas são exemplos. Eles não representam cobranças reais da sua empresa.",
  },
  configuracoes: {
    status: "available",
    description: "Os dados cadastrais da empresa são reais e auditáveis. Preferências de recrutamento e lembretes são salvos por empresa.",
  },
  "minha-conta": {
    status: "available",
    description: "Nome, empresa, função e e-mail são reais. Você pode editar seu nome e solicitar alteração de senha; mudança de e-mail ainda não está disponível.",
  },
};


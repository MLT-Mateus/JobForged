import type { HomeData, HomeUser, Organization } from "./types";

export const mockOrganization: Organization = {
  id: "org_jobforged_demo",
  name: "Inside Forge Tecnologia",
  shortName: "Inside Forge",
  logo: "/brand/jobforged-symbol.svg",
  theme: {
    light: { mode: "light", primary: "#20b2aa", primaryStrong: "#087a76", primarySoft: "#dff5f2", secondary: "#4169e1", background: "#f5f9f8", surface: "#ffffff", surfaceSoft: "#eef6f5", text: "#142321", textMuted: "#637471", border: "#dce8e6" },
    dark: { mode: "dark", primary: "#43d0c6", primaryStrong: "#73e2da", primarySoft: "rgba(67,208,198,.14)", secondary: "#7e9cff", background: "#071412", surface: "#102522", surfaceSoft: "#0b1e1b", text: "#f2fbf9", textMuted: "#9eb4b0", border: "#2a3d3a" },
  },
};

export const mockUser: HomeUser = {
  id: "usr_mateus",
  name: "Mateus",
  role: "Titular da conta",
  avatarInitials: "MB",
  permissions: ["home.metrics.view", "home.activities.view", "home.onboarding.view", "home.onboarding.continue", "vacancies.create"],
};

export const mockHomeByOrganization: Record<string, HomeData> = {
  org_jobforged_demo: {
    organizationId: "org_jobforged_demo",
    summary: "Sua operação está ativa e recebeu novas candidaturas nas últimas horas.",
    banners: [
      { id: "bnr_week", eyebrow: "Resumo da semana", title: "Seu processo seletivo continua avançando", description: "12 candidatos mudaram de etapa e 4 entrevistas foram confirmadas desde segunda-feira.", link: { label: "Ver candidaturas", href: "/candidaturas" } },
      { id: "bnr_profile", eyebrow: "Personalização", title: "Deixe a experiência com a cara da sua empresa", description: "Revise as cores e os conteúdos exibidos no seu portal de carreiras.", link: { label: "Personalizar portal", href: "/personalizacao" } },
    ],
    metrics: [
      { id: "created", label: "Vagas criadas", value: 24, detail: "Desde o início", tone: "neutral" },
      { id: "open", label: "Vagas abertas", value: 8, detail: "2 encerram em breve", tone: "brand" },
      { id: "applications", label: "Total de candidaturas", value: 486, detail: "+32 nos últimos 7 dias", tone: "info" },
      { id: "new", label: "Novas candidaturas", value: 18, detail: "Desde ontem", tone: "positive" },
      { id: "interviews", label: "Entrevistas agendadas", value: 11, detail: "4 nesta semana", tone: "brand" },
      { id: "processes", label: "Processos em andamento", value: 6, detail: "Todos atualizados", tone: "positive" },
    ],
    activities: [
      { id: "act_1", kind: "application", description: "Nova candidatura para Analista de Customer Success", actor: "Sistema JobForged", occurredAt: "Há 12 minutos" },
      { id: "act_2", kind: "candidate-moved", description: "Mariana Costa avançou para Entrevista", actor: "Mateus Batista", occurredAt: "Há 38 minutos" },
      { id: "act_3", kind: "interview", description: "Entrevista com Lucas Ferreira foi agendada", actor: "Beatriz Souza", occurredAt: "Hoje, 14:30" },
      { id: "act_4", kind: "vacancy-published", description: "Vaga de Desenvolvedor de Projetos publicada", actor: "Mateus Batista", occurredAt: "Ontem, 16:12" },
      { id: "act_5", kind: "settings", description: "Dados da organização atualizados", actor: "Beatriz Souza", occurredAt: "Ontem, 10:05" },
    ],
    onboarding: {
      progress: 67,
      steps: [
        { id: "company", label: "Completar os dados da empresa", complete: true },
        { id: "brand", label: "Adicionar a identidade visual", complete: true },
        { id: "owner", label: "Confirmar dados do responsável", complete: true },
        { id: "admins", label: "Convidar administradores", complete: false },
        { id: "portal", label: "Configurar o portal de carreiras", complete: false },
        { id: "vacancy", label: "Criar a primeira vaga", complete: true },
      ],
    },
  },
};

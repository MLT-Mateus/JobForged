/** Presentation labels only; server roles and persisted values remain unchanged. */
const roles: Record<string,string> = { owner: "Titular", admin: "Administrador", member: "Membro" };
const plans: Record<string,string> = { free: "Gratuito", basic: "Básico", professional: "Profissional" };
const planStatuses: Record<string,string> = { free: "Gratuito", active: "Ativo", trial: "Período de avaliação", inactive: "Inativo", canceled: "Cancelado" };
const auditActions: Record<string,string> = { "company.created": "Empresa cadastrada", "company.updated": "Dados da empresa atualizados", "member.added": "Pessoa vinculada à equipe", "member.invited": "Convite enviado", "member.invitation_accepted": "Convite aceito", "member.updated": "Acesso da equipe atualizado", "member.profile_updated": "Perfil atualizado" };
export const roleLabel = (value: string | null | undefined) => roles[value ?? ""] ?? "Não informado";
export const planLabel = (value: string) => plans[value] ?? value;
export const planStatusLabel = (value: string) => planStatuses[value] ?? value;
export const auditLabel = (value: string) => auditActions[value] ?? "Atualização registrada";

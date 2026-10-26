export const systemPages = {
  401: { title: "Entre para continuar", description: "Esta página precisa de uma sessão ativa. Entre na sua conta para voltar ao que estava fazendo.", label: "Autenticação necessária" },
  403: { title: "Este acesso é restrito", description: "Sua conta não tem permissão para abrir esta página. Peça acesso ao responsável pela sua empresa ou entre com outra conta autorizada.", label: "Acesso negado" },
  404: { title: "Vamos reencontrar o caminho?", description: "O endereço pode ter mudado ou não existir. Busque uma página ou escolha um dos caminhos abaixo.", label: "Página não encontrada" },
  500: { title: "Algo saiu do esperado", description: "O problema está na plataforma. Tente novamente em instantes. Se continuar, fale com o suporte.", label: "Erro interno" },
  503: { title: "Uma pausa no caminho", description: "O serviço pode estar em manutenção ou temporariamente indisponível. Tente novamente em instantes ou consulte o atendimento.", label: "Serviço indisponível" },
} as const;
export type SystemPageCode = keyof typeof systemPages;
export const pageLinks = [
  { title: "Página inicial", href: "/", keywords: "inicio landing" },
  { title: "Vagas da JobForged", href: "/jobforged", keywords: "carreiras oportunidades" },
  { title: "Entrar na conta", href: "/login", keywords: "login acesso" },
  { title: "Cadastrar empresa", href: "/cadastro", keywords: "cadastro criar conta" },
  { title: "Perguntas frequentes", href: "/#faq", keywords: "ajuda suporte duvidas" },
];

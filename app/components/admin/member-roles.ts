/** The directory and account profile describe the same server roles. */
export const memberRoles = {
 owner: {label:'Titular',tone:'info',description:'Responsável pela empresa e pela gestão dos acessos. O vínculo de titular não pode ser alterado pela equipe.'},
 admin: {label:'Administrador',tone:'info',description:'Pode convidar pessoas e gerenciar os acessos da equipe. Não pode alterar o vínculo do titular.'},
 member: {label:'Membro',tone:'neutral',description:'Acesso de colaborador, sem gestão dos acessos da equipe.'},
} as const;

export const backofficeSections = [
 { id:'overview',path:'',label:'Visão geral' },{id:'companies',path:'/empresas',label:'Empresas'},
 {id:'users',path:'/usuarios',label:'Usuários e vínculos'},{id:'invitations',path:'/convites',label:'Convites'},
 {id:'settings',path:'/configuracoes',label:'Configurações'},{id:'audit',path:'/auditoria',label:'Auditoria'}
] as const;
export type BackofficeSection = typeof backofficeSections[number]['id'] | 'company';
export type RecordRow = {id:string;name?:string;company_name?:string;company_id?:string;user_id?:string;email?:string;full_name?:string;role?:string;status?:string;operational_status?:string;cnpj?:string;phone?:string;plan_id?:string;plan_status?:string;created_at?:string;expires_at?:string;accepted_at?:string;revoked_at?:string;action?:string;reason?:string;actor_user_id?:string;actor_email?:string;target_id?:string;details?:unknown;email_verified?:boolean};
export type PlatformSettings = {platform_name:string;support_email:string;support_url:string};
export const defaultPlatformSettings:PlatformSettings = {platform_name:'JobForged',support_email:'suporte@jobforged.com',support_url:'https://api.whatsapp.com/send/?phone=5561991630130'};
export const platformStatus:Record<string,string> = {active:'Ativo',inactive:'Inativo',suspended:'Suspensa',pending:'Pendente',expired:'Expirado',accepted:'Aceito',revoked:'Revogado'};
export const platformActions:Record<string,string> = {'platform.company.update':'Dados da empresa alterados','platform.company.status':'Situação da empresa alterada','platform.member.update':'Vínculo alterado','platform.invitation.create':'Convite criado','platform.invitation.resend':'Convite reenviado','platform.invitation.revoke':'Convite revogado','platform.settings.update':'Configurações alteradas'};

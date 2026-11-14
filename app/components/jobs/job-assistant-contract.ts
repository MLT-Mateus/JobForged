import type {Job} from './job-types';

export const assistantFields = {
 title:'Título da vaga',area:'Área',level:'Nível',contractType:'Contratação',modality:'Modalidade',
 country:'País',state:'Estado',city:'Cidade',summary:'Resumo',experience:'Experiência',weeklyHours:'Carga horária',
 schedule:'Horário',salaryMin:'Salário mínimo',salaryMax:'Salário máximo',currency:'Moeda',education:'Formação',
 additionalBenefits:'Outros benefícios',careerPlan:'Plano de carreira',teamDescription:'Time',reportsTo:'Liderança',
 teamSize:'Tamanho do time',methodology:'Metodologia',challenges:'Desafios',openingReason:'Motivo da abertura',
 autonomy:'Autonomia',hierarchy:'Hierarquia',applicationDeadline:'Prazo',responseSla:'Prazo de retorno',
 responsibilities:'Responsabilidades',requirements:'Requisitos',softSkills:'Competências',differentiators:'Diferenciais',
 certifications:'Certificações',benefits:'Benefícios',tools:'Ferramentas',interviewTypes:'Entrevistas',branchIds:'Filiais',
} as const;
export type AssistantPatch=Partial<Pick<Job,keyof typeof assistantFields>>;
const lists=new Set(['responsibilities','requirements','softSkills','differentiators','certifications','benefits','tools','interviewTypes','branchIds']);
export function validateAssistantPatch(value:unknown,branchIds:string[]):AssistantPatch {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Sugestão inválida.');
 const clean:Record<string,unknown>={};
 for(const [key,item] of Object.entries(value)){
  if(!Object.hasOwn(assistantFields,key))throw new Error('Campo não permitido.');
  if(lists.has(key)){
   if(!Array.isArray(item)||item.length>50||item.some(x=>typeof x!=='string'||!x.trim()||x.length>2000))throw new Error('Lista inválida.');
   if(key==='branchIds'&&item.some(id=>!branchIds.includes(id)))throw new Error('Filial indisponível.');
   clean[key]=Array.from(new Set(item));
  }else{
   if(typeof item!=='string'||item.length>(key==='summary'?500:key==='title'?180:6000))throw new Error('Texto inválido.');
   if(['salaryMin','salaryMax'].includes(key)&&item&&!/^\d+(\.\d{1,2})?$/.test(item))throw new Error('Salário inválido.');
   clean[key]=item;
  }
 }
 return clean as AssistantPatch;
}
export function assistantDraft(job:Partial<Job>):AssistantPatch {
 return Object.fromEntries(Object.keys(assistantFields).filter(key=>key in job).map(key=>[key,job[key as keyof Job]]));
}

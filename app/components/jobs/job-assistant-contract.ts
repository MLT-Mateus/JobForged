import type {Job} from './job-types';

export const assistantFields = {
 remoteScope:'Abrangência remota',positions:'Quantidade',noPrerequisites:'Sem experiência prévia',example:'Exemplo fictício',resumeRequired:'Exigir currículo',languages:'Idiomas',technicalTest:'Teste técnico',performanceReviews:'Avaliações periódicas',promotionPossible:'Possibilidade de promoção',salaryConfidential:'Remuneração confidencial',
 pcd:'Acessibilidade PCD',salaryRange:'Faixa salarial',journey:'Jornada',description:'Descrição da vaga',attributions:'Atribuições',contactEmail:'E-mail de contato',contactPhone:'Telefone de contato',contactWhatsapp:'WhatsApp',
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
  if(['noPrerequisites','example','resumeRequired','technicalTest','performanceReviews','promotionPossible','salaryConfidential'].includes(key)){
   if(typeof item!=='boolean')throw new Error(key+': use um booleano.');clean[key]=item;
  }else if(key==='positions'){
   if(!Number.isInteger(item)||Number(item)<1||Number(item)>99999)throw new Error('Quantidade inválida.');clean[key]=item;
  }else if(key==='languages'){
   if(!Array.isArray(item)||item.length>20||item.some(x=>!x||typeof x!=='object'||Object.keys(x).some(k=>!['language','level'].includes(k))||typeof x.language!=='string'||typeof x.level!=='string'||x.language.length>100||x.level.length>100))throw new Error('Idiomas inválidos.');clean[key]=item;
  }else if(lists.has(key)){
   if(!Array.isArray(item)||item.length>50||item.some(x=>typeof x!=='string'||!x.trim()||x.length>2000))throw new Error('Lista inválida.');
   if(key==='branchIds'&&item.some(id=>!branchIds.includes(id)))throw new Error('Filial indisponível.');
   clean[key]=Array.from(new Set(item));
  }else{
   if(typeof item!=='string'||item.length>(key==='summary'?500:key==='title'?120:['description','attributions'].includes(key)?5000:key==='remoteScope'?500:6000))throw new Error(key+': use texto dentro do limite.');
   if(['salaryMin','salaryMax'].includes(key)&&item&&!/^\d+(\.\d{1,2})?$/.test(item))throw new Error('Salário inválido.');
   clean[key]=item;
  }
 }
 return clean as AssistantPatch;
}
export function assistantDraft(job:Partial<Job>):AssistantPatch {
 return Object.fromEntries(Object.keys(assistantFields).filter(key=>key in job).map(key=>[key,job[key as keyof Job]]));
}

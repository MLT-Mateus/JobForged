import type {Job} from './job-types';
import {richTextPlain} from '../ui/rich-content';
export const jobSections=[
 {id:'vaga',label:'Vaga',title:'Defina a oportunidade',description:'Cargo, condições de trabalho e local.'},
 {id:'conteudo',label:'Conteúdo',title:'Conte o que a pessoa vai fazer',description:'Apresentação, atividades e requisitos. Os complementos são opcionais.'},
 {id:'revisao',label:'Revisão',title:'Revise antes de publicar',description:'Confira o anúncio e as condições para receber candidaturas.'},
] as const;
export function sectionIndex(value:string|null){return value==='sobre'?0:['atribuicoes','beneficios','perfil'].includes(value||'')?1:value==='processo'?2:Math.max(0,jobSections.findIndex(s=>s.id===value))}
export const jobOptions={
 areas:['Administrativo','Atendimento','Comercial','Financeiro','Gestão de Pessoas','Marketing','Operações','Tecnologia'],
 pcd:['Disponível para PCD','Exclusiva para PCD'],
 levels:['Júnior','Pleno','Sênior','Especialista','Coordenador','Gerente','Diretor'],
 salaries:['Salário a combinar','Abaixo de R$ 500',...Array.from({length:14},(_,i)=>`R$ ${(501+i*1000).toLocaleString('pt-BR')} - R$ ${(1500+i*1000).toLocaleString('pt-BR')}`),'Acima de R$ 14.501','Informar valores'],
 contracts:['Menor Aprendiz','Estágio','Temporário','Autônomo','Efetivo - CLT','Prestador de Serviço','Free Lancer','Trainee'],
 modes:['Presencial','Remoto','Híbrido'],
 journeys:['Horário definido','Escala','Flexível','A combinar','Matutino','Matutino e Vespertino','Vespertino','Vespertino e Noturno','Noturno','Noturno e Matutino'],
 education:['Ensino Médio','Técnico','Graduação','Pós-Graduação','MBA','Mestrado','Doutorado'],
 benefits:['Vale Transporte','Vale Alimentação','Vale Refeição','Plano de Saúde','Plano Odontológico','Seguro de Vida','Auxílio Home Office','Bônus','PLR','Day Off Aniversário','GymPass','Auxílio Creche','Auxílio Educação','Stock Option'],
 interviews:['Técnica','Comportamental','Cultural','Case Prático'],
};
export const selectOptions=(items:string[],current='')=>Array.from(new Set([...items,...(current?[current]:[])])).map(value=>({value,label:value}));
export const remoteJob=(job:Pick<Job,'modality'>)=>['Remoto','Home Office'].includes(job.modality);
export function normalizeJob<T extends Partial<Job>>(job:T):T {
 const next={...job};
 if(next.description!==undefined)next.summary=richTextPlain(next.description).trim().slice(0,500);
 if(next.attributions!==undefined)next.responsibilities=next.attributions.split(/<br\s*\/?>|\n|<\/li>/i).map(x=>richTextPlain(x).trim()).filter(Boolean).slice(0,50).map(x=>x.slice(0,2000));
 if(next.modality==='Home Office')next.modality='Remoto';
 if(next.schemaVersion===2)next.stages=[];
 return next;
}
export function editorChecks(job:Job){return [
 {section:0,key:'title',label:'Cargo',done:!!job.title.trim()&&job.title.trim().length<=120},
 {section:0,key:'area',label:'Área',done:!!job.area.trim()},
 {section:0,key:'contractType',label:'Contratação',done:!!job.contractType.trim()},
 {section:0,key:'modality',label:'Modalidade',done:['Presencial','Remoto','Home Office','Híbrido'].includes(job.modality)},
 {section:0,key:remoteJob(job)?'remoteScope':'branchIds',label:remoteJob(job)?'Abrangência do trabalho':'Local de trabalho',done:remoteJob(job)?!!job.remoteScope?.trim():!!job.branchIds?.length&&!!job.city.trim()&&!!job.state.trim()},
 {section:0,key:'journey',label:'Jornada',done:!!job.journey.trim()&&(!['Horário definido','Escala'].includes(job.journey)||!!job.schedule.trim())},
 {section:0,key:'positions',label:'Quantidade',done:Number.isInteger(job.positions??1)&&(job.positions??1)>0&&(job.positions??1)<=99999},
 {section:1,key:'description',label:'Apresentação',done:!!richTextPlain(job.description||job.summary).trim()},
 {section:1,key:'attributions',label:'Atividades',done:!!richTextPlain(job.attributions||job.responsibilities.join('\n')).trim()},
 {section:1,key:'requirements',label:'Requisitos',done:!!job.noPrerequisites||job.requirements.some(x=>!!x.trim())},
 ];}
export type PublicationIssue={key:string;section:number;message:string};
export function publicationIssues(job:Job):PublicationIssue[]{
 const issues:PublicationIssue[]=editorChecks(job).filter(c=>!c.done).map(c=>({key:c.key,section:c.section,message:'Confira '+c.label.toLowerCase()+'.'}));
 if(!job.lgpd)issues.push({key:'lgpd',section:2,message:'Confirme a revisão e a privacidade dos candidatos.'});
 if(job.example)issues.push({key:'example',section:2,message:'Exemplo fictício: revise os dados e converta em uma vaga real antes de publicar.'});
 if(job.portalReady===false)issues.push({key:'portal',section:2,message:'Publique a página da empresa em Personalização.'});
 if(job.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.contactEmail))issues.push({key:'contactEmail',section:1,message:'Corrija o e-mail de contato ou remova este complemento.'});
 for(const key of ['contactPhone','contactWhatsapp'] as const)if(job[key]&&!/^[0-9]{10,13}$/.test(job[key].replace(/\D/g,'')))issues.push({key,section:1,message:'Corrija o telefone com DDD ou remova este complemento.'});
 if([job.salaryMin,job.salaryMax].some(v=>v&&!/^\d+(\.\d{1,2})?$/.test(v))||job.salaryMin&&job.salaryMax&&Number(job.salaryMin)>Number(job.salaryMax))issues.push({key:'salaryRange',section:0,message:'Confira os valores e a ordem da faixa salarial.'});
 if(job.salaryRange==='Informar valores'&&!job.salaryConfidential&&!job.salaryMin)issues.push({key:'salaryRange',section:0,message:'Informe um valor ou escolha outra opção de remuneração.'});
 if(job.applicationDeadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(job.applicationDeadline)||Number.isNaN(Date.parse(job.applicationDeadline))||new Date(job.applicationDeadline).toISOString().slice(0,10)!==job.applicationDeadline))issues.push({key:'applicationDeadline',section:1,message:'Informe uma data válida ou remova o prazo.'});
 return issues;
}

/** Preserve process identities across reorder, rename and removal. */
export function reconcileStages(previous:Job['stages'],names:string[]):Job['stages']{
 const matched=names.map(name=>previous.find(stage=>stage.name===name));
 const used=new Set(matched.filter(Boolean).map(stage=>stage!.id));
 return names.map((name,index)=>{const stage=matched[index]||previous.find(stage=>!used.has(stage.id));const id=stage?.id||crypto.randomUUID();used.add(id);return {id,name,required:stage?.required??true}});
}

/** Describe the applied, normalized document, never a pending proposal. */
export function applicationFeedback(job:Job){
 const normalized=normalizeJob(job),missing=editorChecks(normalized).filter(c=>!c.done),operational=publicationIssues(normalized).filter(i=>!missing.some(c=>c.key===i.key));
 return ['Dados aplicados ao formulário. Salve para guardar.',missing.length?'Faltam '+missing.length+' informações essenciais: '+missing.map(c=>c.label.toLowerCase()).join(', ')+'.':'Os 10 dados essenciais estão preenchidos.',...operational.map(i=>i.message),!missing.length&&!operational.length?'Tudo pronto para revisar e publicar.':''].filter(Boolean).join('\n\n');
}

/** Rascunhos podem existir antes de receberem um título. */
export function jobDisplayTitle(title: string | undefined): string {
 return title?.trim() || "Vaga sem título";
}

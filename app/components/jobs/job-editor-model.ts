import type {Job} from './job-types';
export const jobSections=[
 {id:'sobre',label:'Sobre o Cargo',title:'Identificação da vaga',description:'Informações essenciais para o candidato entender onde e como vai trabalhar.'},
 {id:'atribuicoes',label:'Atribuições',title:'Funções da vaga',description:'Descreva as atividades do cotidiano e os atributos esperados para o cargo.'},
 {id:'beneficios',label:'Benefícios',title:'Benefícios e crescimento',description:'Apresente os benefícios e as possibilidades de desenvolvimento.'},
 {id:'perfil',label:'Perfil Esperado',title:'Perfil e diferenciais',description:'Defina a formação, as habilidades e os diferenciais recomendados.'},
 {id:'processo',label:'Processo',title:'Processo seletivo',description:'Deixe claras as etapas, os prazos e as formas de contato.'},
] as const;
export const jobOptions={
 areas:['Administrativo','Atendimento','Comercial','Financeiro','Gestão de Pessoas','Marketing','Operações','Tecnologia'],
 pcd:['Disponível para PCD','Exclusiva para PCD','Indisponível para PCD'],
 levels:['Júnior','Pleno','Sênior','Especialista','Coordenador','Gerente','Diretor'],
 salaries:['Salário a combinar','Abaixo de R$ 500',...Array.from({length:14},(_,i)=>`R$ ${(501+i*1000).toLocaleString('pt-BR')} - R$ ${(1500+i*1000).toLocaleString('pt-BR')}`),'Acima de R$ 14.501','Informar valores'],
 contracts:['Menor Aprendiz','Estágio','Temporário','Autônomo','Efetivo - CLT','Prestador de Serviço','Free Lancer','Trainee'],
 modes:['Presencial','Home Office','Híbrido'],
 journeys:['Matutino','Matutino e Vespertino','Vespertino','Vespertino e Noturno','Noturno','Noturno e Matutino'],
 education:['Ensino Médio','Técnico','Graduação','Pós-Graduação','MBA','Mestrado','Doutorado'],
 benefits:['Vale Transporte','Vale Alimentação','Vale Refeição','Plano de Saúde','Plano Odontológico','Seguro de Vida','Auxílio Home Office','Bônus','PLR','Day Off Aniversário','GymPass','Auxílio Creche','Auxílio Educação','Stock Option'],
 interviews:['Técnica','Comportamental','Cultural','Case Prático'],
};
export const selectOptions=(items:string[],current='')=>Array.from(new Set([...items,...(current?[current]:[])])).map(value=>({value,label:value}));
export function editorChecks(job:Job){return [
 {section:0,label:'Título da vaga',done:!!job.title.trim()},
 {section:0,label:'Acessibilidade para PCD',done:!!job.pcd},
 {section:0,label:'Setor do cargo',done:!!job.area.trim()},
 {section:0,label:'Nível mínimo',done:!!job.level},
 {section:0,label:'Faixa salarial',done:job.salaryRange==='Informar valores'?!!job.salaryMin:!!job.salaryRange||!!job.salaryMin},
 {section:0,label:'Modelo de contrato',done:!!job.contractType},
 {section:0,label:'Disposição do trabalho',done:!!job.modality},
 {section:0,label:'Jornada de trabalho',done:!!job.journey},
 {section:0,label:'Endereço da vaga',done:!!job.branchIds?.length&&!!job.city&&!!job.state},
 {section:1,label:'Descrição da vaga',done:!!job.summary.trim()},
 {section:1,label:'Atribuições do cargo',done:job.responsibilities.some(x=>!!x.trim())},
 {section:4,label:'Etapa do processo',done:job.stages.some(x=>!!x.name.trim())},
 {section:4,label:'Confirmação de privacidade',done:job.lgpd},
 ];}

/** Preserve process identities across reorder, rename and removal. */
export function reconcileStages(previous:Job['stages'],names:string[]):Job['stages']{
 const matched=names.map(name=>previous.find(stage=>stage.name===name));
 const used=new Set(matched.filter(Boolean).map(stage=>stage!.id));
 return names.map((name,index)=>{const stage=matched[index]||previous.find(stage=>!used.has(stage.id));const id=stage?.id||crypto.randomUUID();used.add(id);return {id,name,required:stage?.required??true}});
}
